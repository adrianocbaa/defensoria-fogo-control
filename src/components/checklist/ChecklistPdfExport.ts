import jsPDF from 'jspdf';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';
import type { ChecklistOcorrencia } from '@/hooks/useChecklistOcorrencias';
import type { ShapeData } from '@/components/checklist/PdfCanvas';

// ─── helpers ────────────────────────────────────────────────────────────────

const COL = {
  margin: 14,
  pageW: 210,
  pageH: 297,
  contentW: 182, // 210 - 2×14
};

// Cor primária da Defensoria (verde)
const PRIMARY: [number, number, number] = [21, 128, 61];   // green-700
const PRIMARY_LIGHT: [number, number, number] = [240, 253, 244]; // green-50

function statusLabel(s: string) {
  if (s === 'aprovado') return 'APROVADO';
  if (s === 'reprovado') return 'REPROVADO';
  return 'PENDENTE';
}

function statusColor(s: string): { r: number; g: number; b: number } {
  if (s === 'aprovado') return { r: 22, g: 163, b: 74 };
  if (s === 'reprovado') return { r: 220, g: 38, b: 38 };
  return { r: 202, g: 138, b: 4 };
}

function gravidadeLabel(g: string | null | undefined): string {
  if (g === 'critico') return '🔴 Crítico';
  if (g === 'estetico') return '🟢 Estético';
  return '🟡 Médio';
}

