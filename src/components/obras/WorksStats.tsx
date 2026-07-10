import { cn } from '@/lib/utils';
import { type ObraStatus } from '@/data/mockObras';

interface WorksStatsProps {
  total: number;
  emAndamento: number;
  concluidas: number;
  planejadas: number;
  paralisadas: number;
  activeStatus: ObraStatus[];
  onToggleStatus: (status: ObraStatus) => void;
}

interface StatCard {
  key: 'total' | ObraStatus;
  label: string;
  value: number;
  bar: string;
}

export function WorksStats({
  total,
  emAndamento,
  concluidas,
  planejadas,
  paralisadas,
  activeStatus,
  onToggleStatus,
}: WorksStatsProps) {
  const cards: StatCard[] = [
    { key: 'total', label: 'Total de Obras', value: total, bar: 'bg-primary' },
    { key: 'em_andamento', label: 'Em Andamento', value: emAndamento, bar: 'bg-blue-500' },
    { key: 'concluida', label: 'Concluídas', value: concluidas, bar: 'bg-green-500' },
    { key: 'planejada', label: 'Planejadas', value: planejadas, bar: 'bg-orange-500' },
    { key: 'paralisada', label: 'Paralisadas', value: paralisadas, bar: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const active = c.key !== 'total' && activeStatus.includes(c.key as ObraStatus);
        const clickable = c.key !== 'total';
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => clickable && onToggleStatus(c.key as ObraStatus)}
            disabled={!clickable}
            className={cn(
              'group relative flex items-stretch overflow-hidden rounded-xl border bg-card px-4 py-3 text-left transition-all',
              clickable && 'hover:border-primary/40 hover:shadow-sm cursor-pointer',
              !clickable && 'cursor-default',
              active && 'border-primary/60 ring-1 ring-primary/40',
            )}
          >
            <span className={cn('mr-3 w-1 shrink-0 rounded-full', c.bar)} />
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none text-foreground">{c.value}</p>
              <p className="mt-1 text-xs font-medium text-home-muted">{c.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
