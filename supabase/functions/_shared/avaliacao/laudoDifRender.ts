// Renderizadores do documento intermediário do laudo DIF: DOCX (saída principal editável) e PDF, ambos a partir dos
// mesmos blocos. Bibliotecas injetadas (jsPDF/autoTable/docx) para rodar no navegador e no servidor.
import type { Block, Cell, DocModel, Img, Run } from './laudoDif.ts';

// ================================================================= PDF
const PW = 210, PH = 297, ML = 30, MR = 20, MT = 38, MB = 22, CW = PW - ML - MR;
const PT = 0.3528; // mm por ponto
/** As fontes padrão do PDF só cobrem Latin-1/cp1252: troca os poucos símbolos fora dele. */
export const pdfSafe = (s: string) => s.replace(/−/g, '-').replace(/√/g, 'raiz ').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[\u200b\u00ad]/g, '');
const rgb = (hex?: string): [number, number, number] | undefined => (hex ? [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)] : undefined);
const fontStyle = (r: Run) => (r.b && r.i ? 'bolditalic' : r.b ? 'bold' : r.i ? 'italic' : 'normal');

// deno-lint-ignore no-explicit-any
type Pdf = any;
interface Piece { t: string; style: string; w: number }
interface Group { parts: Piece[]; w: number }

/** Quebra de linhas com estilos mistos (negrito/itálico) — permite justificar como no Word. */
function wrapRuns(doc: Pdf, runs: Run[], size: number, width: number): { groups: Group[]; sum: number }[] {
  const groups: Group[] = []; let cur: Piece[] = [];
  const flush = () => { if (cur.length) { groups.push({ parts: cur, w: cur.reduce((s, p) => s + p.w, 0) }); cur = []; } };
  doc.setFontSize(size);
  for (const r of runs) {
    const style = fontStyle(r); doc.setFont('helvetica', style);
    for (const p of pdfSafe(r.t).split(/(\s+)/)) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { flush(); continue; }
      cur.push({ t: p, style, w: doc.getTextWidth(p) });
    }
  }
  flush();
  doc.setFont('helvetica', 'normal'); const space = doc.getTextWidth(' ');
  const lines: { groups: Group[]; sum: number }[] = []; let line: Group[] = []; let lw = 0;
  for (const g of groups) {
    if (line.length && lw + space + g.w > width) { lines.push({ groups: line, sum: line.reduce((s, x) => s + x.w, 0) }); line = []; lw = 0; }
    lw += (line.length ? space : 0) + g.w; line.push(g);
  }
  if (line.length) lines.push({ groups: line, sum: line.reduce((s, x) => s + x.w, 0) });
  return lines;
}

function drawGroup(doc: Pdf, g: Group, x: number, y: number, size: number) {
  let px = x; for (const w of g.parts) { doc.setFont('helvetica', w.style); doc.setFontSize(size); doc.text(w.t, px, y); px += w.w; }
}

