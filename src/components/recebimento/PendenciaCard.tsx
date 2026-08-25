import { Camera, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Foto, Pendencia } from '@/hooks/useRecebimentoPendencias';
import { CLASSIFICACAO_LABEL, SITUACAO_LABEL } from '@/lib/recebimento/constants';
import { SITUACAO_CHIP, SITUACAO_ICON } from '@/lib/recebimento/ui';

interface Props {
  pendencia: Pendencia;
  ambienteNome: string;
  fotos: Foto[];
  ativa?: boolean;
  onClick: () => void;
}

export function PendenciaCard({ pendencia, ambienteNome, fotos, ativa, onClick }: Props) {
  const qtdFotos = fotos.filter((f) => f.pendencia_id === pendencia.id).length;
  const Icon = SITUACAO_ICON[pendencia.situacao];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativa ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
        ativa ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pendencia.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ambienteNome} · {CLASSIFICACAO_LABEL[pendencia.classificacao]}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
              SITUACAO_CHIP[pendencia.situacao],
            )}
          >
            <Icon className="h-3 w-3" />
            {SITUACAO_LABEL[pendencia.situacao]}
          </span>
          {qtdFotos > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Camera className="h-3 w-3" /> {qtdFotos}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
