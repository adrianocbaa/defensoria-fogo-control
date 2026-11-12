import { Link, NavLink, useParams } from 'react-router-dom';
import { ArrowLeft, Ban } from 'lucide-react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAvaliacao } from '@/components/avaliacoes/useAvaliacao';
import { STAGE_LABEL, STATUS_LABEL, TIPO_LABEL } from '@/lib/avaliacao/labels';
import { ResumoBlock } from '@/components/avaliacoes/blocks/ResumoBlock';
import { DadosBlock } from '@/components/avaliacoes/blocks/DadosBlock';
import { ImovelBlock } from '@/components/avaliacoes/blocks/ImovelBlock';
import { MercadoBlock } from '@/components/avaliacoes/blocks/MercadoBlock';
import { ModelagemBlock } from '@/components/avaliacoes/blocks/ModelagemBlock';
import { ValidacaoBlock } from '@/components/avaliacoes/blocks/ValidacaoBlock';
import { ResultadoBlock } from '@/components/avaliacoes/blocks/ResultadoBlock';
import { LaudoBlock } from '@/components/avaliacoes/blocks/LaudoBlock';
import { DocumentosBlock } from '@/components/avaliacoes/blocks/DocumentosBlock';
import { HistoricoBlock } from '@/components/avaliacoes/blocks/HistoricoBlock';

const NAV = [
  { key: '', label: 'Resumo' },
  { key: 'dados', label: 'Dados', bloco: 'DADOS' },
  { key: 'imovel', label: 'Imóvel', bloco: 'IMOVEL' },
  { key: 'mercado', label: 'Mercado', bloco: 'MERCADO' },
  { key: 'modelagem', label: 'Modelagem', bloco: 'MODELAGEM' },
  { key: 'validacao', label: 'Validação', bloco: 'VALIDACAO' },
  { key: 'resultado', label: 'Resultado', bloco: 'RESULTADO' },
  { key: 'laudo', label: 'Laudo', bloco: 'LAUDO' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'historico', label: 'Histórico' },
];

const DOT: Record<string, string> = {
  PRONTA: 'bg-primary', EM_ANDAMENTO: 'bg-accent-foreground/60', PENDENTE: 'bg-muted-foreground/50',
  BLOQUEADA: 'bg-border', DESATUALIZADA: 'bg-destructive',
};

export default function AvaliacaoWorkspace() {
  const { id, bloco = '' } = useParams();
  const ctx = useAvaliacao(id);
  const av = ctx.avaliacao.data;
  const pend = new Map((ctx.pendencias.data ?? []).map((p) => [p.bloco, p.estado]));

  if (ctx.avaliacao.isLoading) return <SimpleHeader><p className="container mx-auto px-4 py-8 text-sm text-muted-foreground">Carregando…</p></SimpleHeader>;
  if (!av) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-muted-foreground">Avaliação não encontrada ou fora da sua organização.</p>
          <Button asChild variant="outline"><Link to="/avaliacoes">Voltar para Avaliações</Link></Button>
        </div>
      </SimpleHeader>
    );
  }

  const content = (() => {
    switch (bloco) {
      case 'dados': return <DadosBlock ctx={ctx} />;
      case 'imovel': return <ImovelBlock ctx={ctx} />;
      case 'mercado': return <MercadoBlock ctx={ctx} />;
      case 'modelagem': return <ModelagemBlock ctx={ctx} />;
      case 'validacao': return <ValidacaoBlock ctx={ctx} />;
      case 'resultado': return <ResultadoBlock ctx={ctx} />;
      case 'laudo': return <LaudoBlock ctx={ctx} />;
      case 'documentos': return <DocumentosBlock ctx={ctx} />;
      case 'historico': return <HistoricoBlock ctx={ctx} />;
      default: return <ResumoBlock ctx={ctx} />;
    }
  })();

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <Link to="/avaliacoes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" />Avaliações</Link>
            <h1 className="text-2xl font-bold tracking-tight">Avaliação {av.codigo}{av.versao_atual > 0 ? ` — Revisão ${String(av.versao_atual).padStart(2, '0')}` : ''}</h1>
            <p className="text-sm text-muted-foreground">{TIPO_LABEL[av.tipo]} · {av.tipo_imovel} · {av.municipio_nome}/{av.uf}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={av.status === 'ATIVA' ? 'default' : av.status === 'CONCLUIDA' ? 'secondary' : 'outline'}>{STATUS_LABEL[av.status]}</Badge>
            <Badge variant="outline">{STAGE_LABEL[av.stage]}</Badge>
          </div>
        </div>
        {av.status === 'CANCELADA' && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"><Ban className="h-4 w-4 text-destructive" />Avaliação cancelada: {av.cancelado_motivo}</div>
        )}
        {av.status === 'CONCLUIDA' && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">Laudo emitido. Os dados ficam somente para consulta; para corrigir, crie uma revisão no bloco Laudo.</div>
        )}
        <nav aria-label="Blocos da avaliação" className="flex gap-1 overflow-x-auto border-b pb-px">
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              end={n.key === ''}
              to={`/avaliacoes/${id}${n.key ? `/${n.key}` : ''}`}
              className={({ isActive }) => cn('inline-flex items-center gap-2 whitespace-nowrap rounded-t-md px-3 py-2 text-sm border-b-2 -mb-px',
                isActive ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {n.bloco && <span aria-hidden className={cn('h-2 w-2 rounded-full', DOT[pend.get(n.bloco) ?? 'PENDENTE'])} />}
              {n.label}
            </NavLink>
          ))}
        </nav>
        {content}
      </div>
    </SimpleHeader>
  );
}
