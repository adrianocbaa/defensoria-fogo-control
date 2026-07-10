import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNucleosByModule } from '@/hooks/useNucleosByModule';
import { normalizeText } from '@/lib/utils';
import { Building2 } from 'lucide-react';

import { PreventivosLayout } from '@/components/preventivos/PreventivosLayout';
import { PreventivosPageHeader } from '@/components/preventivos/PreventivosPageHeader';
import { PreventiveStats } from '@/components/preventivos/PreventiveStats';
import { PreventiveFilters, PreventivosStatusFilter } from '@/components/preventivos/PreventiveFilters';
import { NucleiList } from '@/components/preventivos/NucleiList';
import { MapViewPreventivos } from '@/components/MapViewPreventivos';

const Preventivos = () => {
  const navigate = useNavigate();
  const { nucleos, loading } = useNucleosByModule('preventivos');

  const [globalSearch, setGlobalSearch] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PreventivosStatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, 'green' | 'orange' | 'red'>>({});

  const counts = useMemo(() => {
    const values = Object.values(statusMap);
    return {
      total: nucleos.length,
      regularizados: values.filter((s) => s === 'green').length,
      vencendo: values.filter((s) => s === 'orange').length,
      irregulares: values.filter((s) => s === 'red').length,
    };
  }, [nucleos.length, statusMap]);

  const filteredNucleos = useMemo(() => {
    const q = normalizeText(search);
    return nucleos.filter((n) => {
      const matchesSearch =
        !q || normalizeText(n.nome).includes(q) || normalizeText(n.cidade).includes(q);
      const matchesStatus =
        statusFilter === 'all' || statusMap[n.id] === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [nucleos, search, statusFilter, statusMap]);

  const handleClear = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <PreventivosLayout
      header={({ openMenu }) => (
        <PreventivosPageHeader
          onOpenMenu={openMenu}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
        />
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        {/* Stats */}
        <PreventiveStats
          total={counts.total}
          regularizados={counts.regularizados}
          vencendo={counts.vencendo}
          irregulares={counts.irregulares}
        />

        {/* Filters */}
        <PreventiveFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClear={handleClear}
          visibleCount={filteredNucleos.length}
          totalCount={nucleos.length}
        />

        {/* Map + List integrated container */}
        <div className="overflow-hidden rounded-xl border border-home-border bg-card shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="relative min-h-[420px]">
              {!loading && (
                <MapViewPreventivos
                  nucleos={filteredNucleos}
                  onViewDetails={(id) => navigate(`/preventivos/${id}`)}
                  statusFilter="all"
                  selectedNucleusId={selectedId}
                  onSelectNucleus={setSelectedId}
                  onStatusMapChange={setStatusMap}
                  hideBuiltInList
                  hideSelectedSidebar
                  height="620px"
                />
              )}
            </div>
            <div className="border-t border-home-border lg:border-l lg:border-t-0">
              <NucleiList
                nucleos={filteredNucleos}
                statusMap={statusMap}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenDetails={(id) => navigate(`/preventivos/${id}`)}
              />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredNucleos.length === 0 && !loading && (
          <div className="rounded-xl border border-home-border bg-card p-10 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Nenhum núcleo encontrado
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Tente ajustar os termos de busca ou os filtros
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm font-semibold text-warning hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </PreventivosLayout>
  );
};

export default Preventivos;
