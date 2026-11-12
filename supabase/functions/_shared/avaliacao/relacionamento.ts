// Relacionamento das variáveis (critério 1) — curvas "valor estimado × variável" no ponto médio, equivalentes aos
// "gráficos de elasticidade da função no ponto médio" do SisDEA. Módulo puro (tela, testes e documentos).
// NÃO recalcula a regressão: usa os coeficientes já estimados e o conjunto efetivamente usado no modelo.
import { applyTransform, inverseTransform, transformDomainOk, type TransformCode } from './engine.ts';

export type Tendencia = 'CRESCENTE' | 'DECRESCENTE' | 'CONSTANTE' | 'NAO_MONOTONICO' | 'INDISPONIVEL';
export type Coerencia = 'COERENTE' | 'INCOERENTE' | 'REQUER_ANALISE' | 'SEM_REFERENCIA';
export type RelacaoEsperada = 'POSITIVA' | 'NEGATIVA' | 'INDEFINIDA';

export interface RelCoefficient { code: string; beta: number; transform?: TransformCode | null }
export interface RelVariableInput { code: string; transform: TransformCode; power?: number; values: number[] }
export interface RelacionamentoInput {
  /** Coeficientes do motor (intercepto = '(intercepto)' ou o primeiro). */
  coefficients: RelCoefficient[];
  dependent: { transform: TransformCode; power?: number };
  /** Variáveis independentes com os valores ORIGINAIS das amostras usadas no modelo. */
  independents: RelVariableInput[];
}
export interface RelVariableMeta {
  relacao_esperada?: RelacaoEsperada | string | null;
  tipo?: string | null;
  /** Força (true) ou impede (false) o tratamento discreto. */
  discreta?: boolean | null;
}
export interface CurvePoint { x: number; y: number }
export interface RelationshipCurve {
  code: string; transform: TransformCode; power?: number; beta: number;
  /** Amplitude e média observadas no modelo (escala original). */
  min: number; max: number; mean: number;
  /** Valores (escala original) em que as demais variáveis foram fixadas. */
  fixed: Record<string, number>;
  discrete: boolean;
  points: CurvePoint[];
  /** Ponto médio: a própria variável e as demais na média. */
  meanPoint: CurvePoint | null;
  /** Elasticidade no ponto médio: variação % do valor estimado para +1% na variável. */
  elasticity: number | null;
  trend: Tendencia;
  expected: RelacaoEsperada;
  coherence: Coerencia;
  synthesis: string;
}

const CATEGORICAS = ['DICOTOMICA', 'PROXY', 'CODIGO_ALOCADO'];
const MAX_INTEIROS = 20;
export const CONTINUOUS_POINTS = 61;

const meanOf = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const normExpected = (r: unknown): RelacaoEsperada => (r === 'POSITIVA' || r === 'NEGATIVA' ? r : 'INDEFINIDA');

/** Valor estimado na escala original para um vetor de valores originais (ou null fora do domínio). */
export function predictOriginal(input: RelacionamentoInput, x: Record<string, number>): number | null {
  const coefs = input.coefficients;
  const icpt = coefs.find((c) => c.code === '(intercepto)') ?? coefs[0];
  let z = Number(icpt?.beta ?? 0);
  for (const v of input.independents) {
    const c = coefs.find((k) => k !== icpt && k.code === v.code);
    const xv = x[v.code];
    if (!c || !transformDomainOk(v.transform, xv, v.power)) return null;
    z += Number(c.beta) * applyTransform(v.transform, xv, v.power);
  }
  const y = inverseTransform(input.dependent.transform, z, input.dependent.power);
  return Number.isFinite(y) ? y : null;
}

/** Discreta: tipo categórico, ou todos inteiros com amplitude pequena (ex.: banheiros 1–3). */
export function isDiscrete(values: number[], meta: RelVariableMeta = {}): boolean {
  if (meta.discreta === true) return true;
  if (meta.discreta === false) return false;
  if (meta.tipo && CATEGORICAS.includes(meta.tipo)) return true;
  if (!values.length || !values.every((x) => Number.isInteger(x))) return false;
  return Math.max(...values) - Math.min(...values) <= MAX_INTEIROS;
}

/** Pontos do eixo X dentro da amplitude observada (sem extrapolar). */
export function domainPoints(values: number[], discrete: boolean, tipo?: string | null, n = CONTINUOUS_POINTS): number[] {
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return [min];
  if (discrete) {
    const allInt = values.every((x) => Number.isInteger(x));
    if (allInt && !(tipo && CATEGORICAS.includes(tipo)) && max - min <= MAX_INTEIROS) {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    return [...new Set(values)].sort((a, b) => a - b);
  }
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? max : min + ((max - min) * i) / (n - 1)));
}

