import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { normalizeText } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building2,
  Laptop,
  Users,
  Menu,
  X
} from 'lucide-react';
import { MapViewTeletrabalho } from '@/components/MapViewTeletrabalho';
import { TeletrabalhoFilters, type TeletrabalhoFiltersData } from '@/components/TeletrabalhoFilters';
import { useIsMobile } from '@/hooks/use-mobile';

const Nucleos = () => {
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [nucleos, setNucleos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<TeletrabalhoFiltersData>({
    status: ['all']
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchNucleos();
  }, []);

  const fetchNucleos = async () => {
    try {
      setLoading(true);
      // Buscar apenas dados básicos de nucleos_central (sem dados de preventivos)
      const { data, error } = await supabase
        .from('nucleos_central')
        .select('*')
        .order('nome');

      if (error) throw error;
      setNucleos(data || []);
    } catch (error) {
      console.error('Error fetching nucleos:', error);
      toast({
        title: 'Erro ao carregar núcleos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredNucleos = useMemo(() => {
    return nucleos.filter(nucleo => {
      const normalizedSearchTerm = normalizeText(searchTerm);
      return normalizeText(nucleo.nome).includes(normalizedSearchTerm) ||
             normalizeText(nucleo.cidade).includes(normalizedSearchTerm);
    });
  }, [nucleos, searchTerm]);

  const handleFiltersChange = (newFilters: TeletrabalhoFiltersData) => {
    setFilters(newFilters);
  };

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/teletrabalho/${nucleusId}`);
  };

  return (
    <SimpleHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Teletrabalho"
            subtitle="Sistema de Gestão de Núcleos e Teletrabalho da Defensoria Pública"
          />
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <div className="md:hidden px-6 py-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
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
          
          {/* Mobile results counter */}
          <div className="text-xs text-muted-foreground">
            {loading ? 'Carregando...' : `${filteredNucleos.length} núcleo${filteredNucleos.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-280px)] lg:h-[calc(100vh-300px)]">
        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 transition-transform duration-300 ease-in-out
          w-72 lg:w-80 xl:w-96 bg-card border-r border-border
          fixed md:relative z-40 h-full
          overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
        `}>
          <div className="p-4 lg:p-6">
            <TeletrabalhoFilters
              onFiltersChange={handleFiltersChange}
              loading={loading}
            />
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          {!loading && (
            <MapViewTeletrabalho 
              nucleos={filteredNucleos} 
              onViewDetails={handleViewDetails}
              filters={filters}
            />
          )}
          
          {/* Enhanced results counter */}
          <div className="absolute top-3 lg:top-4 right-3 lg:right-4 z-10">
            <div className="bg-background/95 backdrop-blur-sm px-3 lg:px-4 py-2 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="flex items-center gap-2">
                {loading && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
                <span className="text-xs lg:text-sm font-medium">
                  {loading ? 'Carregando núcleos...' : 
                   `${filteredNucleos.length} núcleo${filteredNucleos.length !== 1 ? 's' : ''} encontrado${filteredNucleos.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredNucleos.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum núcleo encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os termos de busca
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Limpar Busca
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleHeader>
  );
};

export default Nucleos;
