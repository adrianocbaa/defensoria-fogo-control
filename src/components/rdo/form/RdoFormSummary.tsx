import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepMeta } from './RdoFormStepper';
import { STEPS } from '@/components/rdo/RdoStepper';

interface Props {
  progressPct: number;
  dataFormatada: string;
  fiscalNome?: string;
  climaResumido?: string;
  meta: StepMeta[];
  pendencias: string[];
}

export function RdoFormSummary({
  progressPct,
  dataFormatada,
  fiscalNome,
  climaResumido,
  meta,
  pendencias,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <aside className="hidden xl:block sticky top-[calc(4rem+3.75rem)] w-[300px] shrink-0 space-y-4 self-start">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Resumo do RDO
        </p>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Progresso Geral</span>
          <span className={cn('text-sm font-semibold', clamped >= 100 ? 'text-emerald-600' : 'text-foreground')}>
            {clamped}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              clamped >= 100 ? 'bg-emerald-600' : clamped >= 60 ? 'bg-emerald-500' : 'bg-amber-500',
            )}
            style={{ width: `${clamped}%` }}
          />
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Data:</dt>
            <dd className="font-medium">{dataFormatada}</dd>
          </div>
          {fiscalNome && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground shrink-0">Fiscal:</dt>
              <dd className="font-medium truncate text-right">{fiscalNome}</dd>
            </div>
          )}
          {climaResumido && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground shrink-0">Clima:</dt>
              <dd className="font-medium text-right">{climaResumido}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Seções
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {STEPS.map((step, i) => {
            const m = meta[i] ?? { status: 'idle' as const };
            const dotClass =
              m.status === 'done'
                ? 'bg-emerald-500'
                : m.status === 'warn'
                ? 'bg-rose-500'
                : m.status === 'active'
                ? 'bg-blue-500'
                : 'bg-muted-foreground/40';
            return (
              <li key={step.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground/85">{step.label}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{m.detail ?? '—'}</span>
                  <span className={cn('h-2 w-2 rounded-full', dotClass)} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {pendencias.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/50 p-5 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5" />
            Pendências ({pendencias.length})
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {pendencias.map((p, i) => (
              <li
                key={i}
                className="rounded-md bg-white/70 dark:bg-rose-950/40 px-3 py-2 text-rose-800 dark:text-rose-200"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
