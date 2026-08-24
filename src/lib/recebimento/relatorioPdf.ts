import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CLASSIFICACAO_LABEL,
  SITUACAO_LABEL,
  STATUS_LABEL,
  vistoriaTitulo,
} from '@/lib/recebimento/constants';
import type { Ambiente } from '@/hooks/useRecebimentoChecklist';
import type { Foto, Pendencia } from '@/hooks/useRecebimentoPendencias';
import type { Vistoria } from '@/hooks/useRecebimentoVistorias';

interface Args {
  vistoria: Vistoria;
  obra: { nome: string; contrato?: string | null; endereco?: string | null; empresa?: string | null };
  fiscalNome: string;
  fiscalFuncao?: string;
  ambientes: Ambiente[];
  pendencias: Pendencia[];
  fotos: Foto[];
}

const MARGIN = 14;

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarRelatorioRecebimentoPdf({
  vistoria,
  obra,
  fiscalNome,
  fiscalFuncao,
  ambientes,
  pendencias,
  fotos,
}: Args) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Diretoria de Infraestrutura e Fiscalização — SiDIF', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`RELATÓRIO DE ${vistoriaTitulo(vistoria).toUpperCase()}`, pageW / 2, y, {
    align: 'center',
  });
  y += 8;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ['Obra', obra.nome],
      ['Contrato', obra.contrato || '—'],
      ['Empresa', obra.empresa || '—'],
      ['Endereço', obra.endereco || '—'],
      ['Data da vistoria', fmtData(vistoria.data)],
      [fiscalFuncao || 'Fiscal responsável', fiscalNome || '—'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Resumo
  const todas = ambientes.flatMap((a) => a.servicos.flatMap((s) => s.verificacoes));
  const cont = (st: string) => todas.filter((v) => v.status === st).length;
  const abertas = pendencias.filter((p) => !['sanada', 'cancelada'].includes(p.situacao)).length;

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    head: [['Resumo', 'Qtde']],
    body: [
      ['Ambientes vistoriados', String(ambientes.length)],
      ['Itens verificados', String(todas.length)],
      ['Conformes', String(cont('conforme'))],
      ['Não conformes', String(cont('nao_conforme'))],
      ['Não executados', String(cont('nao_executado'))],
      ['Não se aplica', String(cont('nao_aplica'))],
      ['Pendências em aberto', String(abertas)],
      ['Pendências sanadas', String(pendencias.filter((p) => p.situacao === 'sanada').length)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [22, 101, 52] },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Checklist por ambiente
  for (const amb of ambientes) {
    const body = amb.servicos.flatMap((s) =>
      s.verificacoes.map((v) => [s.servico_snapshot, v.descricao_snapshot, STATUS_LABEL[v.status]]),
    );
    if (!body.length) continue;
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [[{ content: amb.nome, colSpan: 3, styles: { halign: 'left' } }], ['Serviço', 'Verificação', 'Situação']],
      body,
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [22, 101, 52] },
      columnStyles: { 0: { cellWidth: 42 }, 2: { cellWidth: 30 } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Pendências
  if (pendencias.length) {
    doc.addPage();
    y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PENDÊNCIAS REGISTRADAS', MARGIN, y);
    y += 6;

    for (const p of pendencias) {
      if (y > 235) {
        doc.addPage();
        y = MARGIN;
      }
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        body: [
          ['Pendência', p.titulo],
          ['Descrição', p.descricao || '—'],
          ['Classificação', CLASSIFICACAO_LABEL[p.classificacao]],
          ['Prazo', p.prazo_correcao ? fmtData(p.prazo_correcao) : '—'],
          ['Situação', SITUACAO_LABEL[p.situacao]],
        ],
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

      const antes = fotos.find((f) => f.pendencia_id === p.id && f.tipo === 'ocorrencia');
      const depois = fotos.find((f) => f.pendencia_id === p.id && f.tipo === 'correcao');
      if (antes?.url || depois?.url) {
        const w = (pageW - MARGIN * 2 - 6) / 2;
        const h = 45;
        if (y + h > 280) {
          doc.addPage();
          y = MARGIN;
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('ANTES', MARGIN, y + 3);
        doc.text('DEPOIS', MARGIN + w + 6, y + 3);
        const [a, d] = await Promise.all([
          antes?.url ? fetchDataUrl(antes.url) : null,
          depois?.url ? fetchDataUrl(depois.url) : null,
        ]);
        try {
          if (a) doc.addImage(a, 'JPEG', MARGIN, y + 5, w, h);
          if (d) doc.addImage(d, 'JPEG', MARGIN + w + 6, y + 5, w, h);
        } catch {
          /* imagem inválida — ignora */
        }
        y += h + 12;
      } else {
        y += 4;
      }
    }
  }

  // Assinatura
  if (y > 240) {
    doc.addPage();
    y = MARGIN;
  }
  y = Math.max(y + 16, 240);
  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(fiscalNome || fiscalFuncao || 'Fiscal do Contrato', pageW / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(fiscalFuncao || 'Fiscal do Contrato', pageW / 2, y + 10, { align: 'center' });
  doc.text('Defensoria Pública do Estado de Mato Grosso', pageW / 2, y + 15, { align: 'center' });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `SiDIF — ${obra.nome} — ${vistoriaTitulo(vistoria)} — pág. ${i}/${total}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'center' },
    );
    doc.setTextColor(0);
  }

  doc.save(
    `recebimento-${vistoria.tipo}-${String(vistoria.sequencia).padStart(2, '0')}-${obra.nome
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()}.pdf`,
  );
}
