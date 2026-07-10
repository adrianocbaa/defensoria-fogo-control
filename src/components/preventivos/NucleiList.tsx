import { cn } from '@/lib/utils';
import { NucleoCentral } from '@/hooks/useNucleosCentral';
import { StatusBadge, PreventivosStatus } from './StatusBadge';

interface NucleiListProps {
  nucleos: NucleoCentral[];
  statusMap: Record<string, PreventivosStatus>;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}

export function NucleiList({ nucleos, statusMap, selectedId, onSelect, onOpenDetails }: NucleiListProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-home-border px-5 py-4">
        <h3 className="text-base font-bold text-foreground">Núcleos</h3>
        <span className="inline-flex min-w-[28px] items-center justify-center rounded-full bg-home-sidebar-active px-2 py-0.5 text-xs font-bold text-home-sidebar-active-fg">
          {nucleos.length}
        </span>
      </div>

      <div className="max-h-[600px] flex-1 overflow-y-auto">
        {nucleos.length === 0 ? (
          <div className="p-6 text-center text-sm text-home-muted">Nenhum núcleo</div>
        ) : (
          <ul className="divide-y divide-home-border">
            {nucleos.map((n) => {
              const active = selectedId === n.id;
              const status: PreventivosStatus = statusMap[n.id] ?? 'gray';
              return (
                <li key={n.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(n.id)}
                    onDoubleClick={() => onOpenDetails?.(n.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors',
                      active ? 'bg-success/10' : 'hover:bg-home-bg',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 h-full w-1 bg-home-sidebar-bg" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{n.nome}</p>
                      <p className="truncate text-xs text-home-muted">{n.cidade}</p>
                    </div>
                    <StatusBadge status={status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
