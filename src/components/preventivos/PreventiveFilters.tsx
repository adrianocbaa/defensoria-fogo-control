import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PreventivosStatusFilter = 'all' | 'green' | 'orange' | 'red';

interface PreventiveFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: PreventivosStatusFilter;
  onStatusFilterChange: (v: PreventivosStatusFilter) => void;
  onClear: () => void;
  visibleCount: number;
  totalCount: number;
}

const OPTIONS: { key: PreventivosStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'green', label: 'Regularizados' },
  { key: 'orange', label: 'Vencendo' },
  { key: 'red', label: 'Irregulares' },
];

export function PreventiveFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onClear,
  visibleCount,
  totalCount,
}: PreventiveFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 lg:flex-1">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-home-muted" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar por nome ou cidade"
            className="h-11 rounded-full border-home-border bg-card pl-11 pr-5 text-sm focus-visible:ring-primary/40"
          />
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          {OPTIONS.map((opt) => {
            const active = statusFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onStatusFilterChange(opt.key)}
                className={cn(
                  'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-home-sidebar-active bg-home-sidebar-active text-home-sidebar-active-fg shadow-sm'
                    : 'border-home-border bg-card text-foreground hover:bg-home-bg',
                )}
              >
                {opt.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onClear}
            className="ml-1 h-9 shrink-0 px-2 text-sm font-semibold text-warning hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <p className="text-sm text-home-muted shrink-0">
        Exibindo {visibleCount} de {totalCount} núcleos
      </p>
    </div>
  );
}
