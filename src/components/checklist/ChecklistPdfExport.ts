import {
  criarDocumentoSidif,
  GRAY_LABEL,
  GRAY_LINE,
  GRAY_TEXT,
  GREEN,
  MARGIN,
  type SidifDoc,
} from '@/lib/pdf/sidifPdf';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';
import type { ChecklistOcorrencia } from '@/hooks/useChecklistOcorrencias';
import {
  gravidadeCor,
  gravidadeLabel,
  montarPendencias,
  resumir,
  resumoGravidade,
  statusCor,
  statusLabel,
  type PendenciaPdf,
} from '@/lib/pdf/checklist/pendencias';
import { carregarImagem, desenharFotos, layoutFotos } from '@/lib/pdf/checklist/fotos';
import { desenharPlanta } from '@/lib/pdf/checklist/planta';

export interface ChecklistReportMeta {
  obraId: string;
  nomeObra: string;
  municipio: string;
  empresa: string;
  nContrato?: string | null;
  fiscal?: string;
  dataRelatorio: string;
  pdfNomeArquivo: string;
  pdfUrl?: string;
  totalPaginasPdf?: number;
  prazoCorrecao?: number | null;
  /** Campos ainda sem persistência — exibidos apenas quando houver fonte real. */
  numeroRelatorio?: string | null;
  revisao?: string | null;
  tipoRelatorio?: string | null;
}

const SUBTITULO = 'Diretoria de Infraestrutura Física';

// ── Capa ────────────────────────────────────────────────────────────────────

async function desenharCapa(s: SidifDoc, meta: ChecklistReportMeta) {
  const { doc, pageW, pageH } = s;

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 10, 'F');
  doc.rect(0, pageH - 10, pageW, 10, 'F');

  const logo = await carregarImagem('/images/logo-dpe-mt.png');
  let y = 110;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const w = 86;
      const h = (props.height / props.width) * w;
      doc.addImage(logo, 'PNG', (pageW - w) / 2, y, w, h, undefined, 'FAST');
      y += h + 28;
    } catch {
      y += 10;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text('DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', pageW / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(SUBTITULO, pageW / 2, y + 18, { align: 'center' });

  y += 90;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.2);
  doc.line(MARGIN + 80, y, pageW - MARGIN - 80, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('RELATÓRIO DE VISTORIA', pageW / 2, y + 38, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_LABEL);
  doc.text('Sistema Integrado da Diretoria de Infraestrutura Física — SiDIF', pageW / 2, y + 58, {
    align: 'center',
  });

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.2);
  doc.line(MARGIN + 80, y + 76, pageW - MARGIN - 80, y + 76);

  // Bloco de dados da capa
  const linhas: [string, string][] = [
    ['Obra', meta.nomeObra],
    ['Município', meta.municipio || '—'],
    ['Contratada', meta.empresa || '—'],
    ...(meta.nContrato ? ([['Contrato', meta.nContrato]] as [string, string][]) : []),
    ...(meta.numeroRelatorio ? ([['Relatório nº', meta.numeroRelatorio]] as [string, string][]) : []),
    ...(meta.revisao ? ([['Revisão', meta.revisao]] as [string, string][]) : []),
    ...(meta.tipoRelatorio ? ([['Tipo de relatório', meta.tipoRelatorio]] as [string, string][]) : []),
    ['Data de emissão', meta.dataRelatorio],
  ];

  let by = y + 120;
  const boxX = MARGIN + 40;
  const boxW = pageW - (MARGIN + 40) * 2;
  const valorX = boxX + 140;
  const valorW = boxW - 156;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  const medidas = linhas.map(([k, v]) => ({
    k,
    lines: doc.splitTextToSize(v || '—', valorW) as string[],
  }));
  const boxH = medidas.reduce((acc, m) => acc + Math.max(1, m.lines.length) * 13 + 7, 0) + 24;
  doc.setFillColor(248, 251, 249);
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.6);
  doc.rect(boxX, by, boxW, boxH, 'FD');
  by += 24;
  medidas.forEach((m) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(m.k.toUpperCase(), boxX + 16, by);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    m.lines.forEach((ln, i) => doc.text(ln, valorX, by + i * 13));
    by += m.lines.length * 13 + 7;
  });


  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_LABEL);
  doc.text('Documento de uso interno', pageW / 2, pageH - 34, { align: 'center' });
  doc.setTextColor(...GRAY_TEXT);
}

