// Geração do PDF do laudo a partir de dados estruturados. Tabelas são sempre montadas pelo sistema
// (nunca digitadas). Rascunho recebe marca d'água "RASCUNHO — NÃO EMITIDO".
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CENTRO_LABEL, CRITERIO_STATUS_LABEL, TRANSFORM_LABEL, VALOR_ADM_LABEL } from './labels';

export interface LaudoData {
  codigo: string;
  rascunho: boolean;
  tokens: Record<string, string | null>;
  secoes: { codigo: string; titulo: string; numerada: boolean; texto: string; blocos_sistema: string[] }[];
  coeficientes: { code: string; transform: string | null; beta: number; stdError: number; t: number; pValue: number }[];
  validacao: { numero: number; nome: string; status: string; grau: string | null; detalhe: string | null }[];
  centros: { centro: string; valor: number; limite_inferior: number; limite_superior: number; amplitude_pct: number; grau_precisao: string | null }[];
  amostras: { endereco: string; area: number | null; valor: number | null; unitario: number | null }[];
  compatibilidades: { tipo_valor: string; valor_comparado: number; diferenca_percentual: number }[];
  anexos: { numero: string; titulo: string }[];
}

const n = (v: number | null | undefined, c = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
  : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));

export function resolveTokens(text: string, tokens: Record<string, string | null>) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => (tokens[k] ?? '—'));
}

export function buildLaudoPdf(d: LaudoData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 20;
  let y = 25;
  const ensure = (h: number) => { if (y + h > 275) { doc.addPage(); y = 25; } };
  const para = (t: string, size = 10.5) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    for (const line of doc.splitTextToSize(t, W - 2 * M)) { ensure(6); doc.text(line, M, y); y += 5.2; }
    y += 2;
  };
  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, { startY: y, head: [head], body: body.map((r) => r.map(String)), margin: { left: M, right: M }, styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: { fillColor: [60, 60, 60] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  };
  const tabelas: Record<string, () => void> = {
    TABELA_RESUMO: () => table(['Item', 'Valor'], [
      ['Número', d.tokens.NUMERO_AVALIACAO ?? '—'], ['Valor final adotado', d.tokens.VALOR_FINAL ?? '—'], ['Origem do valor', d.tokens.ORIGEM_VALOR ?? '—'],
      ['Grau de fundamentação', d.tokens.GRAU_FUNDAMENTACAO ?? '—'], ['Grau de precisão', d.tokens.GRAU_PRECISAO ?? '—'], ['Conclusão', d.tokens.CONCLUSAO ?? '—'],
    ]),
    TABELA_AVALIANDO: () => table(['Item', 'Valor'], [['Endereço', d.tokens.ENDERECO_AVALIANDO ?? '—'], ['Área construída', d.tokens.AREA_AVALIANDO ?? '—'], ['Tipo', d.tokens.TIPO_IMOVEL ?? '—']]),
    TABELA_AMOSTRAS: () => table(['#', 'Endereço', 'Área (m²)', 'Valor (R$)', 'R$/m²'], d.amostras.map((a, i) => [i + 1, a.endereco, n(a.area), n(a.valor), n(a.unitario)])),
    TABELA_MODELO: () => table(['Item', 'Valor'], [['Modelo aceito', d.tokens.MODELO_ACEITO ?? '—'], ['Dados utilizados', d.tokens.N_AMOSTRAS ?? '—'], ['R²', d.tokens.R2 ?? '—'], ['R² ajustado', d.tokens.R2_AJUSTADO ?? '—'], ['Motor estatístico', d.tokens.ENGINE_VERSION ?? '—']]),
    TABELA_COEFICIENTES: () => table(['Termo', 'Coeficiente', 'Erro padrão', 't', 'Significância'], d.coeficientes.map((c) => [
      c.code === '(intercepto)' ? 'Intercepto' : (TRANSFORM_LABEL[c.transform ?? 'DIRECT'] ?? 'x').replace('x', c.code), n(c.beta, 6), n(c.stdError, 6), n(c.t, 4), `${n(c.pValue * 100, 2)}%`])),
    TABELA_VALIDACAO: () => table(['#', 'Critério', 'Situação', 'Grau'], d.validacao.map((r) => [r.numero, r.nome, CRITERIO_STATUS_LABEL[r.status] ?? r.status, r.grau ?? '—'])),
    TABELA_CENTROS: () => table(['Tendência', 'Valor', 'Lim. inferior', 'Lim. superior', 'Amplitude', 'Precisão'], d.centros.map((c) => [
      CENTRO_LABEL[c.centro] ?? c.centro, n(c.valor), n(c.limite_inferior), n(c.limite_superior), `${n(c.amplitude_pct)}%`, c.grau_precisao ?? 'Não enquadrado'])),
    TABELA_COMPATIBILIDADE: () => table(['Valor administrativo', 'Valor (R$)', 'Diferença'], d.compatibilidades.map((c) => [VALOR_ADM_LABEL[c.tipo_valor] ?? c.tipo_valor, n(c.valor_comparado), `${n(c.diferenca_percentual)}%`])),
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
    for (const b of s.blocos_sistema ?? []) tabelas[b]?.();
  }
  if (d.anexos.length) {
    ensure(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Anexos', M, y); y += 7;
    para(d.anexos.map((a) => `Anexo ${a.numero} — ${a.titulo}`).join('\n'));
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`${d.codigo} — página ${p} de ${pages}`, W / 2, 290, { align: 'center' });
    if (d.rascunho) {
      doc.setFontSize(38); doc.setTextColor(200);
      doc.text('RASCUNHO — NÃO EMITIDO', W / 2, 160, { align: 'center', angle: 35 });
    }
    doc.setTextColor(0);
  }
  return doc;
}
