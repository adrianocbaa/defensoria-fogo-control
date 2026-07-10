import { X } from 'lucide-react';
import { type ObraStatus } from '@/data/mockObras';
import { type FiltersData } from '@/components/ObrasFilters';
import { cn } from '@/lib/utils';

interface ActiveFiltersProps {
  filters: FiltersData;
  totalFiltered: number;
  totalAll: number;
  onRemoveStatus: (s: ObraStatus) => void;
  onRemoveTipo: (t: string) => void;
  onClearMunicipio: () => void;
  onClearAll: () => void;
}

const statusLabels: Record<ObraStatus, string> = {
  concluida: 'Concluída',
  em_andamento: 'Em Andamento',
  planejada: 'Planejada',
  paralisada: 'Paralisada',
};

const statusTone: Record<ObraStatus, string> = {
  concluida: 'border-green-300 bg-green-50 text-green-700',
  em_andamento: 'border-blue-300 bg-blue-50 text-blue-700',
  planejada: 'border-orange-300 bg-orange-50 text-orange-700',
  paralisada: 'border-red-300 bg-red-50 text-red-700',
};

function Chip({ className, onRemove, children }: { className?: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        className,
      )}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-current opacity-70 hover:opacity-100"
        aria-label="Remover filtro"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function ActiveFilters({
  filters,
  totalFiltered,
  totalAll,
  onRemoveStatus,
  onRemoveTipo,
  onClearMunicipio,
  onClearAll,
}: ActiveFiltersProps) {
  const hasAny = filters.status.length > 0 || filters.tipos.length > 0 || !!filters.municipio;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {filters.status.map((s) => (
          <Chip key={s} className={statusTone[s]} onRemove={() => onRemoveStatus(s)}>
            Status: {statusLabels[s]}
          </Chip>
        ))}
        {filters.tipos.map((t) => (
          <Chip key={t} className="border-emerald-300 bg-emerald-50 text-emerald-700" onRemove={() => onRemoveTipo(t)}>
            Tipo: {t}
          </Chip>
        ))}
        {filters.municipio && (
          <Chip className="border-emerald-300 bg-emerald-50 text-emerald-700" onRemove={onClearMunicipio}>
            Município: {filters.municipio}
          </Chip>
        )}
        {hasAny && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Limpar todos
          </button>
        )}
      </div>
      <p className="text-xs text-home-muted whitespace-nowrap">
        {totalFiltered} de {totalAll} obras exibidas
      </p>
    </div>
  );
}