// ── Blocos auxiliares ───────────────────────────────────────────────────────

function rotuloValor(s: SidifDoc, rotulo: string, valor: string, x: number, y: number, largura: number) {
  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(7.5);
  s.doc.setTextColor(...GRAY_LABEL);
  s.doc.text(rotulo.toUpperCase(), x, y);
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(9);
  s.doc.setTextColor(50, 50, 50);
  s.doc.text(s.doc.splitTextToSize(valor, largura)[0] as string, x, y + 12);
  s.doc.setTextColor(...GRAY_TEXT);
}

function cabecalhoAmbiente(s: SidifDoc, nome: string, resumo: string, continuacao = false) {
  s.ensure(46);
  s.doc.setFillColor(...GREEN);
  s.doc.rect(MARGIN, s.y, 3.5, 26, 'F');
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(11);
  s.doc.setTextColor(40, 40, 40);
  const titulo = continuacao ? `Ambiente: ${nome} — Continuação` : nome.toUpperCase();
  s.doc.text(titulo, MARGIN + 12, s.y + 11);
  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(8.5);
  s.doc.setTextColor(...GRAY_LABEL);
  s.doc.text(resumo, MARGIN + 12, s.y + 23);
  s.doc.setDrawColor(...GRAY_LINE);
  s.doc.setLineWidth(0.6);
  s.doc.line(MARGIN, s.y + 30, s.pageW - MARGIN, s.y + 30);
  s.doc.setTextColor(...GRAY_TEXT);
  s.y += 40;
}

function alturaTexto(s: SidifDoc, texto: string, largura: number, size = 9) {
  s.doc.setFontSize(size);
  return (s.doc.splitTextToSize(texto, largura) as string[]).length * (size * 1.35);
}

function blocoTexto(s: SidifDoc, rotulo: string, texto: string) {
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(8);
  s.doc.setTextColor(...GREEN);
  s.doc.text(rotulo.toUpperCase(), MARGIN, s.y + 8);
  s.doc.setTextColor(...GRAY_TEXT);
  s.y += 14;
  s.text(texto, 9);
  s.gap(4);
}

/** Cabeçalho da pendência (usado também nas continuações). */
function cabecalhoPendencia(s: SidifDoc, p: PendenciaPdf, continuacao = false) {
  s.doc.setFillColor(248, 251, 249);
  s.doc.setDrawColor(...GRAY_LINE);
  s.doc.setLineWidth(0.6);
  s.doc.rect(MARGIN, s.y, s.contentW, 34, 'FD');

  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(10);
  s.doc.setTextColor(...GREEN);
  s.doc.text(p.codigo, MARGIN + 10, s.y + 15);

  s.doc.setTextColor(40, 40, 40);
  const tituloMax = s.contentW - 240;
  const titulo = continuacao ? `${p.titulo} — Continuação` : p.titulo;
  s.doc.text(s.doc.splitTextToSize(titulo, tituloMax)[0] as string, MARGIN + 52, s.y + 15);

  // indicadores discretos de gravidade e situação
  const [gr, gg, gb] = gravidadeCor(p.gravidade);
  const [sr, sg, sb] = statusCor(p.status);
  const dirX = s.pageW - MARGIN - 10;
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(8);
  s.doc.setTextColor(sr, sg, sb);
  const statusTxt = statusLabel(p.status);
  s.doc.text(statusTxt, dirX, s.y + 15, { align: 'right' });
  const wStatus = s.doc.getTextWidth(statusTxt);
  s.doc.setTextColor(gr, gg, gb);
  const gravTxt = gravidadeLabel(p.gravidade);
  s.doc.text(gravTxt, dirX - wStatus - 14, s.y + 15, { align: 'right' });
  s.doc.setFillColor(gr, gg, gb);
  s.doc.circle(dirX - wStatus - 18 - s.doc.getTextWidth(gravTxt), s.y + 12, 2.6, 'F');

  s.doc.setFont('helvetica', 'normal');
  s.doc.setFontSize(8);
  s.doc.setTextColor(...GRAY_LABEL);
  const meta = [
    `Ambiente: ${p.ambienteNome}`,
    `Serviço: ${resumir(p.servico, 60)}`,
    p.local ? `Local: ${p.local}` : null,
    p.pin ? `Pin ${p.pin}` : null,
  ]
    .filter(Boolean)
    .join('   ·   ');
  s.doc.text(s.doc.splitTextToSize(meta, s.contentW - 20)[0] as string, MARGIN + 10, s.y + 27);
  s.doc.setTextColor(...GRAY_TEXT);
  s.y += 42;
}

