import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Kit de layout padrão dos relatórios do SiDIF.
 * Baseado no "Relatório de atendimento de chamado" (faixa verde institucional,
 * títulos de seção com barra, cartões de identificação e rodapé com régua).
 */

export const GREEN: [number, number, number] = [26, 95, 63];
export const GREEN_SOFT: [number, number, number] = [232, 243, 237];
export const GRAY_TEXT: [number, number, number] = [70, 70, 70];
export const GRAY_LABEL: [number, number, number] = [120, 130, 125];
export const GRAY_LINE: [number, number, number] = [222, 229, 225];
export const BOX_BG: [number, number, number] = [248, 251, 249];

export const MARGIN = 48;

interface Options {
  /** Título do documento exibido na faixa verde. */
  titulo: string;
  /** Linha institucional secundária (setor/coordenação). */
  subtitulo?: string;
  /** Identificador exibido à direita da faixa (ex.: "Nº 0007"). */
  numero?: string;
}

export interface SidifDoc {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  contentW: number;
  get y(): number;
  set y(v: number);
  ensure: (needed: number) => void;
  gap: (v?: number) => void;
  text: (t: string, size?: number, bold?: boolean, indent?: number) => void;
  section: (title: string) => void;
  boxText: (t: string) => void;
  badge: (label: string, x: number, cy: number) => number;
  infoCard: (rows: [string, string, boolean?][][]) => void;
  table: (options: Record<string, unknown>) => void;
  assinaturas: (pessoas: { nome: string; funcao?: string; orgao?: string }[]) => void;
  finalizar: () => void;
}

