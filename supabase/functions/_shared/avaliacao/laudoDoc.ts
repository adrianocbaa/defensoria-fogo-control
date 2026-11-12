// Documentos do laudo (PDF e DOCX) a partir de dados estruturados. Tabelas são sempre montadas pelo sistema
// (nunca digitadas). Graus vêm dos marcadores e da fundamentação estruturada, nunca do texto.
// As bibliotecas são injetadas para o mesmo código rodar no navegador (rascunho) e no servidor (emissão oficial).
import { CENTRO_LABEL, CRITERIO_STATUS_LABEL, TRANSFORM_LABEL, VALOR_ADM_LABEL } from './docLabels.ts';

export interface LaudoData {
  codigo: string;
  rascunho: boolean;
  /** Código de integridade da emissão (somente documentos oficiais). */
  hashEmissao?: string | null;
  tokens: Record<string, string | null>;
  secoes: { codigo: string; titulo: string; numerada: boolean; texto: string; blocos_sistema: string[] }[];
  coeficientes: { code: string; transform: string | null; beta: number; stdError: number; t: number; pValue: number }[];
  validacao: { numero: number; nome: string; status: string; grau: string | null; detalhe: string | null }[];
  fundamentacao: { itens: { item_number: number; titulo: string; grade_achieved: string | null; points: number; status: string }[]; total_points: number; grau: string | null } | null;
  centros: { centro: string; valor: number; limite_inferior: number; limite_superior: number; amplitude_pct: number; grau_precisao: string | null }[];
  amostras: { endereco: string; area: number | null; valor: number | null; unitario: number | null }[];
  compatibilidades: { tipo_valor: string; valor_comparado: number; diferenca_percentual: number }[];
  anexos: { numero: string; titulo: string }[];
}

export const fmtNum = (v: number | null | undefined, c = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
  : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));

export function resolveTokens(text: string, tokens: Record<string, string | null>) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => (tokens[k] ?? '—'));
}

