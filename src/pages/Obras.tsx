import React, { useState, useMemo } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleHeader } from '@/components/SimpleHeader';
import { ObrasMap } from '@/components/ObrasMap';
import { ObrasFilters, type FiltersData } from '@/components/ObrasFilters';
import { obrasSimuladas } from '@/data/mockObras';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Obras() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersData>({
    status: [],
    tipos: [],
    municipio: 'all',
    valorMin: 0,
    valorMax: Math.max(...obrasSimuladas.map(obra => obra.valor))
  });
  const isMobile = useIsMobile();

  // Calculate filter options from data
  const availableTypes = useMemo(() => 
    [...new Set(obrasSimuladas.map(obra => obra.tipo))], 
    []
  );
  
  const availableMunicipios = useMemo(() => 
    [...new Set(obrasSimuladas.map(obra => obra.municipio))].sort(), 
    []
  );

  const maxValue = useMemo(() => 
    Math.max(...obrasSimuladas.map(obra => obra.valor)), 
    []
  );

  // Filter obras based on current filters
  const filteredObras = useMemo(() => {
    return obrasSimuladas.filter(obra => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(obra.status)) {
        return false;
      }

      // Type filter
      if (filters.tipos.length > 0 && !filters.tipos.includes(obra.tipo)) {
        return false;
      }

      // Municipality filter
      if (filters.municipio && filters.municipio !== 'all' && obra.municipio !== filters.municipio) {
        return false;
      }

      // Value range filter
      if (obra.valor < filters.valorMin || obra.valor > filters.valorMax) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const handleFiltersChange = (newFilters: FiltersData) => {
    setFilters(newFilters);
  };

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mapa de Obras Públicas</h1>
              <p className="text-muted-foreground">
                Visualize e acompanhe o andamento das obras públicas no estado
              </p>
            </div>
          </div>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="md:hidden px-4 py-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {sidebarOpen ? 'Fechar Filtros' : 'Filtros'}
          </Button>
        </div>

        {/* Main content */}
        <div className="flex h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 transition-transform duration-300 ease-in-out
            w-80 bg-card border-r border-border
            fixed md:relative z-40 h-full
            overflow-y-auto
          `}>
            <div className="p-6">
              <ObrasFilters
                onFiltersChange={handleFiltersChange}
                availableTypes={availableTypes}
                availableMunicipios={availableMunicipios}
                maxValue={maxValue}
              />
            </div>
          </div>

          {/* Map area */}
          <div className="flex-1 relative">
            <ObrasMap 
              obras={filteredObras}
              className="h-full w-full" 
            />
            
            {/* Results counter */}
            <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg border shadow-sm z-10">
              <span className="text-sm font-medium">
                {filteredObras.length} obra{filteredObras.length !== 1 ? 's' : ''} encontrada{filteredObras.length !== 1 ? 's' : ''}
              </span>
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
      </div>
    </SimpleHeader>
  );
}