/** Bloco completo de uma pendência, com paginação inteligente. */
async function desenharPendencia(s: SidifDoc, p: PendenciaPdf, ambienteResumo: string) {
  const situacao = p.situacao || '—';
  const correcao = p.correcaoSolicitada?.trim() || '—';

  const alturaTextual =
    42 + 14 + alturaTexto(s, situacao, s.contentW) + 4 + 14 + alturaTexto(s, correcao, s.contentW) + 8;
  const lay = layoutFotos(p.fotos.length, s.contentW);
  const primeiraLinhaFotos = p.fotos.length ? lay.alturaLinha : 16;

  // mantém título + descrições + primeira linha de fotos juntos
  if (s.y + alturaTextual + primeiraLinhaFotos > s.bottomLimit) {
    s.novaPagina();
    cabecalhoAmbiente(s, p.ambienteNome, ambienteResumo, true);
  }

  cabecalhoPendencia(s, p);
  blocoTexto(s, 'Situação identificada', situacao);
  blocoTexto(s, 'Correção solicitada', correcao);

  await desenharFotos(s, p.fotos, () => {
    cabecalhoAmbiente(s, p.ambienteNome, ambienteResumo, true);
    cabecalhoPendencia(s, p, true);
  });

  s.gap(10);
}

// ── Exportação principal ────────────────────────────────────────────────────