function gravidadeColor(g: string | null | undefined): [number, number, number] {
  if (g === 'critico') return [220, 38, 38];
  if (g === 'estetico') return [59, 130, 246];
  return [202, 138, 4];
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Render the PDF page as a base64 image via pdf.js */
async function renderPdfPageToBase64(pdfUrl: string, pageNum: number, targetWidthPx = 1200): Promise<string | null> {
  try {
    const lib = (window as any).pdfjsLib;
    if (!lib) return null;
    const pdfDoc = await lib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
    const page = await pdfDoc.getPage(pageNum);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = targetWidthPx / vp0.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

// ─── main export ────────────────────────────────────────────────────────────

export interface ChecklistReportMeta {
  obraId: string;
  nomeObra: string;
  municipio: string;
  empresa: string;
  nContrato?: string | null;
  fiscal?: string;
  dataRelatorio: string; // ISO or formatted string
  pdfNomeArquivo: string;
  pdfUrl?: string; // URL of the PDF to render as map
  totalPaginasPdf?: number;
  prazoCorrecao?: number | null; // Prazo geral para correção do relatório
}

export async function exportChecklistPdf(
  meta: ChecklistReportMeta,
  ambientes: ChecklistAmbiente[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = COL.margin;

  const addPage = () => {
    doc.addPage();
    y = COL.margin;
    drawPageHeader();
  };

  const checkY = (needed: number) => {
    if (y + needed > COL.pageH - 16) addPage();
  };

  // ── Rodapé de página ────────────────────────────────────────────────────
  function drawPageFooter() {
    const pageNum = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Relatório Técnico de Checklist · ${meta.nomeObra}`,
      COL.margin,
      COL.pageH - 8,
    );
    doc.text(
      `Página ${pageNum}`,
      COL.pageW - COL.margin,
      COL.pageH - 8,
      { align: 'right' },
    );
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(COL.margin, COL.pageH - 12, COL.pageW - COL.margin, COL.pageH - 12);
  }

  function drawPageHeader() {
    doc.setFillColor(...PRIMARY);
    doc.rect(COL.margin, y, COL.contentW, 1, 'F');
    y += 3;
  }

  // ── Banner principal ─────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, COL.pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELATÓRIO TÉCNICO DE CHECKLIST', COL.margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fiscalização de Obras · Inspeção de Serviços', COL.margin, 21);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(COL.margin, 26, COL.pageW - COL.margin, 26);

  doc.setFontSize(8);
  doc.text(`Emitido em: ${meta.dataRelatorio}`, COL.pageW - COL.margin, 33, { align: 'right' });

  y = 46;

  // ── Bloco de identificação ──────────────────────────────────────────────
  const fields: [string, string][] = [
    ['Obra', meta.nomeObra],
    ['Município', meta.municipio],
    ['Empresa Contratada', meta.empresa],
    ...(meta.nContrato ? [['Nº do Contrato', meta.nContrato] as [string, string]] : []),
    ...(meta.fiscal ? [['Fiscal Responsável', meta.fiscal] as [string, string]] : []),
    ['Arquivo de Projeto', meta.pdfNomeArquivo],
    ...(meta.prazoCorrecao ? [['Prazo para Correção', `${meta.prazoCorrecao} dia${meta.prazoCorrecao !== 1 ? 's' : ''} (Responsável: Contratada)`] as [string, string]] : []),
  ];

  const fieldRowH = 11;
  const numRows = Math.ceil(fields.length / 2);
  const blockH = 14 + numRows * fieldRowH;

  doc.setFillColor(245, 248, 245);
  doc.setDrawColor(180, 220, 190);
  doc.setLineWidth(0.3);
  doc.roundedRect(COL.margin, y, COL.contentW, blockH, 2, 2, 'FD');

  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('IDENTIFICAÇÃO DA OBRA', COL.margin + 4, y + 7);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(COL.margin + 4, y + 9, COL.margin + 65, y + 9);

  const col1x = COL.margin + 4;
  const col2x = COL.margin + 4 + COL.contentW / 2;
  const colW = COL.contentW / 2 - 8;

  fields.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const fx = col === 0 ? col1x : col2x;
    const baseY = y + 14 + row * fieldRowH;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 130, 120);
    doc.text(label.toUpperCase(), fx, baseY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    const wrapped = doc.splitTextToSize(value, colW);
    doc.text(wrapped[0], fx, baseY + 4.5);
  });

  y += blockH + 6;

  // ── Resumo geral ─────────────────────────────────────────────────────────
  const allServicos = ambientes.flatMap(a => a.servicos);
  const totalServ = allServicos.length;
  const totalAprov = allServicos.filter(s => s.status === 'aprovado').length;
  const totalReprov = allServicos.filter(s => s.status === 'reprovado').length;
  const totalPend = allServicos.filter(s => s.status === 'pendente').length;
  const pctAprov = totalServ ? Math.round((totalAprov / totalServ) * 100) : 0;

  checkY(38);

  doc.setFillColor(...PRIMARY_LIGHT);
  doc.setDrawColor(180, 220, 190);
  doc.setLineWidth(0.3);
  doc.roundedRect(COL.margin, y, COL.contentW, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY);
  doc.text('RESUMO GERAL', COL.margin + 4, y + 7);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(COL.margin + 4, y + 9, COL.margin + 45, y + 9);

  const totalBoxW = COL.contentW - 8;
  const boxGap = 3;
  const boxW = (totalBoxW - boxGap * 4) / 5;

  const boxes = [
    { label: 'Ambientes',      val: ambientes.length, color: PRIMARY as [number,number,number] },
    { label: 'Total Serviços', val: totalServ,         color: [80, 80, 80]    as [number,number,number] },
    { label: 'Aprovados',      val: totalAprov,        color: [22, 163, 74]   as [number,number,number] },
    { label: 'Reprovados',     val: totalReprov,       color: [220, 38, 38]   as [number,number,number] },
    { label: 'Pendentes',      val: totalPend,         color: [202, 138, 4]   as [number,number,number] },
  ];

  boxes.forEach((b, i) => {
    const bx = COL.margin + 4 + i * (boxW + boxGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...b.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, y + 12, boxW, 14, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...b.color);
    doc.text(String(b.val), bx + boxW / 2, y + 21, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(b.label, bx + boxW / 2, y + 25, { align: 'center' });
  });

  y += 36;

  // ── Barra de progresso ───────────────────────────────────────────────────
  checkY(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(`Conformidade: ${pctAprov}%`, COL.margin, y + 5);

  const barX = COL.margin + 42;
  const barW = COL.contentW - 44;
  doc.setFillColor(220, 240, 225);
  doc.roundedRect(barX, y + 1.5, barW, 5, 2, 2, 'F');

  if (pctAprov > 0) {
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(barX, y + 1.5, barW * (pctAprov / 100), 5, 2, 2, 'F');
  }

  y += 14;

  // ── MAPA DO PROJETO (uma página por PDF page com pins numerados) ──────────
  if (meta.pdfUrl) {
    const totalPages = meta.totalPaginasPdf || 1;

    // Agrupar ambientes por página
    const ambsByPage: Map<number, ChecklistAmbiente[]> = new Map();
    ambientes.forEach(amb => {
      const pg = amb.pagina;
      if (!ambsByPage.has(pg)) ambsByPage.set(pg, []);
      ambsByPage.get(pg)!.push(amb);
    });

    // Render only pages that have ambientes with pins
    const pagesWithPins = Array.from(ambsByPage.keys()).filter(pg => {
      const ambs = ambsByPage.get(pg) || [];
      return ambs.some(a => a.servicos.some(s => s.location_pin));
    });

    for (const pageNum of pagesWithPins.sort((a, b) => a - b)) {
      // Render PDF page
      const pageImgData = await renderPdfPageToBase64(meta.pdfUrl, pageNum, 1600);

      addPage(); // always start map on a new page

      // Title
      doc.setFillColor(...PRIMARY);
      doc.rect(COL.margin, y, COL.contentW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`MAPA DE MARCAÇÕES — PÁGINA ${pageNum}`, COL.margin + 4, y + 5.5);
      y += 10;

      // Map area: draw PDF page image
      const mapH = 140; // mm height for map
      const mapW = COL.contentW;

      if (pageImgData) {
        // Draw a light border
        doc.setDrawColor(180, 220, 190);
        doc.setLineWidth(0.4);
        doc.rect(COL.margin, y, mapW, mapH, 'D');
        doc.addImage(pageImgData, 'JPEG', COL.margin, y, mapW, mapH);
      } else {
        doc.setFillColor(245, 248, 245);
        doc.setDrawColor(180, 220, 190);
        doc.setLineWidth(0.3);
        doc.rect(COL.margin, y, mapW, mapH, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text('Projeto não disponível', COL.margin + mapW / 2, y + mapH / 2, { align: 'center' });
      }

      // Build a global index map: servicoId → sequential number across all environments
      const globalPinIndex: Map<string, number> = new Map();
      let pinCounter = 1;
      ambientes.forEach(amb => {
        amb.servicos.forEach(s => {
          if (s.location_pin) {
            globalPinIndex.set(s.id, pinCounter++);
          }
        });
      });

      // Overlay pins as numbered circles on the map image
      const pageAmbs = ambsByPage.get(pageNum) || [];
      pageAmbs.forEach(amb => {
        amb.servicos.forEach(s => {
          const pin = s.location_pin as { x: number; y: number } | null;
          if (!pin) return;

          const pinNum = globalPinIndex.get(s.id) ?? 0;
          const { r, g, b } = statusColor(s.status);

          // Convert 0-100 coordinates to PDF mm within the map rect
          const pinX = COL.margin + (pin.x / 100) * mapW;
          const pinY = y + (pin.y / 100) * mapH;

          const circleR = 2.0;

          // Drop shadow
          doc.setFillColor(0, 0, 0);
          doc.setGState(doc.GState({ opacity: 0.2 }));
          doc.circle(pinX + 0.4, pinY + 0.4, circleR, 'F');
          doc.setGState(doc.GState({ opacity: 1 }));

          // Colored circle
          doc.setFillColor(r, g, b);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.circle(pinX, pinY, circleR, 'FD');

          // Number
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(pinNum > 9 ? 3.5 : 4.5);
          doc.setTextColor(255, 255, 255);
          doc.text(String(pinNum), pinX, pinY + (pinNum > 9 ? 1.0 : 1.2), { align: 'center' });
        });
      });

      y += mapH + 6;

      // Legend below the map
      checkY(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...PRIMARY);
      doc.text('LEGENDA DOS PINS:', COL.margin, y + 4);
      y += 7;

      // List pins for this page in 2 columns
      const pageServicos: { num: number; descricao: string; status: string; ambNome: string }[] = [];
      pageAmbs.forEach(amb => {
        amb.servicos.forEach(s => {
          const pin = s.location_pin as { x: number; y: number } | null;
          if (!pin) return;
          pageServicos.push({
            num: globalPinIndex.get(s.id) ?? 0,
            descricao: s.descricao,
            status: s.status,
            ambNome: amb.nome,
          });
        });
      });

      const legendColW = (COL.contentW - 6) / 2;
      pageServicos.forEach((item, idx) => {
        const col = idx % 2;
        const lx = col === 0 ? COL.margin : COL.margin + legendColW + 6;
        if (col === 0 && idx > 0) checkY(7);

        const { r, g, b } = statusColor(item.status);
        const rowY = y;

        doc.setFillColor(r, g, b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.circle(lx + 3, rowY + 2.5, 2.8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(item.num), lx + 3, rowY + 3.8, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(20, 20, 20);
        const descWrapped = doc.splitTextToSize(`${item.ambNome} · ${item.descricao}`, legendColW - 10);
        doc.text(descWrapped[0], lx + 7.5, rowY + 2.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(r, g, b);
        doc.text(statusLabel(item.status), lx + 7.5, rowY + 5.5);

        if (col === 1 || idx === pageServicos.length - 1) y += 8;
      });

      y += 4;
    }
  }

  // ── Por ambiente ─────────────────────────────────────────────────────────
  // Build a global sequential index for pins
  const globalPinIndexFinal: Map<string, number> = new Map();
  let pinCounterFinal = 1;
  ambientes.forEach(amb => {
    amb.servicos.forEach(s => {
      if (s.location_pin) {
        globalPinIndexFinal.set(s.id, pinCounterFinal++);
      }
    });
  });

  for (const amb of ambientes) {
    const reprovados = amb.servicos.filter(s => s.status === 'reprovado');
    const aprovados = amb.servicos.filter(s => s.status === 'aprovado');
    const pendentes = amb.servicos.filter(s => s.status === 'pendente');

    checkY(24);

    // Cabeçalho do ambiente
    const statusAmb =
      reprovados.length > 0 ? 'reprovado' :
      pendentes.length > 0 ? 'pendente' : 'aprovado';
    const { r, g, b } = statusColor(statusAmb);

    doc.setFillColor(r, g, b);
    doc.rect(COL.margin, y, 2.5, 9, 'F');

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(COL.margin + 2.5, y, COL.contentW - 2.5, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(amb.nome.toUpperCase(), COL.margin + 6, y + 5.8);

    // mini badges
    const badgeX = COL.margin + COL.contentW - 65;
    const badges = [
      { label: `${aprovados.length} Aprov.`, c: [22, 163, 74] as [number, number, number] },
      { label: `${reprovados.length} Reprov.`, c: [220, 38, 38] as [number, number, number] },
      { label: `${pendentes.length} Pend.`, c: [202, 138, 4] as [number, number, number] },
    ];
    let bx = badgeX;
    badges.forEach(({ label, c }) => {
      doc.setFillColor(...c);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      const tw = doc.getTextWidth(label) + 3;
      doc.roundedRect(bx, y + 2, tw, 5, 1, 1, 'F');
      doc.text(label, bx + tw / 2, y + 5.8, { align: 'center' });
      bx += tw + 2;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Pág. ${amb.pagina}`, COL.margin + 6, y + 8.5);

    y += 11;

    // Tabela de serviços
    if (amb.servicos.length === 0) {
      checkY(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text('Nenhum serviço cadastrado neste ambiente.', COL.margin + 4, y + 5);
      y += 10;
      continue;
    }

    // Table header
    checkY(8);
    doc.setFillColor(...PRIMARY);
    doc.rect(COL.margin, y, COL.contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Nº', COL.margin + 3, y + 4.8);
    doc.text('DESCRIÇÃO DO SERVIÇO', COL.margin + 12, y + 4.8);
    doc.text('GRAVIDADE', COL.pageW - COL.margin - 55, y + 4.8);
    doc.text('STATUS', COL.pageW - COL.margin - 12, y + 4.8, { align: 'right' });
    y += 7;

    // Table rows
    for (let idx = 0; idx < amb.servicos.length; idx++) {
      const serv = amb.servicos[idx];
      const extraRowH = serv.observacao ? 4 : 0;
      const rowH = 8 + extraRowH;

      // Pre-calculate photos height so we can do a single checkY for the whole block
      const photoPairs: { url: string; label: string }[] = [];
      if (serv.foto_reprovacao_url) photoPairs.push({ url: serv.foto_reprovacao_url, label: 'Foto do Problema' });
      if (serv.foto_correcao_url) photoPairs.push({ url: serv.foto_correcao_url, label: 'Foto da Correção' });

      const photoW = 85;
      const photoH = 52;
      const photoBlockH = photoPairs.length > 0 ? photoH + 10 : 0;

      // checkY for the full block (row + photos) so they always stay together
      checkY(rowH + photoBlockH + 2);

      const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...(rowBg as [number, number, number]));
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.rect(COL.margin, y, COL.contentW, rowH, 'FD');

      // Nº
      const pinNum = globalPinIndexFinal.get(serv.id);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(String(idx + 1).padStart(2, '0'), COL.margin + 3, y + 5);

      // If has pin, draw a small colored circle with the global number
      if (pinNum !== undefined) {
        const { r: pr, g: pg, b: pb } = statusColor(serv.status);
        doc.setFillColor(pr, pg, pb);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.circle(COL.margin + 7.5, y + 4, 2.2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(pinNum > 9 ? 4.5 : 5.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(pinNum), COL.margin + 7.5, y + 5.8, { align: 'center' });
      }

      // Descrição
      const descLines = doc.splitTextToSize(serv.descricao, 95);
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', serv.status === 'reprovado' ? 'bold' : 'normal');
      doc.setFontSize(7);
      doc.text(descLines[0], COL.margin + 12, y + 5);

      // Observação
      if (serv.observacao) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        const obsLines = doc.splitTextToSize(`Obs: ${serv.observacao}`, 95);
        doc.text(obsLines[0], COL.margin + 12, y + 9);
      }

      // Gravidade pill — posicionada antes do Status
      const [gr, gg, gb] = gravidadeColor(serv.gravidade);
      const gLabel = gravidadeLabel(serv.gravidade).replace(/🔴 |🟡 |🟢 /, '');
      doc.setFillColor(gr, gg, gb);
      const gw = doc.getTextWidth(gLabel) + 4;
      doc.roundedRect(COL.pageW - COL.margin - 57, y + 1.5, gw, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.text(gLabel, COL.pageW - COL.margin - 57 + gw / 2, y + 4.3, { align: 'center' });

      // Status pill
      const { r: sr, g: sg, b: sb } = statusColor(serv.status);
      doc.setFillColor(sr, sg, sb);
      const sLabel = statusLabel(serv.status);
      const sw2 = doc.getTextWidth(sLabel) + 4;
      doc.roundedRect(COL.pageW - COL.margin - sw2 - 1, y + 1.5, sw2, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(sLabel, COL.pageW - COL.margin - 1 - sw2 / 2, y + 4.3, { align: 'center' });

      y += rowH;

      // ── Fotos inline (logo abaixo da linha do serviço, na mesma página) ────
      if (photoPairs.length > 0) {
        let px = COL.margin;
        for (const { url, label } of photoPairs) {
          const imgData = await loadImageAsBase64(url);
          doc.setFillColor(245, 245, 245);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.rect(px, y, photoW, photoH + 6, 'FD');

          if (imgData) {
            try {
              doc.addImage(imgData, 'JPEG', px + 1, y + 1, photoW - 2, photoH - 2);
            } catch {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7);
              doc.setTextColor(160, 160, 160);
              doc.text('[Imagem não disponível]', px + photoW / 2, y + photoH / 2, { align: 'center' });
            }
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(80, 80, 80);
          doc.text(label, px + photoW / 2, y + photoH + 4, { align: 'center' });
          px += photoW + 12;
        }

        y += photoBlockH;
      }
    }

    y += 6;
  }

  // ── Rodapé em todas as páginas ───────────────────────────────────────────
  const totalPagesAll = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesAll; i++) {
    doc.setPage(i);
    drawPageFooter();
  }

  // ── Bloco de assinatura formal ───────────────────────────────────────────
  doc.setPage(totalPagesAll);
  checkY(70);

  // Separador
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(COL.margin, y, COL.pageW - COL.margin, y);
  y += 6;

  // Texto institucional
  doc.setFillColor(...PRIMARY_LIGHT);
  doc.setDrawColor(180, 220, 190);
  doc.setLineWidth(0.3);
  doc.roundedRect(COL.margin, y, COL.contentW, 14, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 80, 60);
  doc.text('Este relatório foi gerado pelo Sistema Integrado de Fiscalização (SIDIF) · Defensoria Pública do Estado de Mato Grosso.', COL.margin + 4, y + 5.5);
  doc.text('Documento de uso interno. Para esclarecimentos, contate o fiscal responsável pela obra.', COL.margin + 4, y + 10);
  y += 20;

  // Três campos de assinatura lado a lado
  const sigW = 52;
  const sigGap = (COL.contentW - sigW * 3) / 2;
  const sigs: { line: string; label: string; name?: string }[] = [
    { line: '_'.repeat(30), label: 'Fiscal Responsável', name: meta.fiscal },
    { line: '_'.repeat(30), label: 'Responsável pela Empresa', name: undefined },
    { line: '_'.repeat(30), label: 'Coordenador / Gestor', name: undefined },
  ];

  sigs.forEach((sig, i) => {
    const sx = COL.margin + i * (sigW + sigGap);
    // Box
    doc.setFillColor(250, 252, 250);
    doc.setDrawColor(180, 220, 190);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, sigW, 28, 2, 2, 'FD');
    // Linha de assinatura
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(sx + 4, y + 16, sx + sigW - 4, y + 16);
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PRIMARY);
    doc.text(sig.label, sx + sigW / 2, y + 20, { align: 'center' });
    // Nome
    if (sig.name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(40, 40, 40);
      const nameWrapped = doc.splitTextToSize(sig.name, sigW - 6);
      doc.text(nameWrapped[0], sx + sigW / 2, y + 24.5, { align: 'center' });
    }
    // Data
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    doc.text(`Data: ____/____/________`, sx + sigW / 2, y + 25.5 + (sig.name ? 2 : 0), { align: 'center' });
  });

  y += 32;

  doc.save(`checklist_${meta.obraId}_${Date.now()}.pdf`);
}

