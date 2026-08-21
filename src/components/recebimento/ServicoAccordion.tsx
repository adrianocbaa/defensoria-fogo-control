import { AlertTriangle, CheckCircle2, ChevronDown, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AmbienteServico, Verificacao } from '@/hooks/useRecebimentoChecklist';
import type { VerificacaoStatus } from '@/lib/recebimento/constants';
import { progressoServico } from '@/lib/recebimento/stats';
import { VerificacaoItem } from './VerificacaoItem';

interface Props {
  servico: AmbienteServico;
  indice: number;
  aberto: boolean;
  onToggle: () => void;
  somenteLeitura?: boolean;
  fotosPorVerificacao?: Record<string, number>;
  onSelecionarStatus: (v: Verificacao, status: VerificacaoStatus) => void;
  onMarcarPendentes: (servico: AmbienteServico) => void;
  onRemover?: (servicoId: string) => void;
}

export function ServicoAccordion({
  servico,
  indice,
  aberto,
  onToggle,
  somenteLeitura,
  fotosPorVerificacao = {},
  onSelecionarStatus,
  onMarcarPendentes,
  onRemover,
}: Props) {
  const p = progressoServico(servico);
  const naoConformes = p.naoConformes;
  const completo = p.total > 0 && p.feitas === p.total && naoConformes === 0;
  const pendentes = servico.verificacoes.filter((v) => v.status === 'nao_vistoriado');

  const tom = naoConformes > 0 ? 'pendencia' : completo ? 'conforme' : 'neutro';
  const barra =
    tom === 'pendencia' ? 'bg-destructive' : tom === 'conforme' ? 'bg-emerald-600' : 'bg-slate-400/60';

  const resumo =
    naoConformes > 0
      ? `${p.feitas}/${p.total} · ${naoConformes} pendência${naoConformes > 1 ? 's' : ''}`
      : completo
        ? `${p.feitas}/${p.total} Conforme`
        : `${p.feitas}/${p.total} vistoriados`;

  const ResumoIcon = naoConformes > 0 ? AlertTriangle : completo ? CheckCircle2 : Circle;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-colors',
        aberto && 'border-primary/50 ring-1 ring-primary/20',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-3 text-left',
          aberto ? 'bg-primary/5' : 'hover:bg-muted/40',
        )}
      >
        <span className={cn('h-6 w-1 shrink-0 rounded-full', barra)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold uppercase tracking-wide">
            {servico.servico_snapshot}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {servico.macro_snapshot}
          </span>
        </span>
        <span
          className={cn(
            'hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:flex',
            naoConformes > 0
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : completo
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
          )}
        >
          <ResumoIcon className="h-3.5 w-3.5" />
          {resumo}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            aberto && 'rotate-180',
          )}
        />
      </button>

      <div className="px-3 pb-2 sm:hidden">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            naoConformes > 0
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : completo
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
          )}
        >
          <ResumoIcon className="h-3.5 w-3.5" />
          {resumo}
        </span>
      </div>

      {aberto && (
        <div className="border-t bg-background/60">
          {servico.verificacoes.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma verificação cadastrada para este serviço.
            </p>
          )}
          {servico.verificacoes.map((v, i) => (
            <VerificacaoItem
              key={v.id}
              verificacao={v}
              numero={`${indice}.${i + 1}`}
              fotos={fotosPorVerificacao[v.id] ?? 0}
              somenteLeitura={somenteLeitura}
              onSelecionar={onSelecionarStatus}
            />
          ))}

          {!somenteLeitura && (
            <div className="flex items-center gap-2 p-3">
              <Button
                variant="secondary"
                className="h-11 flex-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                disabled={pendentes.length === 0}
                onClick={() => onMarcarPendentes(servico)}
              >
                Marcar pendentes como Conforme
              </Button>
              {onRemover && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-muted-foreground"
                  onClick={() => onRemover(servico.id)}
                  aria-label="Remover serviço"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
