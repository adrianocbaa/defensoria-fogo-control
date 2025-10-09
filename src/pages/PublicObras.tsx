import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, RotateCcw, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { ObrasMap } from '@/components/ObrasMap';
import { ObrasFilters, type FiltersData } from '@/components/ObrasFilters';
import { ObraDetails } from '@/components/ObraDetails';
import { ErrorState } from '@/components/LoadingStates';
import { supabase } from '@/integrations/supabase/client';
import { type Obra } from '@/data/mockObras';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PublicObras() {
  const [obrasData, setObrasData] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersData>({
    status: [],
    tipos: [],
    municipio: ''
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchObras = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('obras')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        const mappedData: Obra[] = (data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          municipio: item.municipio,
          tipo: item.tipo,
          status: item.status,
          coordenadas: [item.coordinates_lat, item.coordinates_lng] as [number, number],
          valor: item.valor_total,
          valorExecutado: item.valor_executado || 0,
          porcentagemExecucao: item.porcentagem_execucao || 0,
          dataInicio: item.data_inicio,
          previsaoTermino: item.data_previsao_termino || '',
          empresaResponsavel: item.empresa_responsavel,
          secretariaResponsavel: 'Defensoria Pública de Mato Grosso',
          descricao: item.descricao || '',
          fotos: item.fotos as string[] || [],
          documentos: item.documentos as any[] || []
        }));
        
        setObrasData(mappedData);
      } catch (err) {
        console.error('Erro ao carregar obras:', err);
        setError('Erro ao carregar dados das obras');
      } finally {
        setLoading(false);
      }
    };

    fetchObras();
  }, []);

  // Calculate filter options from data
  const availableTypes = useMemo(() => 
    [...new Set(obrasData.map(obra => obra.tipo))], 
    [obrasData]
  );
  
  const availableMunicipios = useMemo(() => 
    [...new Set(obrasData.map(obra => obra.municipio))].sort(), 
    [obrasData]
  );

  // Filter obras based on current filters
  const filteredObras = useMemo(() => {
    return obrasData.filter(obra => {
      const obraStatus = (obra.status as string).toLowerCase() === 'planejamento' ? 'planejada' : obra.status;

      if (filters.status.length > 0 && !filters.status.includes(obraStatus as any)) {
        return false;
      }

      if (filters.tipos.length > 0 && !filters.tipos.includes(obra.tipo)) {
        return false;
      }

      if (filters.municipio && !obra.municipio.toLowerCase().includes(filters.municipio.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [obrasData, filters]);

  const handleFiltersChange = (newFilters: FiltersData) => {
    setFilters(newFilters);
  };

  const handleObraClick = (obra: Obra) => {
    setSelectedObra(obra);
    setDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedObra(null);
  };

  if (error && !loading) {
    return (
      <PublicHeader>
        <div className="min-h-screen bg-background">
          <ErrorState 
            message={error} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </PublicHeader>
    );
  }

  return (
    <PublicHeader>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <PageHeader
          title="Mapa de Obras Públicas"
          subtitle="Visualize e acompanhe o andamento das obras públicas no estado (Visualização Pública)"
          actions={
            <Button asChild variant="outline">
              <Link to="/public/obras/lista">
                <List className="h-4 w-4 mr-2" />
                Ver como Lista
              </Link>
            </Button>
          }
        />

        {/* Mobile sidebar toggle */}
        <div className="md:hidden px-3 lg:px-4 py-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 transition-all"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              {sidebarOpen ? 'Fechar Filtros' : 'Filtros'}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              {loading ? 'Carregando...' : `${filteredObras.length} obra${filteredObras.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex h-[calc(100vh-140px)] lg:h-[calc(100vh-160px)]">
          {/* Sidebar */}
          <div className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 transition-transform duration-300 ease-in-out
            w-72 lg:w-80 xl:w-96 bg-card border-r border-border
            fixed md:relative z-40 h-full
            overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
          `}>
            <div className="p-4 lg:p-6">
              <ObrasFilters
                onFiltersChange={handleFiltersChange}
                availableTypes={availableTypes}
                availableMunicipios={availableMunicipios}
                loading={loading}
              />
            </div>
          </div>

          {/* Map area */}
          <div className="flex-1 relative">
            <ObrasMap 
              obras={filteredObras}
              onObraClick={handleObraClick}
              loading={loading}
              className="h-full w-full" 
            />
            
            {/* Enhanced results counter */}
            <div className="absolute top-3 lg:top-4 right-3 lg:right-4 z-10">
              <div className="bg-background/95 backdrop-blur-sm px-3 lg:px-4 py-2 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-xs lg:text-sm font-medium">
                    {loading ? 'Carregando obras...' : 
                     `${filteredObras.length} obra${filteredObras.length !== 1 ? 's' : ''} encontrada${filteredObras.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              
              {/* Reset filters floating button */}
              {(filters.status.length > 0 || filters.tipos.length > 0 || 
                filters.municipio !== '') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setFilters({
                    status: [],
                    tipos: [],
                    municipio: ''
                  })}
                  className="mt-2 w-full transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  <span className="text-xs">Resetar Filtros</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Obra Details Panel/Modal */}
        <ObraDetails 
          obra={selectedObra}
          isOpen={detailsOpen}
          onClose={handleDetailsClose}
        />
      </div>
    </PublicHeader>
  );
}
