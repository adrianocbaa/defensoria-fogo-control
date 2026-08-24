import {
  criarDocumentoSidif,
  GRAY_LABEL,
  GRAY_TEXT,
  MARGIN,
  type SidifDoc,
} from '@/lib/pdf/sidifPdf';
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

interface Args {
  entrega: EntregaVistoria;
  obra: { nome: string; contrato?: string | null; endereco?: string | null; empresa?: string | null };
  resumo: ResumoEntrega;
  ambientes: EntregaAmbiente[];
  participantes: EntregaParticipante[];
  pendencias: EntregaPendencia[];
  fotos: EntregaFoto[];
}

const SUBTITULO = 'Diretoria de Infraestrutura e Fiscalização — Entrega Institucional';

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

function identificacao(s: SidifDoc, obra: Args['obra'], entrega: EntregaVistoria) {
  s.section('Identificação');
  const linhas: [string, string, boolean?][][] = [
    [['Obra', obra.nome]],
    [
      ['Contrato', obra.contrato || '—'],
      ['Contratada', obra.empresa || '—'],
    ],
    [['Endereço', obra.endereco || '—']],
    [
      ['Data da entrega', formatarData(entrega.data)],
      [
        'Rec. definitivo',
        entrega.recebimento_definitivo_data
          ? formatarData(entrega.recebimento_definitivo_data)
          : '—',
      ],
    ],
  ];
  s.infoCard(linhas);
}

function nomeArquivo(prefixo: string, obraNome: string) {
  return `${prefixo}-${obraNome
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()}.pdf`;
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
  const s = criarDocumentoSidif({
    titulo: 'Termo de Entrega Institucional',
    subtitulo: SUBTITULO,
  });

  identificacao(s, obra, entrega);

  const resultado: Resultado = (entrega.resultado_congelado as Resultado) ?? resumo.resultado;
  s.section('Resultado da entrega');
  s.ensure(40);
  s.doc.setFillColor(232, 243, 237);
  s.doc.setDrawColor(26, 95, 63);
  s.doc.setLineWidth(0.8);
  s.doc.roundedRect(MARGIN, s.y, s.contentW, 30, 6, 6, 'FD');
  s.doc.setFont('helvetica', 'bold');
  s.doc.setFontSize(12);
  s.doc.setTextColor(26, 95, 63);
  s.doc.text(RESULTADO_LABEL[resultado], s.pageW / 2, s.y + 20, { align: 'center' });
  s.doc.setTextColor(...GRAY_TEXT);
  s.y += 38;

  s.text(TEXTO_CIENCIA, 9);

  s.section('Resumo da vistoria');
  s.table({
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
    columnStyles: { 1: { cellWidth: 90, halign: 'center' } },
  });

  const nomeAmbiente = (id: string | null) =>
    ambientes.find((a) => a.id === id)?.nome ?? 'Sem ambiente';

  const abertas = pendencias.filter((p) => p.situacao !== 'sanada' && p.situacao !== 'cancelada');
  if (abertas.length) {
    s.section('Ressalvas registradas');
    s.table({
      head: [['Ambiente', 'Pendência', 'Responsabilidade', 'Impacto', 'Situação']],
      body: abertas.map((p) => [
        nomeAmbiente(p.ambiente_id),
        p.titulo,
        RESPONSABILIDADE_LABEL[p.responsabilidade] +
          (p.responsavel_terceiro ? ` (${p.responsavel_terceiro})` : ''),
        IMPACTO_LABEL[p.impacto],
        SITUACAO_LABEL[p.situacao],
      ]),
      styles: { fontSize: 8, cellPadding: 3.4, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 90 },
        2: { cellWidth: 96 },
        3: { cellWidth: 62 },
        4: { cellWidth: 62 },
      },
    });
  }

  if (entrega.ciencia_em) {
    s.section('Ciência');
    s.text(`Ciência registrada em ${formatarDataHora(entrega.ciencia_em)}`, 9, true);
    if (entrega.ciencia_observacoes) {
      s.gap(4);
      s.boxText(entrega.ciencia_observacoes);
    }
  }

  s.section('Assinaturas');
  s.assinaturas(
    participantes.map((p) => ({
      nome: p.nome_snapshot,
      funcao: `${PAPEL_LABEL[p.papel] ?? p.papel}${
        p.funcao_snapshot ? ` — ${p.funcao_snapshot}` : ''
      }`,
    })),
  );

  s.finalizar();
  s.doc.save(nomeArquivo('termo-entrega-institucional', obra.nome));
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
  const s = criarDocumentoSidif({
    titulo: 'Relatório Fotográfico — Entrega Institucional',
    subtitulo: SUBTITULO,
  });

  identificacao(s, obra, entrega);

  s.section('Registros fotográficos');
  s.text(
    `${resumo.ambientes} ambiente(s) · ${fotos.length} registro(s) fotográfico(s) · ${participantes.length} participante(s)`,
    9,
  );
  s.gap(6);

  const larguraFoto = (s.contentW - 16) / 2;
  const alturaFoto = 150;

  const desenharBloco = async (titulo: string, legenda: string, lista: EntregaFoto[]) => {
    if (!lista.length) return;
    s.ensure(60);
    s.text(titulo, 9.5, true);
    if (legenda) {
      s.doc.setTextColor(...GRAY_LABEL);
      s.text(legenda, 8);
      s.doc.setTextColor(...GRAY_TEXT);
    }
    s.gap(4);

    for (let i = 0; i < lista.length; i += 2) {
      s.ensure(alturaFoto + 26);
      const linhaY = s.y;
      let maiorLegenda = 0;
      for (let c = 0; c < 2; c++) {
        const foto = lista[i + c];
        if (!foto?.url) continue;
        const dataUrl = await paraDataUrl(foto.url);
        if (!dataUrl) continue;
        const x = MARGIN + c * (larguraFoto + 16);
        try {
          s.doc.addImage(dataUrl, 'JPEG', x, linhaY, larguraFoto, alturaFoto, undefined, 'FAST');
          s.doc.setDrawColor(222, 229, 225);
          s.doc.setLineWidth(0.6);
          s.doc.rect(x, linhaY, larguraFoto, alturaFoto);
        } catch {
          /* imagem inválida — ignora */
        }
        if (foto.legenda) {
          s.doc.setFont('helvetica', 'normal');
          s.doc.setFontSize(7.5);
          s.doc.setTextColor(...GRAY_LABEL);
          const linhas = s.doc.splitTextToSize(foto.legenda, larguraFoto);
          s.doc.text(linhas, x, linhaY + alturaFoto + 11);
          s.doc.setTextColor(...GRAY_TEXT);
          maiorLegenda = Math.max(maiorLegenda, linhas.length * 9);
        }
      }
      s.y = linhaY + alturaFoto + 14 + maiorLegenda;
    }
    s.gap(6);
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
    s.text('Nenhuma fotografia registrada nesta entrega.', 9);
  }

  s.finalizar();
  s.doc.save(nomeArquivo('relatorio-fotografico-entrega', obra.nome));
}

/** Rótulo auxiliar reaproveitado nos anexos do termo. */
export const STATUS_TEXTO = STATUS_LABEL;
