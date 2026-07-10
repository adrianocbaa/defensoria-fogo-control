import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { WorksStats } from '@/components/obras/WorksStats';
import { WorksFilters } from '@/components/obras/WorksFilters';
import { ActiveFilters } from '@/components/obras/ActiveFilters';
import { WorkSummaryDrawer } from '@/components/obras/WorkSummaryDrawer';
import { ObrasMap } from '@/components/ObrasMap';
import { type FiltersData } from '@/components/ObrasFilters';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ErrorState } from '@/components/LoadingStates';
import { useObras } from '@/hooks/useObras';
import { type Obra, type ObraStatus } from '@/data/mockObras';

export default function Obras() {
  const { obras, loading, error, refetch } = useObras();
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [filters, setFilters] = useState<FiltersData>({ status: [], tipos: [], municipio: '' });

  const availableTypes = useMemo(() => {
    const setT = new Set(obras.map((o) => o.tipo).filter(Boolean));
    return Array.from(setT).sort();
  }, [obras]);

  const availableMunicipios = useMemo(
    () => Array.from(new Set(obras.map((o) => o.municipio).filter(Boolean))).sort(),
    [obras],
  );

  const filteredObras = useMemo(() => {
    return obras.filter((obra) => {
      const obraStatus = (obra.status as string).toLowerCase() === 'planejamento' ? 'planejada' : obra.status;
      if (filters.status.length > 0 && !filters.status.includes(obraStatus as ObraStatus)) return false;
      if (filters.tipos.length > 0 && !filters.tipos.includes(obra.tipo)) return false;
      if (filters.municipio && !obra.municipio.toLowerCase().includes(filters.municipio.toLowerCase())) return false;
      return true;
    });
  }, [obras, filters]);

  const counts = useMemo(() => {
    const c = { total: obras.length, em_andamento: 0, concluida: 0, planejada: 0, paralisada: 0 };
    obras.forEach((o) => {
      const s = (o.status as string).toLowerCase() === 'planejamento' ? 'planejada' : o.status;
      if (s in c) (c as any)[s] += 1;
    });
    return c;
  }, [obras]);

  const toggleStatus = (s: ObraStatus) =>
    setFilters((f) => ({
      ...f,
      status: f.status.includes(s) ? f.status.filter((v) => v !== s) : [...f.status, s],
    }));

  const handleObraClick = (obra: Obra) => {
    setSelectedObra(obra);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedObra(null);
  };

  const renderHeader = ({ openMenu }: { openMenu: () => void }) => (
    <WorksPageHeader onOpenMenu={openMenu} globalSearch={globalSearch} onGlobalSearchChange={setGlobalSearch} />
  );

  if (error && !loading) {
    return (
      <ObrasLayout header={renderHeader}>
        <ErrorState message={error} onRetry={refetch} />
      </ObrasLayout>
    );
  }

  return (
    <ObrasLayout header={renderHeader}>
      <div className="space-y-5">
        {/* Botões de ação */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/dashboard">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/admin/obras">
              <Settings className="h-4 w-4" />
              Painel de Obras
            </Link>
          </Button>
          <PermissionGuard requiresEdit showMessage={false}>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin/obras/lista">
                <List className="h-4 w-4" />
                Ver como Lista
              </Link>
            </Button>
          </PermissionGuard>
        </div>

        {/* KPIs */}
        <WorksStats
          total={counts.total}
          emAndamento={counts.em_andamento}
          concluidas={counts.concluida}
          planejadas={counts.planejada}
          paralisadas={counts.paralisada}
          activeStatus={filters.status}
          onToggleStatus={toggleStatus}
        />

        {/* Chips + contador */}
        <ActiveFilters
          filters={filters}
          totalFiltered={filteredObras.length}
          totalAll={obras.length}
          onRemoveStatus={(s) => setFilters((f) => ({ ...f, status: f.status.filter((v) => v !== s) }))}
          onRemoveTipo={(t) => setFilters((f) => ({ ...f, tipos: f.tipos.filter((v) => v !== t) }))}
          onClearMunicipio={() => setFilters((f) => ({ ...f, municipio: '' }))}
          onClearAll={() => setFilters({ status: [], tipos: [], municipio: '' })}
        />

        {/* Layout mapa + filtros */}
        <div className="flex h-[calc(100vh-360px)] min-h-[520px] overflow-hidden rounded-2xl border border-home-border bg-card">
          <WorksFilters
            value={filters}
            onChange={setFilters}
            availableTypes={availableTypes}
            availableMunicipios={availableMunicipios}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            loading={loading}
          />
          <div className="relative flex-1">
            <ObrasMap obras={filteredObras} onObraClick={handleObraClick} loading={loading} className="h-full w-full" />
          </div>
        </div>
      </div>

      <WorkSummaryDrawer obra={selectedObra} isOpen={detailsOpen} onClose={handleDetailsClose} />
    </ObrasLayout>
  );
}