export async function exportChecklistPdf(
  meta: ChecklistReportMeta,
  ambientes: ChecklistAmbiente[],
  ocorrenciasPorServico?: Record<string, ChecklistOcorrencia[]>,
) {
  const s = criarDocumentoSidif({
    titulo: 'Relatório de Vistoria',
    subtitulo: SUBTITULO,
    primeiraPaginaCapa: true,
    rodapeTexto: `SiDIF · ${meta.nomeObra} · Documento de uso interno`,
  });

  await desenharCapa(s, meta);
  s.novaPagina();

  // 1. Identificação da vistoria
  s.section('Identificação da vistoria');
  s.infoCard([
    [['Obra', meta.nomeObra]],
    [
      ['Município', meta.municipio || '—'],
      ['Contrato', meta.nContrato || '—'],
    ],
    [
      ['Contratada', meta.empresa || '—'],
      ['Fiscal responsável', meta.fiscal || '—'],
    ],
    [
      ['Data de emissão', meta.dataRelatorio],
      ['Projeto de referência', meta.pdfNomeArquivo || '—'],
    ],
  ]);

  // 2. Resumo
  const servicos = ambientes.flatMap((a) => a.servicos);
  const pendencias = montarPendencias(ambientes, ocorrenciasPorServico);
  const grav = resumoGravidade(pendencias);
  const aprovados = servicos.filter((v) => v.status === 'aprovado').length;
  const reprovados = servicos.filter((v) => v.status === 'reprovado').length;
  const pendentes = servicos.filter((v) => v.status === 'pendente').length;

  s.section('Resumo da vistoria');
  s.table({
    head: [['Indicador', 'Quantidade']],
    body: [
      ['Ambientes vistoriados', String(ambientes.length)],
      ['Verificações realizadas', String(servicos.length)],
      ['Verificações aprovadas', String(aprovados)],
      ['Verificações reprovadas', String(reprovados)],
      ['Verificações pendentes', String(pendentes)],
      ['Pendências registradas', String(grav.total)],
      ['Pendências de gravidade crítica', String(grav.criticas)],
      ['Pendências de gravidade média', String(grav.medias)],
      ['Pendências de gravidade baixa / estética', String(grav.baixas)],
    ],
    columnStyles: { 1: { cellWidth: 90, halign: 'center' } },
  });

  // 3. Planta de localização
  await desenharPlanta(s, ambientes, meta.pdfUrl, meta.totalPaginasPdf);

  // 4. Quadro geral de pendências
  s.section('Quadro geral de pendências');
  if (pendencias.length) {
    s.table({
      head: [['Nº', 'Ambiente', 'Serviço', 'Descrição resumida', 'Gravidade', 'Situação']],
      body: pendencias.map((p) => [
        p.codigo,
        p.ambienteNome,
        resumir(p.servico, 46),
        resumir(p.situacao, 70),
        gravidadeLabel(p.gravidade),
        statusLabel(p.status),
      ]),
      styles: { fontSize: 7.8, cellPadding: 3.2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 84 },
        2: { cellWidth: 96 },
        4: { cellWidth: 62 },
        5: { cellWidth: 56 },
      },
    });
  } else {
    s.text('Nenhuma pendência registrada nesta vistoria.', 9);
  }

  // 5. Pendências por ambiente
  s.section('Pendências por ambiente');
  for (const amb of ambientes) {
    const doAmbiente = pendencias.filter((p) => p.ambienteId === amb.id);
    const r = resumoGravidade(doAmbiente);
    const resumoTxt = `${r.total} pendência(s) · ${r.criticas} crítica(s) · ${r.medias} média(s) · ${r.baixas} baixa(s)`;

    cabecalhoAmbiente(s, amb.nome, resumoTxt);

    // Checklist do ambiente (dados atuais preservados)
    const verificacoes = [...amb.servicos].sort((a, b) => a.ordem - b.ordem);
    if (verificacoes.length) {
      s.table({
        head: [['Verificação', 'Gravidade', 'Situação']],
        body: verificacoes.map((v) => [v.descricao, gravidadeLabel(v.gravidade), statusLabel(v.status)]),
        styles: { fontSize: 8, cellPadding: 3.2, overflow: 'linebreak' },
        columnStyles: { 1: { cellWidth: 80 }, 2: { cellWidth: 70 } },
      });
    } else {
      s.text('Nenhuma verificação cadastrada neste ambiente.', 9);
    }

    if (!doAmbiente.length) {
      s.text('Nenhuma pendência registrada neste ambiente.', 9);
      s.gap(8);
      continue;
    }

    s.gap(6);
    for (const p of doAmbiente) {
      await desenharPendencia(s, p, resumoTxt);
    }
  }

  // 6. Conclusão
  s.section('Conclusão');
  s.text(
    pendencias.length
      ? `Foram vistoriados ${ambientes.length} ambiente(s), com ${servicos.length} verificação(ões) realizada(s) e ${pendencias.length} pendência(s) registrada(s), das quais ${grav.criticas} de gravidade crítica. As pendências relacionadas neste relatório devem ser tratadas pela contratada e serão objeto de verificação pela fiscalização em vistoria posterior.`
      : `Foram vistoriados ${ambientes.length} ambiente(s), com ${servicos.length} verificação(ões) realizada(s). Não foram registradas pendências nesta vistoria.`,
    9,
  );

  // 7. Situação consolidada
  s.section('Situação consolidada');
  s.table({
    head: [['Gravidade', 'Aprovadas', 'Reprovadas', 'Pendentes', 'Total']],
    body: (['critico', 'medio', 'estetico'] as const).map((g) => {
      const lista = pendencias.filter((p) =>
        g === 'medio' ? !p.gravidade || p.gravidade === 'medio' : p.gravidade === g,
      );
      return [
        gravidadeLabel(g),
        String(lista.filter((p) => p.status === 'aprovado').length),
        String(lista.filter((p) => p.status === 'reprovado').length),
        String(lista.filter((p) => p.status === 'pendente').length),
        String(lista.length),
      ];
    }),
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // 8. Assinaturas
  s.section('Assinaturas');
  s.assinaturas([
    {
      nome: meta.fiscal || 'Fiscal do Contrato',
      funcao: 'Fiscal do Contrato',
      orgao: 'Defensoria Pública do Estado de Mato Grosso',
    },
    { nome: meta.empresa || 'Contratada', funcao: 'Responsável Técnico da Contratada' },
  ]);

  s.finalizar();
  s.doc.save(`relatorio-vistoria-${meta.obraId}-${Date.now()}.pdf`);
}
