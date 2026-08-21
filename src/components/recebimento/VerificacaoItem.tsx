import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Verificacao } from '@/hooks/useRecebimentoChecklist';
import { STATUS_CLASS, STATUS_LABEL, type VerificacaoStatus } from '@/lib/recebimento/constants';
import { STATUS_ICON } from '@/lib/recebimento/ui';

interface Props {
  verificacao: Verificacao;
  numero: string;
  fotos?: number;
  somenteLeitura?: boolean;
  onSelecionar: (v: Verificacao, status: VerificacaoStatus) => void;
}

const OPCOES: Exclude<VerificacaoStatus, 'nao_vistoriado'>[] = [
  'conforme',
  'nao_conforme',
  'nao_executado',
  'nao_aplica',
];

export function VerificacaoItem({
  verificacao,
  numero,
  fotos = 0,
  somenteLeitura,
  onSelecionar,
}: Props) {
  return (
    <div className="flex min-h-[58px] w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0">
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
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Resultado da verificação">
        {OPCOES.map((status) => {
          const Icon = STATUS_ICON[status];
          const selecionado = verificacao.status === status;
          return (
            <Button
              key={status}
              type="button"
              variant="outline"
              size="icon"
              disabled={somenteLeitura}
              aria-label={STATUS_LABEL[status]}
              aria-pressed={selecionado}
              title={STATUS_LABEL[status]}
              onClick={() => onSelecionar(verificacao, selecionado ? 'nao_vistoriado' : status)}
              className={cn(
                'h-9 w-9 rounded-full border-border text-muted-foreground',
                selecionado && STATUS_CLASS[status],
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