// deno-lint-ignore no-explicit-any
export function snapAmostra(s: any) {
  const im = s.dados?.imovel ?? {}; const d = s.dados?.dado ?? {};
  return { endereco: [im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || im.tipo_imovel || 'Amostra', area: im.area_construida ?? null, valor: d.valor_utilizado ?? null, unitario: d.valor_unitario ?? null };
}

// deno-lint-ignore no-explicit-any
export function foundationFrom(f: any): LaudoData['fundamentacao'] {
  if (!f?.resumo) return null;
  return {
    // deno-lint-ignore no-explicit-any
    itens: (f.itens ?? []).map((i: any) => ({ item_number: i.item_number, titulo: i.titulo, grade_achieved: i.grade_achieved ?? null, points: Number(i.points ?? 0), status: i.status })),
    total_points: Number(f.resumo.total_points ?? 0), grau: f.resumo.grade_calculated ?? null,
  };
}

/** Dados do laudo emitido, montados só a partir do snapshot imutável da emissão. */
// deno-lint-ignore no-explicit-any
export function issuedLaudoData(snap: any, hash: string | null = null): LaudoData {
  const excl: string[] = snap.modelo?.amostras_excluidas ?? [];
  return {
    codigo: snap.codigo, rascunho: false, hashEmissao: hash, tokens: snap.tokens ?? {},
    // deno-lint-ignore no-explicit-any
    secoes: (snap.secoes ?? []).map((s: any) => ({ codigo: s.codigo, titulo: s.titulo, numerada: s.numerada, texto: s.texto ?? '', blocos_sistema: s.blocos_sistema ?? [] })),
    coeficientes: snap.execucao?.output?.fit?.coefficients ?? [],
    validacao: snap.validacao_snapshot?.resultados ?? [],
    fundamentacao: foundationFrom(snap.fundamentacao ?? snap.validacao_snapshot?.fundamentacao),
    centros: snap.resultado_snapshot?.centros ?? [],
    // deno-lint-ignore no-explicit-any
    amostras: (snap.amostras ?? []).filter((a: any) => a.dados?.habilitada_modelo !== false && !excl.includes(a.amostra_id)).map((a: any) => snapAmostra({ dados: a.dados })),
    compatibilidades: snap.resultado_snapshot?.compatibilidades ?? [],
    // deno-lint-ignore no-explicit-any
    anexos: (snap.anexos ?? []).map((a: any) => ({ numero: a.numero, titulo: a.titulo })),
  };
}

type Table = { title?: string; head: string[]; body: string[][] };

/** Tabelas de sistema de um bloco (mesma fonte para PDF e DOCX). */
export function systemTables(d: LaudoData, bloco: string): Table[] {
  const t = d.tokens;
  const s = (v: unknown) => String(v ?? '—');
  switch (bloco) {
    case 'TABELA_RESUMO': return [{ head: ['Item', 'Valor'], body: [
      ['Número', s(t.NUMERO_AVALIACAO)], ['Valor final adotado', s(t.VALOR_FINAL)], ['Origem do valor', s(t.ORIGEM_VALOR)],
      ['Grau de fundamentação', s(t.GRAU_FUNDAMENTACAO)], ['Grau de precisão', s(t.GRAU_PRECISAO)], ['Conclusão', s(t.CONCLUSAO)]] }];
    case 'TABELA_AVALIANDO': return [{ head: ['Item', 'Valor'], body: [['Endereço', s(t.ENDERECO_AVALIANDO)], ['Área construída', s(t.AREA_AVALIANDO)], ['Tipo', s(t.TIPO_IMOVEL)]] }];
    case 'TABELA_AMOSTRAS': return [{ head: ['#', 'Endereço', 'Área (m²)', 'Valor (R$)', 'R$/m²'], body: d.amostras.map((a, i) => [String(i + 1), a.endereco, fmtNum(a.area), fmtNum(a.valor), fmtNum(a.unitario)]) }];
    case 'TABELA_MODELO': return [{ head: ['Item', 'Valor'], body: [['Modelo aceito', s(t.MODELO_ACEITO)], ['Dados utilizados', s(t.N_AMOSTRAS)], ['R²', s(t.R2)], ['R² ajustado', s(t.R2_AJUSTADO)], ['Motor estatístico', s(t.ENGINE_VERSION)]] }];
    case 'TABELA_COEFICIENTES': return [{ head: ['Termo', 'Coeficiente', 'Erro padrão', 't', 'Significância'], body: d.coeficientes.map((c) => [
      c.code === '(intercepto)' ? 'Intercepto' : (TRANSFORM_LABEL[c.transform ?? 'DIRECT'] ?? 'x').replace('x', c.code), fmtNum(c.beta, 6), fmtNum(c.stdError, 6), fmtNum(c.t, 4), `${fmtNum(c.pValue * 100, 2)}%`]) }];
    case 'TABELA_VALIDACAO': {
      const out: Table[] = [{ head: ['#', 'Critério', 'Situação', 'Grau'], body: d.validacao.map((r) => [String(r.numero), r.nome, CRITERIO_STATUS_LABEL[r.status] ?? r.status, r.grau ?? '—']) }];
      if (d.fundamentacao) out.push({ title: `Grau de fundamentação: ${d.fundamentacao.grau ?? 'não enquadrado'} · ${d.fundamentacao.total_points} pontos`,
        head: ['Item', 'Descrição', 'Grau', 'Pontos'], body: d.fundamentacao.itens.map((i) => [String(i.item_number), i.titulo, i.grade_achieved ?? '—', String(i.points)]) });
      return out;
    }
    case 'TABELA_CENTROS': return [{ head: ['Tendência', 'Valor', 'Lim. inferior', 'Lim. superior', 'Amplitude', 'Precisão'], body: d.centros.map((c) => [
      CENTRO_LABEL[c.centro] ?? c.centro, fmtNum(c.valor), fmtNum(c.limite_inferior), fmtNum(c.limite_superior), `${fmtNum(c.amplitude_pct)}%`, c.grau_precisao ?? 'Não enquadrado']) }];
    case 'TABELA_COMPATIBILIDADE': return [{ head: ['Valor administrativo', 'Valor (R$)', 'Diferença'], body: d.compatibilidades.map((c) => [VALOR_ADM_LABEL[c.tipo_valor] ?? c.tipo_valor, fmtNum(c.valor_comparado), `${fmtNum(c.diferenca_percentual)}%`]) }];
    default: return [];
  }
}

const footerText = (d: LaudoData, p: number, total: number) =>
  `${d.codigo} — página ${p} de ${total}${d.hashEmissao ? ` — integridade ${d.hashEmissao.slice(0, 16)}` : ''}`;

// deno-lint-ignore no-explicit-any
export function buildLaudoPdf(d: LaudoData, deps: { jsPDF: any; autoTable: (doc: any, opts: any) => void }) {
  const doc = new deps.jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 20;
  let y = 25;
  const ensure = (h: number) => { if (y + h > 275) { doc.addPage(); y = 25; } };
  const para = (t: string, size = 10.5) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    for (const line of doc.splitTextToSize(t, W - 2 * M)) { ensure(6); doc.text(line, M, y); y += 5.2; }
    y += 2;
  };
  const table = (tb: Table) => {
    if (tb.title) { ensure(8); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(tb.title, M, y); y += 4; }
    deps.autoTable(doc, { startY: y, head: [tb.head], body: tb.body, margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: { fillColor: [60, 60, 60] } });
    y = doc.lastAutoTable.finalY + 6;
  };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('LAUDO DE AVALIAÇÃO', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(11); doc.text(d.codigo, W / 2, y, { align: 'center' }); y += 10;
  let num = 0;
  for (const s of d.secoes) {
    ensure(14);
    if (s.numerada) num += 1;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`${s.numerada ? `${num}. ` : ''}${s.titulo}`, M, y); y += 7;
    if (s.texto.trim()) para(s.texto);
    for (const b of s.blocos_sistema ?? []) for (const tb of systemTables(d, b)) table(tb);
  }
  if (d.anexos.length) {
    ensure(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Anexos', M, y); y += 7;
    para(d.anexos.map((a) => `Anexo ${a.numero} — ${a.titulo}`).join('\n'));
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(d.codigo, M, 12);
    doc.text(footerText(d, p, pages), W / 2, 290, { align: 'center' });
    if (d.rascunho) {
      doc.setFontSize(38); doc.setTextColor(200);
      doc.text('RASCUNHO — NÃO EMITIDO', W / 2, 160, { align: 'center', angle: 35 });
    }
    doc.setTextColor(0);
  }
  return doc;
}

/** Documento Word editável e estruturado (estilos de título, tabelas, cabeçalho, rodapé com numeração). */
// deno-lint-ignore no-explicit-any
export function buildLaudoDocx(d: LaudoData, x: any) {
  const { Document, Paragraph, TextRun, Table: DTable, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel, Header, Footer, PageNumber } = x;
  const CONTENT = 9026; // A4 com margens de 1"
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text: string, w: number, head = false) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: head ? { fill: '3C3C3C', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: head, color: head ? 'FFFFFF' : undefined, size: 18 })] })],
  });
  const table = (tb: Table) => {
    const n = tb.head.length;
    const widths = Array.from({ length: n }, (_, i) => (i === n - 1 ? CONTENT - Math.floor(CONTENT / n) * (n - 1) : Math.floor(CONTENT / n)));
    const out: unknown[] = [];
    if (tb.title) out.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: tb.title, bold: true, size: 19 })] }));
    out.push(new DTable({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: widths,
      rows: [new TableRow({ tableHeader: true, children: tb.head.map((h, i) => cell(h, widths[i], true)) }),
        ...tb.body.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i])) }))] }));
    out.push(new Paragraph({ children: [] }));
    return out;
  };
  const children: unknown[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LAUDO DE AVALIAÇÃO', bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: d.codigo, bold: true, size: 22 })] }),
  ];
  if (d.rascunho) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RASCUNHO — NÃO EMITIDO', bold: true, color: 'C00000', size: 28 })] }));
  let num = 0;
  for (const s of d.secoes) {
    if (s.numerada) num += 1;
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${s.numerada ? `${num}. ` : ''}${s.titulo}`)] }));
    for (const p of s.texto.split(/\n+/).filter((l) => l.trim())) children.push(new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun(p)] }));
    for (const b of s.blocos_sistema ?? []) for (const tb of systemTables(d, b)) children.push(...table(tb));
  }
  if (d.anexos.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Anexos')] }));
    for (const a of d.anexos) children.push(new Paragraph({ children: [new TextRun(`Anexo ${a.numero} — ${a.titulo}`)] }));
  }
  return new Document({
    creator: 'SiDIF', title: `Laudo ${d.codigo}`,
    styles: {
      default: { document: { run: { font: 'Arial', size: 21 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: 'Arial' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
        { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: 'Arial' }, paragraph: { spacing: { after: 120 } } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: d.codigo, size: 16, color: '777777' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: `${d.codigo} — página `, size: 16, color: '777777' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '777777' }),
        new TextRun({ text: ' de ', size: 16, color: '777777' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '777777' }),
        ...(d.hashEmissao ? [new TextRun({ text: ` — integridade ${d.hashEmissao.slice(0, 16)}`, size: 16, color: '777777' })] : []),
        ...(d.rascunho ? [new TextRun({ text: ' — RASCUNHO — NÃO EMITIDO', size: 16, color: 'C00000', bold: true })] : []),
      ] })] }) },
      children,
    }],
  });
}
