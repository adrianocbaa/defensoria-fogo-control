import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { type ObraStatus } from '@/data/mockObras';
import { type FiltersData } from '@/components/ObrasFilters';
import { cn } from '@/lib/utils';

interface WorksFiltersProps {
  value: FiltersData;
  onChange: (next: FiltersData) => void;
  availableTypes: string[];
  availableMunicipios: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  loading?: boolean;
}

const statusOptions: { value: ObraStatus; label: string; dot: string }[] = [
  { value: 'concluida', label: 'Concluída', dot: 'bg-green-500' },
  { value: 'em_andamento', label: 'Em andamento', dot: 'bg-blue-500' },
  { value: 'planejada', label: 'Planejada', dot: 'bg-orange-500' },
  { value: 'paralisada', label: 'Paralisada', dot: 'bg-red-500' },
];

export function WorksFilters({
  value,
  onChange,
  availableTypes,
  availableMunicipios,
  collapsed,
  onToggleCollapsed,
  loading,
}: WorksFiltersProps) {
  const toggleStatus = (s: ObraStatus, checked: boolean) => {
    onChange({
      ...value,
      status: checked ? [...value.status, s] : value.status.filter((v) => v !== s),
    });
  };

  const toggleTipo = (t: string, checked: boolean) => {
    onChange({
      ...value,
      tipos: checked ? [...value.tipos, t] : value.tipos.filter((v) => v !== t),
    });
  };

  const setMunicipio = (m: string) => onChange({ ...value, municipio: m });

  const clearAll = () => onChange({ status: [], tipos: [], municipio: '' });

  if (collapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 items-start justify-center border-r border-home-border bg-card pt-4">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md p-2 text-home-muted hover:bg-home-bg hover:text-foreground"
          aria-label="Abrir filtros"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-home-border bg-card lg:w-80">
      <div className="flex items-center justify-between border-b border-home-border px-4 py-3">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-home-muted hover:bg-home-bg hover:text-foreground"
          aria-label="Recolher filtros"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-xs text-home-muted">Carregando…</p>
        ) : (
          <>
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-home-muted">Status da obra</p>
              <div className="space-y-2">
                {statusOptions.map((o) => {
                  const checked = value.status.includes(o.value);
                  return (
                    <label key={o.value} className="flex cursor-pointer items-center gap-3 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleStatus(o.value, c as boolean)}
                      />
                      <span className={cn('h-2 w-2 rounded-full', o.dot)} />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {availableTypes.length > 0 && (
              <section className="mt-6 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-home-muted">Tipo de obra</p>
                <div className="space-y-2">
                  {availableTypes.map((t) => {
                    const checked = value.tipos.includes(t);
                    return (
                      <label key={t} className="flex cursor-pointer items-center gap-3 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleTipo(t, c as boolean)}
                        />
                        <span>{t}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-home-muted">Município</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-home-muted" />
                <Input
                  value={value.municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Buscar município..."
                  className="pl-9"
                  list="obras-municipios-list"
                />
                <datalist id="obras-municipios-list">
                  {availableMunicipios.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              {availableMunicipios.slice(0, 4).map((m) => {
                const checked = value.municipio === m;
                return (
                  <label key={m} className="flex cursor-pointer items-center gap-3 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => setMunicipio(c ? m : '')}
                    />
                    <span>{m}</span>
                  </label>
                );
              })}
            </section>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-home-border px-4 py-3">
        <Button type="button" className="w-full" onClick={() => onChange({ ...value })}>
          Aplicar Filtros
        </Button>
        <button
          type="button"
          onClick={clearAll}
          className="w-full text-center text-sm font-medium text-home-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Limpar
        </button>
      </div>
    </aside>
  );
}
