// Gráficos do relatório estatístico (Anexo III) rasterizados em PNG por código puro: o mesmo arquivo de imagem entra
// no DOCX e no PDF, no navegador (rascunho) e no servidor (emissão). Não recalcula nada: só desenha pontos recebidos.
import { CHART_FONT } from './chartFont.ts';
import { b64ToBytes, type Deflate, encodePng, zlibDeflate } from './png.ts';

type RGB = [number, number, number];
export interface ChartPoint { x: number; y: number }
export interface ChartSeries { points: ChartPoint[]; kind: 'scatter' | 'line'; color?: RGB; radius?: number }
export interface ChartRefLine { kind: 'diagonal' | 'horizontal'; value?: number; color?: RGB; dashed?: boolean }
export interface ChartSpec {
  title?: string; xLabel: string; yLabel: string; series: ChartSeries[]; refLines?: ChartRefLine[];
  width?: number; height?: number; xTicks?: number[]; highlight?: ChartPoint | null;
}
export interface ChartImage { data: Uint8Array; tipo: 'png'; largura: number; altura: number }

const glyphCache = new Map<string, { adv: number; w: number; a: Uint8Array }>();
function glyph(ch: string) {
  let g = glyphCache.get(ch);
  if (g) return g;
  const src = CHART_FONT.g[ch] ?? CHART_FONT.g['?'];
  const packed = b64ToBytes(src[2]);
  const n = src[1] * CHART_FONT.h; const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const b = packed[i >> 1]; a[i] = ((i & 1) ? b & 15 : b >> 4) * 17; }
  g = { adv: src[0], w: src[1], a }; glyphCache.set(ch, g);
  return g;
}

export class Raster {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.px = new Uint8Array(w * h * 3).fill(255); }
  blend(x: number, y: number, c: RGB, a: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 3; const k = Math.min(1, a);
    this.px[i] = this.px[i] * (1 - k) + c[0] * k; this.px[i + 1] = this.px[i + 1] * (1 - k) + c[1] * k; this.px[i + 2] = this.px[i + 2] * (1 - k) + c[2] * k;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = Math.max(0, Math.round(y)); j < Math.min(this.h, Math.round(y + h)); j++)
      for (let i = Math.max(0, Math.round(x)); i < Math.min(this.w, Math.round(x + w)); i++) this.blend(i, j, c, 1);
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let j = Math.floor(cy - r - 1); j <= Math.ceil(cy + r + 1); j++)
      for (let i = Math.floor(cx - r - 1); i <= Math.ceil(cx + r + 1); i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        this.blend(i, j, c, Math.max(0, Math.min(1, r + 0.5 - d)));
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, width = 2, dashed = false) {
    const len = Math.hypot(x1 - x0, y1 - y0); const steps = Math.max(1, Math.ceil(len / 0.75));
    for (let s = 0; s <= steps; s++) {
      if (dashed && Math.floor((s * len) / steps / 12) % 2 === 1) continue;
      const t = s / steps; this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, c);
    }
  }
  textWidth(t: string) { let w = 0; for (const ch of t) w += glyph(ch).adv; return w; }
  /** Texto com a linha de base em y; align relativo a x; rotate = vertical (de baixo para cima). */
  text(t: string, x: number, y: number, o: { align?: 'left' | 'center' | 'right'; color?: RGB; rotate?: boolean } = {}) {
    const c = o.color ?? [30, 30, 30]; const tw = this.textWidth(t);
    let pen = o.align === 'center' ? -tw / 2 : o.align === 'right' ? -tw : 0;
    const top = -CHART_FONT.asc;
    for (const ch of t) {
      const g = glyph(ch);
      for (let gy = 0; gy < CHART_FONT.h; gy++) for (let gx = 0; gx < g.w; gx++) {
        const a = g.a[gy * g.w + gx]; if (!a) continue;
        const dx = pen + gx - 1; const dy = top + gy;
        if (o.rotate) this.blend(Math.round(x + dy), Math.round(y - dx), c, a / 255);
        else this.blend(Math.round(x + dx), Math.round(y + dy), c, a / 255);
      }
      pen += g.adv;
    }
  }
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const step0 = (max - min) / count; const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) out.push(Math.round(t / step) * step);
  return out;
}
export const fmtAxis = (v: number) => {
  const a = Math.abs(v); const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
};