export function renderDifPdf(m: DocModel, deps: { jsPDF: Pdf; autoTable: (doc: Pdf, opts: Pdf) => void }): Pdf {
  const doc = new deps.jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: pdfSafe(m.titulo), creator: 'SiDIF' });
  let y = MT; const limit = PH - MB;
  const ensure = (h: number) => { if (y + h > limit) { doc.addPage(); y = MT; } };
  const para = (runs: Run[], o: { size?: number; align?: string; after?: number; before?: number; indent?: boolean; width?: number; x?: number } = {}) => {
    const size = o.size ?? 11; const lh = size * PT * 1.35; const ind = o.indent ? 8 : 0;
    const width = (o.width ?? CW) - ind; const x0 = (o.x ?? ML) + ind;
    y += o.before ?? 0;
    const lines = wrapRuns(doc, runs, size, width);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); const space = doc.getTextWidth(' ');
    lines.forEach((ln, i) => {
      ensure(lh);
      const base = y + size * PT * 0.85;
      const last = i === lines.length - 1;
      const total = ln.sum + space * (ln.groups.length - 1);
      if ((o.align ?? 'justify') === 'justify' && !last && ln.groups.length > 1) {
        const gap = (width - ln.sum) / (ln.groups.length - 1); let px = x0;
        for (const g of ln.groups) { drawGroup(doc, g, px, base, size); px += g.w + gap; }
      } else {
        let px = o.align === 'center' ? x0 + (width - total) / 2 : o.align === 'right' ? x0 + width - total : x0;
        for (const g of ln.groups) { drawGroup(doc, g, px, base, size); px += g.w + space; }
      }
      y += lh;
    });
    y += o.after ?? 2.5;
  };
  const cellAT = (c: Cell, size: number) => {
    const imgH = c.img ? Math.min(60, ((c.imgW ?? 0.3) * CW * c.img.altura) / c.img.largura) : 0;
    return { content: c.img ? '' : pdfSafe(c.text ?? (c.runs ?? []).map((r) => r.t).join('')), colSpan: c.colSpan ?? 1, _img: c.img ?? null, _imgW: c.imgW ?? 0.3,
      styles: { fillColor: rgb(c.fill), fontStyle: c.bold ? 'bold' : 'normal', halign: c.align ?? 'left', fontSize: size, ...(c.img ? { minCellHeight: imgH + 3 } : {}) } };
  };
  const caption = (t: string, size: number, bold: boolean, x: number, w: number) => para([{ t, b: bold }], { size, align: 'center', after: 0.6, x, width: w });

  const figDims = (b: Extract<Block, { k: 'figure' }>) => {
    const n = b.items.length;
    return b.items.map((it) => {
      let w = Math.min(it.w, n > 1 ? 0.48 : 1) * CW; let h = (w * it.img.altura) / it.img.largura;
      const maxH = n > 1 ? 105 : limit - MT - 24;
      if (h > maxH) { h = maxH; w = (h * it.img.largura) / it.img.altura; }
      return { w, h };
    });
  };
  const lookAhead = (i: number) => { const nb = m.blocks[i + 1]; return nb?.k === 'figure' ? Math.max(...figDims(nb).map((d) => d.h)) + 22 : 30; };
  for (let bi = 0; bi < m.blocks.length; bi++) {
    const b = m.blocks[bi];
    switch (b.k) {
      case 'heading': {
        ensure(Math.max(18, Math.min(lookAhead(bi), 60)));
        para([{ t: b.texto, b: true, i: b.nivel >= 3 }], { size: 11, align: 'left', before: b.nivel === 1 ? 4 : 2.5, after: 2 });
        break;
      }
      case 'para': if (b.keepNext) ensure(lookAhead(bi)); para(b.runs, { size: b.size, align: b.align, after: b.after, before: b.before, indent: b.indent }); break;
      case 'equation': ensure(14); para([{ t: b.texto, i: true }], { size: 10.5, align: 'center', before: 2, after: 4 }); break;
      case 'spacer': y += b.mm; if (y > limit) { doc.addPage(); y = MT; } break;
      case 'pagebreak': doc.addPage(); y = MT; break;
      case 'table': {
        const size = b.size ?? 9;
        ensure(b.legenda ? 22 : 16);
        if (b.legenda) { caption(b.legenda, 9, true, ML, CW); y += 0.8; }
        deps.autoTable(doc, {
          startY: y, margin: { left: ML, right: MR, top: MT, bottom: MB }, tableWidth: CW, theme: 'grid',
          styles: { font: 'helvetica', fontSize: size, cellPadding: 1.3, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], valign: 'middle', overflow: 'linebreak' },
          headStyles: { fillColor: [217, 217, 217], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
          columnStyles: Object.fromEntries(b.widths.map((w, i) => [i, { cellWidth: w * CW }])),
          head: b.head ? [b.head.map((c) => cellAT(c, size))] : undefined,
          body: b.rows.map((r) => r.map((c) => cellAT(c, size))),
          // deno-lint-ignore no-explicit-any
          didDrawCell: (d: any) => {
            const raw = d.cell.raw; if (!raw?._img) return;
            const im: Img = raw._img; let w = raw._imgW * CW; let h = (w * im.altura) / im.largura;
            if (h > d.cell.height - 2) { h = d.cell.height - 2; w = (h * im.largura) / im.altura; }
            doc.addImage(im.data, im.tipo === 'png' ? 'PNG' : 'JPEG', d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h);
          },
        });
        y = doc.lastAutoTable.finalY + 1;
        if (b.fonte) caption(b.fonte, 8.5, false, ML, CW);
        y += 3;
        break;
      }
      case 'figure': {
        const gap = 6; const n = b.items.length;
        const dims = figDims(b);
        const rowH = Math.max(...dims.map((d) => d.h));
        ensure(rowH + 14);
        const totalW = dims.reduce((s, d) => s + d.w, 0) + gap * (n - 1);
        let x = ML + (CW - totalW) / 2; const top = y; let bottom = y;
        b.items.forEach((it, i) => {
          const d = dims[i];
          doc.addImage(it.img.data, it.img.tipo === 'png' ? 'PNG' : 'JPEG', x, top + (rowH - d.h), d.w, d.h);
          y = top + rowH + 1.5;
          const cw = n > 1 ? d.w : CW; const cx = n > 1 ? x : ML;
          if (it.legenda) caption(it.legenda, 9, true, cx, cw);
          if (it.fonte) caption(it.fonte, 8.5, false, cx, cw);
          bottom = Math.max(bottom, y); x += d.w + gap;
        });
        y = bottom + 3;
        break;
      }
      case 'signature': {
        ensure(45);
        para([{ t: b.localData }], { align: 'center', after: 16 });
        doc.setLineWidth(0.3); doc.line(PW / 2 - 40, y, PW / 2 + 40, y); y += 2;
        para([{ t: b.nome, b: true }], { align: 'center', after: 0.5 });
        for (const l of b.linhas) para([{ t: l }], { align: 'center', after: 0.5 });
        break;
      }
    }
  }
  // cabeçalho/rodapé institucionais em todas as páginas; capa = página 0 (sem número)
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (m.header.logo) { const w = 62; const h = (w * m.header.logo.altura) / m.header.logo.largura; doc.addImage(m.header.logo.data, 'PNG', (PW - w) / 2, 8, w, h); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    m.header.linhas.forEach((l, i) => doc.text(pdfSafe(l), PW / 2, 29 + i * 4, { align: 'center' }));
    const ly = 31 + (m.header.linhas.length - 1) * 4;
    doc.setLineWidth(0.4); doc.setDrawColor(0, 0, 0); doc.line(ML, ly, PW - MR, ly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    if (p > 1) doc.text(String(p - 1), PW - MR, PH - 10, { align: 'right' });
    doc.setFontSize(7); doc.setTextColor(110, 110, 110);
    if (m.rascunho) doc.text('Rascunho — não emitido', ML, PH - 10);
    else if (m.hash) doc.text(`Código de integridade: ${m.hash.slice(0, 16)}…`, ML, PH - 10);
    doc.setTextColor(0, 0, 0);
    if (m.rascunho) {
      const gs = doc.GState ? new doc.GState({ opacity: 0.12 }) : null;
      if (gs) { doc.saveGraphicsState(); doc.setGState(gs); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(46); doc.setTextColor(150, 0, 0);
      const wm = 'RASCUNHO — NÃO EMITIDO'; const tw = doc.getTextWidth(wm); const ang = (35 * Math.PI) / 180;
      doc.text(wm, PW / 2 - (Math.cos(ang) * tw) / 2, PH / 2 + (Math.sin(ang) * tw) / 2, { angle: 35 });
      if (gs) doc.restoreGraphicsState();
      doc.setTextColor(0, 0, 0);
    }
  }
  return doc;
}

// ================================================================= DOCX
const DXA_CW = 11906 - 1701 - 1134; // largura útil (A4, margens 3 cm / 2 cm)
const MM = 56.7; // twips por mm
const PX = (dxa: number) => Math.round(dxa / 15); // 96 dpi

// deno-lint-ignore no-explicit-any
export function renderDifDocx(m: DocModel, x: any) {
  const { Document, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel,
    Header, Footer, PageNumber, PageBreak, VerticalAlign } = x;
  const AL: Record<string, unknown> = { justify: AlignmentType.JUSTIFIED, center: AlignmentType.CENTER, left: AlignmentType.LEFT, right: AlignmentType.RIGHT };
  const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: line, bottom: line, left: line, right: line };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const image = (im: Img, wDxa: number, maxHDxa = 13000) => {
    let w = wDxa; let h = (w * im.altura) / im.largura;
    if (h > maxHDxa) { h = maxHDxa; w = (h * im.largura) / im.altura; }
    return new ImageRun({ type: im.tipo, data: im.data, transformation: { width: PX(w), height: PX(h) }, altText: { title: 'Imagem', description: 'Imagem do laudo', name: 'imagem' } });
  };
  const runs = (rs: Run[], size?: number) => rs.map((r) => new TextRun({ text: r.t, bold: r.b, italics: r.i, size: size ? Math.round(size * 2) : undefined }));
  const P = (rs: Run[], o: { align?: string; size?: number; after?: number; before?: number; indent?: boolean; keepNext?: boolean } = {}) => new Paragraph({
    alignment: AL[o.align ?? 'justify'], keepNext: o.keepNext, indent: o.indent ? { left: 454 } : undefined,
    spacing: { after: Math.round((o.after ?? 2.5) * MM), before: Math.round((o.before ?? 0) * MM), line: 276 }, children: runs(rs, o.size),
  });
  const cellParas = (c: Cell, wDxa: number, size: number) => {
    if (c.img) return [new Paragraph({ alignment: AlignmentType.CENTER, children: [image(c.img, Math.min(wDxa - 200, (c.imgW ?? 0.3) * DXA_CW), 3400)] })];
    const text = c.text ?? (c.runs ?? []).map((r) => r.t).join('');
    return text.split('\n').map((t) => new Paragraph({ alignment: AL[c.align ?? 'left'], spacing: { after: 0, line: 240 }, children: [new TextRun({ text: t, bold: c.bold, size: Math.round(size * 2) })] }));
  };
  const table = (b: Extract<Block, { k: 'table' }>) => {
    const size = b.size ?? 9;
    const cols = b.widths.map((w) => Math.round(w * DXA_CW));
    const fix = DXA_CW - cols.reduce((s, c) => s + c, 0); cols[cols.length - 1] += fix;
    const mk = (cells: Cell[], head: boolean) => {
      let ci = 0;
      return new TableRow({ tableHeader: head, cantSplit: true, children: cells.map((c) => {
        const span = c.colSpan ?? 1; const w = cols.slice(ci, ci + span).reduce((s, v) => s + v, 0); ci += span;
        return new TableCell({ columnSpan: span > 1 ? span : undefined, width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
          shading: c.fill ? { fill: c.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 }, children: cellParas(c, w, size) });
      }) });
    };
    return new Table({ width: { size: DXA_CW, type: WidthType.DXA }, columnWidths: cols, rows: [...(b.head ? [mk(b.head, true)] : []), ...b.rows.map((r) => mk(r, false))] });
  };
  const capt = (t: string, bold: boolean, keepNext = false) => P([{ t, b: bold }], { align: 'center', size: bold ? 9 : 8.5, after: bold ? 0.6 : 1.5, keepNext });

  // deno-lint-ignore no-explicit-any
  const children: any[] = [];
  for (const b of m.blocks) {
    switch (b.k) {
      case 'heading': {
        const lvl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][Math.min(2, Math.max(0, b.nivel - 1))];
        children.push(new Paragraph({ heading: lvl, keepNext: true, spacing: { before: Math.round((b.nivel === 1 ? 4 : 2.5) * MM), after: Math.round(2 * MM) }, children: [new TextRun({ text: b.texto })] }));
        break;
      }
      case 'para': children.push(P(b.runs, { align: b.align, size: b.size, after: b.after, before: b.before, indent: b.indent, keepNext: b.keepNext })); break;
      case 'equation': children.push(P([{ t: b.texto, i: true }], { align: 'center', size: 10.5, before: 2, after: 4 })); break;
      case 'spacer': children.push(new Paragraph({ spacing: { before: Math.round(b.mm * MM), after: 0 }, children: [] })); break;
      case 'pagebreak': children.push(new Paragraph({ children: [new PageBreak()] })); break;
      case 'table':
        if (b.legenda) children.push(capt(b.legenda, true, true));
        children.push(table(b));
        children.push(b.fonte ? capt(b.fonte, false) : new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'figure': {
        if (b.items.length === 1) {
          const it = b.items[0];
          children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 60 }, children: [image(it.img, it.w * DXA_CW)] }));
          if (it.legenda) children.push(capt(it.legenda, true, !!it.fonte));
          if (it.fonte) children.push(capt(it.fonte, false));
        } else {
          const w = Math.round(DXA_CW / b.items.length);
          children.push(new Table({ width: { size: DXA_CW, type: WidthType.DXA }, columnWidths: b.items.map(() => w), borders: noBorders,
            rows: [new TableRow({ cantSplit: true, children: b.items.map((it) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: noBorders, verticalAlign: VerticalAlign.BOTTOM, children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [image(it.img, Math.min(it.w * DXA_CW, w - 200), 6000)] }),
              ...(it.legenda ? [capt(it.legenda, true)] : []), ...(it.fonte ? [capt(it.fonte, false)] : [])] })) })] }));
          children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        }
        break;
      }
      case 'signature':
        children.push(P([{ t: b.localData }], { align: 'center', after: 16, keepNext: true }));
        children.push(P([{ t: '______________________________________' }], { align: 'center', after: 0.5, keepNext: true }));
        children.push(P([{ t: b.nome, b: true }], { align: 'center', after: 0.5, keepNext: b.linhas.length > 0 }));
        b.linhas.forEach((l, i) => children.push(P([{ t: l }], { align: 'center', after: 0.5, keepNext: i < b.linhas.length - 1 })));
        break;
    }
  }
  const header = () => new Header({ children: [
    ...(m.header.logo ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new ImageRun({ type: 'png', data: m.header.logo.data,
      transformation: { width: 234, height: Math.round((234 * m.header.logo.altura) / m.header.logo.largura) }, altText: { title: 'Logotipo', description: 'Logotipo institucional', name: 'logo' } })] })] : []),
    ...m.header.linhas.map((l, i) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      border: i === m.header.linhas.length - 1 ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 2 } } : undefined,
      children: [new TextRun({ text: l, bold: true, size: 18 })] })),
    ...(m.rascunho ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'RASCUNHO — NÃO EMITIDO', bold: true, size: 16, color: 'C00000' })] })] : []),
  ] });
  const marca = m.rascunho ? 'Rascunho — não emitido' : m.hash ? `Código de integridade: ${m.hash.slice(0, 16)}…` : '';
  const footer = (numero: boolean) => new Footer({ children: [
    ...(numero ? [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] : []),
    ...(marca ? [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0 }, children: [new TextRun({ text: marca, size: 14, color: '6E6E6E' })] })] : []),
  ] });
  const heading = (size: number, italics = false) => ({ run: { font: 'Arial', size, bold: true, italics, color: '000000' }, paragraph: { spacing: { before: 120, after: 120 } } });
  return new Document({
    creator: 'SiDIF', title: m.titulo,
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(22), paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(22), paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(22, true), paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 2 } },
      ],
    },
    sections: [{
      properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 2155, right: 1134, bottom: 1134, left: 1701, header: 454, footer: 454 }, pageNumbers: { start: 0 } } },
      headers: { default: header(), first: header() }, footers: { default: footer(true), first: footer(false) },
      children,
    }],
  });
}
