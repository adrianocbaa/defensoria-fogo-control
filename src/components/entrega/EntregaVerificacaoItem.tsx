import { cn } from '@/lib/utils';
import { STATUS_CURTO, type VerificacaoStatus } from '@/lib/entrega/constants';
import { STATUS_CHIP, STATUS_FG, STATUS_ICON } from '@/lib/entrega/ui';
import type { EntregaVerificacao } from '@/hooks/useEntregaInstitucional';

interface Props {
  verificacao: EntregaVerificacao;
  temPendenciaAberta?: boolean;
  somenteLeitura?: boolean;
  onClick: () => void;
}

export function EntregaVerificacaoItem({
  verificacao: v,
  temPendenciaAberta,
  somenteLeitura,
  onClick,
}: Props) {
  const status = v.status as VerificacaoStatus;
  const Icon = STATUS_ICON[status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={somenteLeitura}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        somenteLeitura ? 'cursor-default' : 'hover:bg-muted/50',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', STATUS_FG[status])} />
      <span className="min-w-0 flex-1 text-sm">{v.descricao_snapshot}</span>
      {temPendenciaAberta && (
        <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
          Pendência
        </span>
      )}
      {!temPendenciaAberta && status !== 'nao_vistoriado' && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            STATUS_CHIP[status],
          )}
        >
          {STATUS_CURTO[status]}
        </span>
      )}
    </button>
  );
}
