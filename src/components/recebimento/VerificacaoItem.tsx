import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Verificacao } from '@/hooks/useRecebimentoChecklist';
import { STATUS_LABEL } from '@/lib/recebimento/constants';
import { STATUS_CHIP, STATUS_FG, STATUS_ICON } from '@/lib/recebimento/ui';

interface Props {
  verificacao: Verificacao;
  numero: string;
  fotos?: number;
  somenteLeitura?: boolean;
  onAbrir: (v: Verificacao) => void;
}

export function VerificacaoItem({ verificacao, numero, fotos = 0, somenteLeitura, onAbrir }: Props) {
  const Icon = STATUS_ICON[verificacao.status];
  return (
    <button
      type="button"
      disabled={somenteLeitura}
      onClick={() => onAbrir(verificacao)}
      className={cn(
        'flex w-full min-h-[52px] items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left last:border-0',
        somenteLeitura ? 'cursor-default' : 'hover:bg-muted/50',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', STATUS_FG[verificacao.status])} />
      <span className="min-w-0 flex-1 text-sm">
        <span className="text-muted-foreground">{numero} </span>
        {verificacao.descricao_snapshot}
      </span>
      {fotos > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          <Camera className="h-3 w-3" />
          {fotos}
        </span>
      )}
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
          STATUS_CHIP[verificacao.status],
        )}
      >
        {STATUS_LABEL[verificacao.status]}
      </span>
    </button>
  );
}