export function classifyTrend(points: CurvePoint[]): Tendencia {
  if (points.length < 2) return 'INDISPONIVEL';
  const scale = Math.max(...points.map((p) => Math.abs(p.y)), 1e-300);
  const tol = 1e-9 * scale;
  let up = false, down = false;
  for (let i = 1; i < points.length; i++) {
    const d = points[i].y - points[i - 1].y;
    if (d > tol) up = true; else if (d < -tol) down = true;
  }
  if (up && down) return 'NAO_MONOTONICO';
  if (up) return 'CRESCENTE';
  if (down) return 'DECRESCENTE';
  return 'CONSTANTE';
}

export function coherenceOf(trend: Tendencia, expected: RelacaoEsperada): Coerencia {
  if (trend === 'NAO_MONOTONICO' || trend === 'CONSTANTE' || trend === 'INDISPONIVEL') return 'REQUER_ANALISE';
  if (expected === 'INDEFINIDA') return 'SEM_REFERENCIA';
  return (trend === 'CRESCENTE') === (expected === 'POSITIVA') ? 'COERENTE' : 'INCOERENTE';
}

const TREND_TXT: Record<Tendencia, string> = {
  CRESCENTE: 'Comportamento crescente', DECRESCENTE: 'Comportamento decrescente', CONSTANTE: 'Sem variação do valor estimado',
  NAO_MONOTONICO: 'Comportamento não monotônico', INDISPONIVEL: 'Curva indisponível no intervalo observado',
};
const REL_TXT: Record<RelacaoEsperada, string> = { POSITIVA: 'positiva', NEGATIVA: 'negativa', INDEFINIDA: 'indefinida' };

export function synthesisText(trend: Tendencia, expected: RelacaoEsperada): string {
  const c = coherenceOf(trend, expected);
  if (trend === 'NAO_MONOTONICO') return 'Comportamento não monotônico / requer análise';
  if (c === 'REQUER_ANALISE') return `${TREND_TXT[trend]} — requer análise`;
  if (c === 'SEM_REFERENCIA') return `${TREND_TXT[trend]} — relação esperada não definida`;
  if (c === 'COERENTE') return `${TREND_TXT[trend]} — coerente com relação esperada ${REL_TXT[expected]}`;
  return `${TREND_TXT[trend]} — contrário à relação esperada ${REL_TXT[expected]}`;
}

/**
 * Uma curva por variável independente: varia só X_j no intervalo observado, fixa as demais na média (escala original),
 * aplica a transformação do modelo e devolve o valor estimado na escala original da dependente.
 */
export function relationshipCurves(input: RelacionamentoInput, meta: Record<string, RelVariableMeta> = {}): RelationshipCurve[] {
  const means: Record<string, number> = {};
  for (const v of input.independents) means[v.code] = meanOf(v.values);
  const coefs = input.coefficients;
  const icpt = coefs.find((c) => c.code === '(intercepto)') ?? coefs[0];
  return input.independents.map((v) => {
    const m = meta[v.code] ?? {};
    const fixed: Record<string, number> = {};
    for (const o of input.independents) if (o.code !== v.code) fixed[o.code] = means[o.code];
    const discrete = isDiscrete(v.values, m);
    const xs = domainPoints(v.values, discrete, m.tipo);
    const points: CurvePoint[] = [];
    for (const x of xs) {
      const y = predictOriginal(input, { ...fixed, [v.code]: x });
      if (y !== null) points.push({ x, y });
    }
    const mean = means[v.code];
    const ym = predictOriginal(input, { ...fixed, [v.code]: mean });
    const meanPoint = ym === null ? null : { x: mean, y: ym };
    let elasticity: number | null = null;
    if (meanPoint && mean !== 0) {
      const h = Math.abs(mean) * 1e-6;
      const a = predictOriginal(input, { ...fixed, [v.code]: mean - h });
      const b = predictOriginal(input, { ...fixed, [v.code]: mean + h });
      if (a !== null && b !== null && ym) elasticity = ((b - a) / (2 * h)) * (mean / ym);
    }
    const trend = classifyTrend(points);
    const expected = normExpected(m.relacao_esperada);
    return {
      code: v.code, transform: v.transform, power: v.power, beta: Number(coefs.find((k) => k !== icpt && k.code === v.code)?.beta ?? NaN),
      min: Math.min(...v.values), max: Math.max(...v.values), mean, fixed, discrete, points, meanPoint, elasticity,
      trend, expected, coherence: coherenceOf(trend, expected), synthesis: synthesisText(trend, expected),
    };
  });
}

/** Rótulos padronizados dos gráficos (tela e documentos). */
export function chartLabels(v: { nome: string; unidade?: string | null }, dep: { unidade?: string | null }) {
  return {
    titulo: `Estimativa por ${v.nome}`,
    eixoX: v.unidade ? `${v.nome} (${v.unidade})` : v.nome,
    eixoY: dep.unidade ? `Valor estimado (${dep.unidade})` : 'Valor estimado',
  };
}

