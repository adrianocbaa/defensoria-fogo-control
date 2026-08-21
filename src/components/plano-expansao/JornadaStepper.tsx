import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JORNADAS, type JornadaTipo } from '@/lib/planoExpansao';

interface Props {
  jornada: JornadaTipo;
  etapaIndex: number;
  compact?: boolean;
}

export function JornadaStepper({ jornada, etapaIndex, compact }: Props) {
  const etapas = JORNADAS[jornada]?.etapas ?? [];
  return (
    <div className={cn('flex w-full items-start', compact && 'text-xs')}>
      {etapas.map((etapa, idx) => {
        const concluida = idx < etapaIndex;
        const atual = idx === etapaIndex;
        return (
          <div key={etapa} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  'h-0.5 flex-1',
                  idx === 0 ? 'bg-transparent' : concluida || atual ? 'bg-emerald-600' : 'bg-muted'
                )}
              />
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                  concluida
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : atual
                      ? 'border-emerald-600 bg-background text-emerald-600'
                      : 'border-muted bg-background text-muted-foreground'
                )}
              >
                {concluida ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </div>
              <div
                className={cn(
                  'h-0.5 flex-1',
                  idx === etapas.length - 1 ? 'bg-transparent' : concluida ? 'bg-emerald-600' : 'bg-muted'
                )}
              />
            </div>
            <span
              className={cn(
                'mt-1 text-center text-[11px] leading-tight',
                atual ? 'font-semibold text-emerald-700' : 'text-muted-foreground'
              )}
            >
              {etapa}
            </span>
          </div>
        );
      })}
    </div>
  );
}
