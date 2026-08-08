import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  IMPACTO_LABEL,
  PAPEL_LABEL,
  RESPONSABILIDADE_LABEL,
  RESULTADO_LABEL,
  SITUACAO_LABEL,
  STATUS_LABEL,
  TEXTO_CIENCIA,
  formatarData,
  formatarDataHora,
  type Resultado,
} from '@/lib/entrega/constants';
import type { ResumoEntrega } from '@/lib/entrega/resultado';
import type {
  EntregaAmbiente,
  EntregaParticipante,
  EntregaPendencia,
  EntregaVistoria,
} from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto } from '@/hooks/useEntregaPendencias';

const MARGIN = 14;

interface Args {
  entrega: EntregaVistoria;
  obra: { nome: string; contrato?: string | null; endereco?: string | null; empresa?: string | null };
  resumo: ResumoEntrega;
  ambientes: EntregaAmbiente[];
  participantes: EntregaParticipante[];
  pendencias: EntregaPendencia[];
  fotos: EntregaFoto[];
}

async function paraDataUrl(url: string): Promise<string | null> {
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

function cabecalho(doc: jsPDF, titulo: string, obra: Args['obra'], entrega: EntregaVistoria) {
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
  doc.text(titulo, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const linhas = [
    `Obra: ${obra.nome}`,
    obra.contrato ? `Contrato: ${obra.contrato}` : null,
    obra.empresa ? `Contratada: ${obra.empresa}` : null,
    obra.endereco ? `Endereço: ${obra.endereco}` : null,
    `Data da entrega: ${formatarData(entrega.data)}`,
    entrega.recebimento_definitivo_data
      ? `Recebimento Definitivo concluído em: ${formatarData(entrega.recebimento_definitivo_data)}`
      : null,
  ].filter(Boolean) as string[];
  for (const l of linhas) {
    doc.text(l, MARGIN, y);
    y += 4.5;
  }
  return y + 3;
}

function rodape(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${total}`, pageW - MARGIN, pageH - 8, { align: 'right' });
    doc.text('Gerado pelo SiDIF', MARGIN, pageH - 8);
    doc.setTextColor(0);
  }
}

/** Termo de Entrega Institucional com resultado, ressalvas e ciência. */
export async function gerarTermoEntregaPdf({
  entrega,
  obra,
  resumo,
  ambientes,
  participantes,
  pendencias,
}: Args) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = cabecalho(doc, 'TERMO DE ENTREGA INSTITUCIONAL', obra, entrega);

  const resultado: Resultado = (entrega.resultado_congelado as Resultado) ?? resumo.resultado;

  doc.setDrawColor(180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.rect(MARGIN, y, pageW - MARGIN * 2, 12);
  doc.text(RESULTADO_LABEL[resultado], pageW / 2, y + 8, { align: 'center' });
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const intro = doc.splitTextToSize(TEXTO_CIENCIA, pageW - MARGIN * 2);
  doc.text(intro, MARGIN, y);
  y += intro.length * 4.2 + 4;

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Quantidade']],
    body: [
      ['Ambientes vistoriados', String(resumo.ambientes)],
      ['Verificações realizadas', String(resumo.verificacoes - resumo.naoVistoriados)],
      ['Itens conformes', String(resumo.conformes)],
      ['Itens não aplicáveis', String(resumo.naoAplica)],
      ['Pendências abertas', String(resumo.pendenciasAbertas)],
      ['Pendências impeditivas', String(resumo.impeditivasAbertas)],
      ['Pendências sanadas', String(resumo.sanadas)],
    ],
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 64, 90] },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const nomeAmbiente = (id: string | null) =>
    ambientes.find((a) => a.id === id)?.nome ?? 'Sem ambiente';

  const abertas = pendencias.filter(
    (p) => p.situacao !== 'sanada' && p.situacao !== 'cancelada',
  );
  if (abertas.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESSALVAS REGISTRADAS', MARGIN, y);
    y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [['Ambiente', 'Pendência', 'Responsabilidade', 'Impacto', 'Situação']],
      body: abertas.map((p) => [
        nomeAmbiente(p.ambiente_id),
        p.titulo,
        RESPONSABILIDADE_LABEL[p.responsabilidade] +
          (p.responsavel_terceiro ? ` (${p.responsavel_terceiro})` : ''),
        IMPACTO_LABEL[p.impacto],
        SITUACAO_LABEL[p.situacao],
      ]),
      styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 64, 90] },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  if (entrega.ciencia_em) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Ciência registrada em ${formatarDataHora(entrega.ciencia_em)}`, MARGIN, y);
    y += 5;
    if (entrega.ciencia_observacoes) {
      doc.setFont('helvetica', 'normal');
      const obs = doc.splitTextToSize(entrega.ciencia_observacoes, pageW - MARGIN * 2);
      doc.text(obs, MARGIN, y);
      y += obs.length * 4.2 + 2;
    }
  }

  // assinaturas
  y = Math.max(y + 12, doc.internal.pageSize.getHeight() - 70);
  const larguraCol = (pageW - MARGIN * 2) / 2 - 6;
  participantes.forEach((p, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) y += 24;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = MARGIN + 10;
    }
    const x = MARGIN + col * (larguraCol + 12);
    doc.setDrawColor(120);
    doc.line(x, y, x + larguraCol, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(p.nome_snapshot, x, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `${PAPEL_LABEL[p.papel] ?? p.papel}${p.funcao_snapshot ? ` — ${p.funcao_snapshot}` : ''}`,
      x,
      y + 8,
    );
  });

  rodape(doc);
  doc.save(`termo-entrega-institucional-${obra.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

/** Relatório fotográfico da entrega: fotos por ambiente e por pendência. */
export async function gerarRelatorioFotograficoEntregaPdf({
  entrega,
  obra,
  ambientes,
  pendencias,
  fotos,
  resumo,
  participantes,
}: Args) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = cabecalho(doc, 'RELATÓRIO FOTOGRÁFICO — ENTREGA INSTITUCIONAL', obra, entrega);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${resumo.ambientes} ambiente(s) · ${fotos.length} registro(s) fotográfico(s) · ${participantes.length} participante(s)`,
    MARGIN,
    y,
  );
  y += 8;

  const larguraFoto = (pageW - MARGIN * 2 - 6) / 2;
  const alturaFoto = 52;

  const desenharBloco = async (titulo: string, legenda: string, lista: EntregaFoto[]) => {
    if (!lista.length) return;
    if (y > pageH - 40) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(titulo, MARGIN, y);
    y += 4;
    if (legenda) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(legenda, MARGIN, y);
      doc.setTextColor(0);
      y += 4;
    }

    for (let i = 0; i < lista.length; i += 2) {
      if (y + alturaFoto > pageH - 18) {
        doc.addPage();
        y = MARGIN;
      }
      for (let c = 0; c < 2; c++) {
        const foto = lista[i + c];
        if (!foto?.url) continue;
        const dataUrl = await paraDataUrl(foto.url);
        if (!dataUrl) continue;
        const x = MARGIN + c * (larguraFoto + 6);
        try {
          doc.addImage(dataUrl, 'JPEG', x, y, larguraFoto, alturaFoto, undefined, 'FAST');
        } catch {
          /* imagem inválida — ignora */
        }
        if (foto.legenda) {
          doc.setFontSize(7.5);
          doc.text(doc.splitTextToSize(foto.legenda, larguraFoto), x, y + alturaFoto + 3.5);
        }
      }
      y += alturaFoto + 9;
    }
    y += 2;
  };

  for (const amb of ambientes) {
    const gerais = fotos.filter((f) => f.ambiente_id === amb.id && f.tipo === 'geral');
    await desenharBloco(amb.nome, amb.pavimento ? `Pavimento: ${amb.pavimento}` : '', gerais);

    const doAmbiente = pendencias.filter((p) => p.ambiente_id === amb.id);
    for (const p of doAmbiente) {
      const relacionadas = fotos.filter((f) => f.pendencia_id === p.id);
      await desenharBloco(
        `Pendência: ${p.titulo}`,
        `${IMPACTO_LABEL[p.impacto]} · ${RESPONSABILIDADE_LABEL[p.responsabilidade]} · ${SITUACAO_LABEL[p.situacao]}`,
        relacionadas,
      );
    }
  }

  const semAmbiente = fotos.filter((f) => !f.ambiente_id && !f.pendencia_id);
  await desenharBloco('Registros gerais', '', semAmbiente);

  if (fotos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhuma fotografia registrada nesta entrega.', MARGIN, y);
  }

  rodape(doc);
  doc.save(`relatorio-fotografico-entrega-${obra.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

/** Rótulo auxiliar reaproveitado nos anexos do termo. */
export const STATUS_TEXTO = STATUS_LABEL;
