import {
  CLASSIFICACAO_LABEL,
  SITUACAO_LABEL,
  STATUS_LABEL,
  vistoriaTitulo,
} from '@/lib/recebimento/constants';
import { criarDocumentoSidif, GREEN, GRAY_LINE, MARGIN } from '@/lib/pdf/sidifPdf';
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
  const titulo = `Relatório de ${vistoriaTitulo(vistoria)}`;
  const sidif = criarDocumentoSidif({
    titulo,
    subtitulo: 'Diretoria de Infraestrutura e Fiscalização — Recebimento de Obra',
    numero: `Nº ${String(vistoria.sequencia).padStart(2, '0')}`,
  });
  const { doc } = sidif;

  // Identificação
  sidif.section('Identificação');
  sidif.infoCard([
    [['Obra', obra.nome]],
    [['Contrato', obra.contrato || '-'], ['Empresa', obra.empresa || '-']],
    [['Endereço', obra.endereco || '-']],
    [
      ['Data da vistoria', fmtData(vistoria.data)],
      [fiscalFuncao || 'Fiscal responsável', fiscalNome || '-'],
    ],
  ]);

  // Resumo
  const todas = ambientes.flatMap((a) => a.servicos.flatMap((s) => s.verificacoes));
  const cont = (st: string) => todas.filter((v) => v.status === st).length;
  const abertas = pendencias.filter((p) => !['sanada', 'cancelada'].includes(p.situacao)).length;

  sidif.section('Resumo da vistoria');
  sidif.table({
    head: [['Indicador', 'Quantidade']],
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
    columnStyles: { 1: { cellWidth: 90, halign: 'center' } },
  });

  // Checklist por ambiente
  sidif.section('Checklist por ambiente');
  for (const amb of ambientes) {
    const body = amb.servicos.flatMap((s) =>
      s.verificacoes.map((v) => [s.servico_snapshot, v.descricao_snapshot, STATUS_LABEL[v.status]]),
    );
    if (!body.length) continue;
    sidif.ensure(60);
    sidif.text(amb.nome + (amb.pavimento ? ` — ${amb.pavimento}` : ''), 9.5, true);
    sidif.gap(2);
    sidif.table({
      head: [['Serviço', 'Verificação', 'Situação']],
      body,
      styles: { fontSize: 8, cellPadding: 3.4 },
      columnStyles: { 0: { cellWidth: 130 }, 2: { cellWidth: 92 } },
    });
  }

  // Pendências
  if (pendencias.length) {
    const nomeAmbiente = (id: string | null | undefined) => {
      if (!id) return '-';
      const amb = ambientes.find((a) => a.id === id);
      if (!amb) return '-';
      return amb.nome + (amb.pavimento ? ` — ${amb.pavimento}` : '');
    };

    sidif.section('Pendências registradas');
    for (const p of pendencias) {
      const antes = fotos.find((f) => f.pendencia_id === p.id && f.tipo === 'ocorrencia');
      const depois = fotos.find((f) => f.pendencia_id === p.id && f.tipo === 'correcao');
      const temFoto = Boolean(antes?.url || depois?.url);
      // mantém quadro + fotos na mesma página
      sidif.ensure(temFoto ? 300 : 130);
      sidif.table({
        body: [
          ['Ambiente', nomeAmbiente((p as { ambiente_id?: string | null }).ambiente_id)],
          ['Pendência', p.titulo],
          ['Descrição', p.descricao || '-'],
          ['Classificação', CLASSIFICACAO_LABEL[p.classificacao]],
          ['Prazo', p.prazo_correcao ? fmtData(p.prazo_correcao) : '-'],
          ['Situação', SITUACAO_LABEL[p.situacao]],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 96, fillColor: [242, 247, 244] } },
      });

      if (temFoto) {
        const w = (sidif.contentW - 16) / 2;
        const h = 130;
        const y = sidif.y;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GREEN);
        doc.text('ANTES', MARGIN, y + 8);
        doc.text('DEPOIS', MARGIN + w + 16, y + 8);
        doc.setTextColor(70, 70, 70);
        const [a, d] = await Promise.all([
          antes?.url ? fetchDataUrl(antes.url) : null,
          depois?.url ? fetchDataUrl(depois.url) : null,
        ]);
        doc.setDrawColor(...GRAY_LINE);
        doc.setLineWidth(0.6);
        try {
          if (a) doc.addImage(a, 'JPEG', MARGIN, y + 13, w, h, undefined, 'FAST');
          if (d) doc.addImage(d, 'JPEG', MARGIN + w + 16, y + 13, w, h, undefined, 'FAST');
        } catch {
          /* imagem inválida — ignora */
        }
        if (a) doc.rect(MARGIN, y + 13, w, h);
        if (d) doc.rect(MARGIN + w + 16, y + 13, w, h);
        sidif.y = y + h + 26;
      } else {
        sidif.gap(6);
      }
    }
  }

  // Assinatura
  sidif.section('Responsável pela vistoria');
  sidif.assinaturas([
    {
      nome: fiscalNome || fiscalFuncao || 'Fiscal do Contrato',
      funcao: fiscalFuncao || 'Fiscal do Contrato',
      orgao: 'Defensoria Pública do Estado de Mato Grosso',
    },
  ]);

  sidif.finalizar();

  doc.save(
    `recebimento-${vistoria.tipo}-${String(vistoria.sequencia).padStart(2, '0')}-${obra.nome
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()}.pdf`,
  );
}