const fit = (t: string, max: number, r: Raster) => { let s = t; while (s.length > 4 && r.textWidth(s) > max) s = s.slice(0, -2); return s === t ? t : `${s.trimEnd()}…`; };

/** Desenha o gráfico e devolve o PNG. Dimensões padrão 1600 × 1000 px (≈ 16 × 10 cm a 254 dpi). */
export async function chartPng(spec: ChartSpec, deflate: Deflate = zlibDeflate): Promise<ChartImage> {
  const W = spec.width ?? 1600, H = spec.height ?? 1000;
  const r = new Raster(W, H);
  const L = 170, R = W - 40, T = spec.title ? 80 : 40, B = H - 130;
  const pts = spec.series.flatMap((s) => s.points).concat(spec.highlight ? [spec.highlight] : []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  let x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
  let y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
  for (const l of spec.refLines ?? []) if (l.kind === 'horizontal' && l.value !== undefined) { y0 = Math.min(y0, l.value); y1 = Math.max(y1, l.value); }
  if (spec.refLines?.some((l) => l.kind === 'diagonal')) { const lo = Math.min(x0, y0), hi = Math.max(x1, y1); x0 = y0 = lo; x1 = y1 = hi; }
  if (!pts.length) { x0 = 0; x1 = 1; y0 = 0; y1 = 1; }
  if (x0 === x1) { x0 -= Math.abs(x0) * 0.05 || 1; x1 += Math.abs(x1) * 0.05 || 1; }
  if (y0 === y1) { y0 -= Math.abs(y0) * 0.05 || 1; y1 += Math.abs(y1) * 0.05 || 1; }
  const px0 = (x1 - x0) * 0.05, py0 = (y1 - y0) * 0.07; x0 -= px0; x1 += px0; y0 -= py0; y1 += py0;
  const sx = (v: number) => L + ((v - x0) / (x1 - x0)) * (R - L);
  const sy = (v: number) => B - ((v - y0) / (y1 - y0)) * (B - T);
  if (spec.title) r.text(fit(spec.title, W - 40, r), W / 2, 50, { align: 'center' });
  const grid: RGB = [228, 228, 228];
  for (const t of niceTicks(y0, y1, 7)) { r.line(L, sy(t), R, sy(t), grid, 2); r.text(fmtAxis(t), L - 12, sy(t) + 10, { align: 'right', color: [70, 70, 70] }); }
  for (const t of spec.xTicks ?? niceTicks(x0, x1, 7)) { if (t < x0 || t > x1) continue; r.line(sx(t), T, sx(t), B, grid, 2); r.text(fmtAxis(t), sx(t), B + 40, { align: 'center', color: [70, 70, 70] }); }
  const axis: RGB = [90, 90, 90];
  r.line(L, T, L, B, axis, 2); r.line(L, B, R, B, axis, 2); r.line(R, T, R, B, axis, 2); r.line(L, T, R, T, axis, 2);
  for (const l of spec.refLines ?? []) {
    const c = l.color ?? [190, 60, 40];
    if (l.kind === 'diagonal') r.line(sx(Math.max(x0, y0)), sy(Math.max(x0, y0)), sx(Math.min(x1, y1)), sy(Math.min(x1, y1)), c, 3, l.dashed);
    else if (l.value !== undefined) r.line(L, sy(l.value), R, sy(l.value), c, 3, l.dashed);
  }
  for (const s of spec.series) {
    const c = s.color ?? [30, 64, 120];
    const ps = s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (s.kind === 'line') for (let i = 1; i < ps.length; i++) r.line(sx(ps[i - 1].x), sy(ps[i - 1].y), sx(ps[i].x), sy(ps[i].y), c, 5);
    else for (const p of ps) r.disc(sx(p.x), sy(p.y), s.radius ?? 9, c);
  }
  if (spec.highlight && Number.isFinite(spec.highlight.y)) r.disc(sx(spec.highlight.x), sy(spec.highlight.y), 12, [200, 90, 20]);
  r.text(fit(spec.xLabel, R - L, r), (L + R) / 2, H - 30, { align: 'center' });
  r.text(fit(spec.yLabel, B - T, r), 50, (T + B) / 2, { align: 'center', rotate: true });
  return { data: await encodePng(r.px, W, H, deflate), tipo: 'png', largura: W, altura: H };
}