// ----------------------------------------------------------------------------
// Desenho em PDF (jsPDF), pronto para a seção de gráficos do laudo. Somente primitivas vetoriais.
// ----------------------------------------------------------------------------
export interface PdfLike {
  setDrawColor(...a: number[]): unknown; setFillColor(...a: number[]): unknown; setTextColor(...a: number[]): unknown;
  setLineWidth(w: number): unknown; setFontSize(s: number): unknown; setFont(f: string, s?: string): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown; rect(x: number, y: number, w: number, h: number, s?: string): unknown;
  circle(x: number, y: number, r: number, s?: string): unknown;
  text(t: string | string[], x: number, y: number, o?: Record<string, unknown>): unknown;
  splitTextToSize(t: string, w: number): string[];
  getTextWidth(t: string): number;
}
export interface PdfChart { curve: RelationshipCurve; titulo: string; eixoX: string; eixoY: string }

const fmtAxis = (v: number) => {
  const a = Math.abs(v);
  const d = a >= 1000 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
};
function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const step0 = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) out.push(Math.round(t / step) * step);
  return out;
}

/** Desenha um gráfico em (x, y, w, h) em mm. */
export function drawRelationshipChartPdf(doc: PdfLike, c: PdfChart, x: number, y: number, w: number, h: number): void {
  const pts = c.curve.points;
  doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(c.titulo, x + w / 2, y + 4, { align: 'center' });
  const L = x + 14, R = x + w - 3, T = y + 8, B = y + h - 18;
  doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.2); doc.rect(L, T, R - L, B - T);
  if (pts.length === 0) { doc.setFont('helvetica', 'normal'); doc.text('Curva indisponível', (L + R) / 2, (T + B) / 2, { align: 'center' }); return; }
  const ys = pts.map((p) => p.y).concat(c.curve.meanPoint ? [c.curve.meanPoint.y] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= Math.abs(y0) * 0.05 || 1; y1 += Math.abs(y1) * 0.05 || 1; }
  const pad = (y1 - y0) * 0.06; y0 -= pad; y1 += pad;
  const x0 = c.curve.min, x1 = c.curve.max === c.curve.min ? c.curve.min + 1 : c.curve.max;
  const px = (v: number) => L + ((v - x0) / (x1 - x0)) * (R - L);
  const py = (v: number) => B - ((v - y0) / (y1 - y0)) * (B - T);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(70, 70, 70);
  doc.setDrawColor(225, 225, 225);
  for (const t of niceTicks(y0, y1)) { doc.line(L, py(t), R, py(t)); doc.text(fmtAxis(t), L - 1, py(t) + 1, { align: 'right' }); }
  const xt = c.curve.discrete && pts.length <= 12 ? pts.map((p) => p.x) : niceTicks(x0, x1);
  for (const t of xt) doc.text(fmtAxis(t), px(t), B + 3.5, { align: 'center' });
  doc.setDrawColor(30, 64, 120); doc.setLineWidth(0.5);
  for (let i = 1; i < pts.length; i++) doc.line(px(pts[i - 1].x), py(pts[i - 1].y), px(pts[i].x), py(pts[i].y));
  if (c.curve.discrete) { doc.setFillColor(30, 64, 120); for (const p of pts) doc.circle(px(p.x), py(p.y), 0.7, 'F'); }
  if (c.curve.meanPoint) { doc.setFillColor(200, 90, 20); doc.circle(px(c.curve.meanPoint.x), py(c.curve.meanPoint.y), 0.9, 'F'); }
  doc.setTextColor(20, 20, 20); doc.setFontSize(7);
  doc.text(c.eixoX, (L + R) / 2, B + 8, { align: 'center' });
  doc.text(c.eixoY, x + 2.5, (T + B) / 2 + doc.getTextWidth(c.eixoY) / 2, { angle: 90 });
  doc.setFontSize(6.5); doc.setTextColor(60, 60, 60);
  doc.text(doc.splitTextToSize(c.curve.synthesis, w - 4), x + w / 2, B + 12, { align: 'center' });
}

/** Grade de gráficos (2 por linha) a partir de yTop; devolve o y final. `newPage` é chamado quando falta espaço. */
export function drawRelationshipChartsPdf(doc: PdfLike, charts: PdfChart[], o: { left: number; top: number; width: number; pageBottom: number; chartHeight?: number; newPage: () => number }): number {
  const cols = 2, gap = 6, h = o.chartHeight ?? 78, w = (o.width - gap) / cols;
  let y = o.top;
  for (let i = 0; i < charts.length; i += cols) {
    if (y + h > o.pageBottom) y = o.newPage();
    charts.slice(i, i + cols).forEach((c, j) => drawRelationshipChartPdf(doc, c, o.left + j * (w + gap), y, w, h));
    y += h + 4;
  }
  return y;
}
