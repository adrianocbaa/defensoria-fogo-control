import jsPDF from 'jspdf';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';

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

  // ── Cabeçalho de página (rodapé) ────────────────────────────────────────
  const totalPagesPlaceholder = '{totalPages}';

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
    // separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(COL.margin, COL.pageH - 12, COL.pageW - COL.margin, COL.pageH - 12);
  }

  function drawPageHeader() {
    // thin top accent
    doc.setFillColor(30, 64, 175); // blue-800
    doc.rect(COL.margin, y, COL.contentW, 1, 'F');
    y += 3;
  }

  // ── Capa / cabeçalho principal ───────────────────────────────────────────
  // Banner
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, COL.pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELATÓRIO TÉCNICO DE CHECKLIST', COL.margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Fiscalização de Obras · Inspeção de Serviços', COL.margin, 21);

  // Linha divisória branca
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(COL.margin, 26, COL.pageW - COL.margin, 26);

  // Data
  doc.setFontSize(8);
  doc.text(`Emitido em: ${meta.dataRelatorio}`, COL.pageW - COL.margin, 33, { align: 'right' });

  y = 46;

  // ── Bloco de identificação ──────────────────────────────────────────────
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(COL.margin, y, COL.contentW, 40, 2, 2, 'FD');

  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('IDENTIFICAÇÃO DA OBRA', COL.margin + 4, y + 7);

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(COL.margin + 4, y + 9, COL.margin + 60, y + 9);

  const fields = [
    ['Obra', meta.nomeObra],
    ['Município', meta.municipio],
    ['Empresa Contratada', meta.empresa],
    ...(meta.nContrato ? [['Nº do Contrato', meta.nContrato]] : []),
    ...(meta.fiscal ? [['Fiscal Responsável', meta.fiscal]] : []),
    ['Arquivo de Projeto', meta.pdfNomeArquivo],
  ] as [string, string][];

  const col1x = COL.margin + 4;
  const col2x = COL.margin + 50;
  let fy = y + 14;
  const rowH = 5.5;

  fields.forEach(([label, value], idx) => {
    const row = Math.floor(idx / 2);
    const isLeft = idx % 2 === 0;
    const fx = isLeft ? col1x : col2x + 46;
    const lineY = y + 14 + row * rowH;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 130);
    doc.text(label.toUpperCase(), fx, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    const maxW = isLeft ? 44 : 50;
    const lines = doc.splitTextToSize(value, maxW);
    doc.text(lines[0], fx, lineY + 3.5);
  });

  y += 46;

  // ── Resumo geral ─────────────────────────────────────────────────────────
  const allServicos = ambientes.flatMap(a => a.servicos);
  const totalServ = allServicos.length;
  const totalAprov = allServicos.filter(s => s.status === 'aprovado').length;
  const totalReprov = allServicos.filter(s => s.status === 'reprovado').length;
  const totalPend = allServicos.filter(s => s.status === 'pendente').length;
  const pctAprov = totalServ ? Math.round((totalAprov / totalServ) * 100) : 0;

  checkY(34);

  doc.setFillColor(240, 244, 255);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(COL.margin, y, COL.contentW, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('RESUMO GERAL', COL.margin + 4, y + 7);
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(COL.margin + 4, y + 9, COL.margin + 45, y + 9);

  const boxW = 34;
  const boxGap = 6;
  const boxes = [
    { label: 'Ambientes', val: ambientes.length, color: [30, 64, 175] },
    { label: 'Total Serviços', val: totalServ, color: [80, 80, 80] },
    { label: 'Aprovados', val: totalAprov, color: [22, 163, 74] },
    { label: 'Reprovados', val: totalReprov, color: [220, 38, 38] },
    { label: 'Pendentes', val: totalPend, color: [202, 138, 4] },
  ] as const;

  boxes.forEach((b, i) => {
    const bx = COL.margin + 4 + i * (boxW + boxGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...(b.color as [number, number, number]));
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, y + 12, boxW, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(b.color as [number, number, number]));
    doc.text(String(b.val), bx + boxW / 2, y + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(b.label, bx + boxW / 2, y + 23.5, { align: 'center' });
  });

  y += 34;

  // ── Barra de progresso ───────────────────────────────────────────────────
  checkY(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(`Conformidade: ${pctAprov}%`, COL.margin, y + 5);

  doc.setFillColor(230, 234, 240);
  doc.roundedRect(COL.margin + 38, y + 1.5, 130, 5, 2, 2, 'F');

  if (pctAprov > 0) {
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(COL.margin + 38, y + 1.5, 130 * (pctAprov / 100), 5, 2, 2, 'F');
  }

  y += 14;

  // ── Por ambiente ─────────────────────────────────────────────────────────
  for (const amb of ambientes) {
    const reprovados = amb.servicos.filter(s => s.status === 'reprovado');
    const aprovados = amb.servicos.filter(s => s.status === 'aprovado');
    const pendentes = amb.servicos.filter(s => s.status === 'pendente');
    const hasPhotos = amb.servicos.some(s => s.foto_reprovacao_url || s.foto_correcao_url);

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
    doc.setFillColor(30, 64, 175);
    doc.rect(COL.margin, y, COL.contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Nº', COL.margin + 3, y + 4.8);
    doc.text('DESCRIÇÃO DO SERVIÇO', COL.margin + 12, y + 4.8);
    doc.text('STATUS', COL.pageW - COL.margin - 32, y + 4.8);
    doc.text('TIPO', COL.pageW - COL.margin - 10, y + 4.8, { align: 'right' });
    y += 7;

    // Table rows
    for (let idx = 0; idx < amb.servicos.length; idx++) {
      const serv = amb.servicos[idx];
      const rowH = serv.observacao ? 10 : 7;
      checkY(rowH);

      const rowBg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...(rowBg as [number, number, number]));
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.rect(COL.margin, y, COL.contentW, rowH, 'FD');

      // Nº
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(String(idx + 1).padStart(2, '0'), COL.margin + 3, y + 4.5);

      // Descrição
      const descLines = doc.splitTextToSize(serv.descricao, 100);
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', serv.status === 'reprovado' ? 'bold' : 'normal');
      doc.text(descLines[0], COL.margin + 12, y + 4.5);

      // Observação (se houver)
      if (serv.observacao) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        const obsLines = doc.splitTextToSize(`Obs: ${serv.observacao}`, 110);
        doc.text(obsLines[0], COL.margin + 12, y + 8.5);
      }

      // Status pill
      const { r: sr, g: sg, b: sb } = statusColor(serv.status);
      doc.setFillColor(sr, sg, sb);
      const sLabel = statusLabel(serv.status);
      const sw2 = doc.getTextWidth(sLabel) + 4;
      doc.roundedRect(COL.pageW - COL.margin - sw2 - 14, y + 1.5, sw2, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(sLabel, COL.pageW - COL.margin - 14 - sw2 / 2, y + 4.3, { align: 'center' });

      // Tipo (padrão/avulso)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text(serv.is_padrao ? 'Padrão' : 'Avulso', COL.pageW - COL.margin - 1, y + 4.5, { align: 'right' });

      // Pin indicator
      if (serv.location_pin) {
        doc.setFillColor(220, 38, 38);
        doc.circle(COL.margin + 7.5, y + rowH / 2, 1, 'F');
      }

      y += rowH;

      // ── Fotos inline (logo abaixo da linha do serviço) ──────────────────
      const photoPairs: { url: string; label: string }[] = [];
      if (serv.foto_reprovacao_url) photoPairs.push({ url: serv.foto_reprovacao_url, label: 'Foto do Problema' });
      if (serv.foto_correcao_url) photoPairs.push({ url: serv.foto_correcao_url, label: 'Foto da Correção' });

      if (photoPairs.length > 0) {
        const photoW = 85;
        const photoH = 52;
        const photoBlockH = photoH + 10; // foto + legenda + margem
        checkY(photoBlockH);

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
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter();
  }

  // ── Assinatura / observação final ────────────────────────────────────────
  doc.setPage(totalPages);
  checkY(40);

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.4);
  doc.line(COL.margin, y, COL.pageW - COL.margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text(
    'Este relatório foi gerado automaticamente pelo Sistema de Fiscalização de Obras (SIDIF).',
    COL.margin,
    y,
  );
  doc.text(
    'Para informações ou contestações, entre em contato com o fiscal responsável pela obra.',
    COL.margin,
    y + 5,
  );

  y += 16;

  // Linha de assinatura
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  const sigW = 70;
  const sigX = COL.pageW / 2 - sigW / 2;
  doc.line(sigX, y, sigX + sigW, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Fiscal Responsável', COL.pageW / 2, y + 4, { align: 'center' });
  if (meta.fiscal) {
    doc.setFont('helvetica', 'bold');
    doc.text(meta.fiscal, COL.pageW / 2, y + 8, { align: 'center' });
  }

  // ── Salvar ───────────────────────────────────────────────────────────────
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = meta.nomeObra.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 30);
  doc.save(`Checklist_${safeName}_${date}.pdf`);
}