export function criarDocumentoSidif({ titulo, subtitulo, numero }: Options): SidifDoc {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const headerH = 74;
  const footerY = pageH - 34;
  const bottomLimit = footerY - 16;
  let y = 0;

  const drawHeader = () => {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', MARGIN, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(subtitulo ?? 'Diretoria de Infraestrutura Física — SiDIF', MARGIN, 46);
    doc.setFontSize(8.5);
    doc.text(`${titulo} — SiDIF`, MARGIN, 60);
    if (numero) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(numero, pageW - MARGIN, 40, { align: 'right' });
    }
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont('helvetica', 'normal');
  };

  const drawFooter = (page: number, total: number) => {
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, footerY - 8, pageW - MARGIN, footerY - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Gerado automaticamente pelo SiDIF em ${new Date().toLocaleString('pt-BR')}`,
      MARGIN,
      footerY + 2,
    );
    doc.text(`Página ${page} de ${total}`, pageW - MARGIN, footerY + 2, { align: 'right' });
    doc.setTextColor(...GRAY_TEXT);
  };

  const newPage = () => {
    doc.addPage();
    drawHeader();
    y = headerH + 26;
  };

  const ensure = (needed: number) => {
    if (y + needed > bottomLimit) newPage();
  };

  const gap = (v = 6) => {
    y += v;
  };

  const text = (t: string, size = 9.5, bold = false, indent = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...GRAY_TEXT);
    const lines = doc.splitTextToSize(t, contentW - indent);
    for (const l of lines) {
      ensure(size * 1.35);
      doc.text(l, MARGIN + indent, y + size * 0.9);
      y += size * 1.35;
    }
  };

  const section = (title: string) => {
    ensure(40);
    gap(14);
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN, y, 3.5, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text(title.toUpperCase(), MARGIN + 10, y + 10);
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y + 19, pageW - MARGIN, y + 19);
    doc.setTextColor(...GRAY_TEXT);
    y += 30;
  };

  const boxText = (t: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(t, contentW - 28);
    const h = lines.length * 13 + 20;
    ensure(h);
    doc.setFillColor(...BOX_BG);
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, y, contentW, h, 'FD');
    doc.setTextColor(...GRAY_TEXT);
    lines.forEach((l: string, i: number) => doc.text(l, MARGIN + 14, y + 20 + i * 13));
    y += h + 4;
  };

  const badge = (label: string, x: number, cy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const w = doc.getTextWidth(label.toUpperCase()) + 14;
    doc.setFillColor(...GREEN_SOFT);
    doc.roundedRect(x, cy - 8, w, 14, 7, 7, 'F');
    doc.setTextColor(...GREEN);
    doc.text(label.toUpperCase(), x + 7, cy + 1.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont('helvetica', 'normal');
    return w;
  };

  const infoCard = (rows: [string, string, boolean?][][]) => {
    const rowH = 30;
    const h = rows.length * rowH;
    ensure(h + 8);
    const top = y;
    doc.setFillColor(...BOX_BG);
    doc.setDrawColor(...GRAY_LINE);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, top, contentW, h, 'FD');
    const half = contentW / 2;
    rows.forEach((pair, ri) => {
      const ry = top + ri * rowH;
      if (ri > 0) doc.line(MARGIN, ry, pageW - MARGIN, ry);
      const cellW = pair.length === 1 ? contentW : half;
      pair.forEach(([k, v, isBadge], ci) => {
        const x = MARGIN + ci * cellW + 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_LABEL);
        doc.text(k, x, ry + rowH / 2 + 3);
        const vx = x + 88;
        if (isBadge) {
          badge(v, vx, ry + rowH / 2 + 1);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(50, 50, 50);
          const lines = doc.splitTextToSize(v || '-', cellW - 104);
          doc.text(lines[0] ?? '-', vx, ry + rowH / 2 + 3.5);
        }
      });
      if (pair.length > 1) {
        doc.setDrawColor(...GRAY_LINE);
        doc.line(MARGIN + half, ry + 7, MARGIN + half, ry + rowH - 7);
      }
    });
    doc.setTextColor(...GRAY_TEXT);
    y = top + h + 4;
  };

  /** autoTable com o estilo institucional aplicado. */
  const table = (options: Record<string, unknown>) => {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      rowPageBreak: 'avoid',
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: GRAY_LINE, textColor: GRAY_TEXT },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: BOX_BG },
      margin: { left: MARGIN, right: MARGIN, top: headerH + 26, bottom: pageH - bottomLimit },
      didDrawPage: () => {
        drawHeader();
      },
      ...options,
    } as never);
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };

  const assinaturas = (pessoas: { nome: string; funcao?: string; orgao?: string }[]) => {
    if (!pessoas.length) return;
    const colW = (contentW - 24) / 2;
    let col = 0;
    ensure(70);
    let linhaY = y + 30;
    pessoas.forEach((p, i) => {
      if (i > 0 && i % 2 === 0) {
        linhaY += 56;
        if (linhaY > bottomLimit) {
          newPage();
          linhaY = y + 30;
        }
        col = 0;
      }
      const x = MARGIN + col * (colW + 24);
      doc.setDrawColor(150);
      doc.setLineWidth(0.6);
      doc.line(x, linhaY, x + colW, linhaY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(p.nome || '-', x + colW / 2, linhaY + 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_LABEL);
      if (p.funcao) doc.text(p.funcao, x + colW / 2, linhaY + 23, { align: 'center' });
      if (p.orgao) doc.text(p.orgao, x + colW / 2, linhaY + 33, { align: 'center' });
      doc.setTextColor(...GRAY_TEXT);
      col = col === 0 ? 1 : 0;
    });
    y = linhaY + 44;
  };

  const finalizar = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      drawFooter(i, total);
    }
    doc.setPage(total);
  };

  drawHeader();
  y = headerH + 30;

  return {
    doc,
    pageW,
    pageH,
    contentW,
    get y() {
      return y;
    },
    set y(v: number) {
      y = v;
    },
    ensure,
    gap,
    text,
    section,
    boxText,
    badge,
    infoCard,
    table,
    assinaturas,
    finalizar,
  };
}
