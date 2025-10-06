import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserRole } from '@/hooks/useUserRole';
import { useNucleosByModule } from '@/hooks/useNucleosByModule';
import { normalizeText } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Building2,
  Laptop,
  Users,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { MapViewTeletrabalho } from '@/components/MapViewTeletrabalho';

type TeletrabalhoStatus = 'all' | 'active' | 'scheduled' | 'none';

interface TeletrabalhoData {
  nucleusId: string;
  status: 'none' | 'scheduled' | 'active';
}

const Teletrabalho = () => {
  const navigate = useNavigate();
  const { nucleos, loading } = useNucleosByModule('teletrabalho');
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TeletrabalhoStatus>('all');
  const [teletrabalhoData, setTeletrabalhoData] = useState<Record<string, TeletrabalhoData>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch teletrabalho data
  useEffect(() => {
    const fetchTeletrabalhoData = async () => {
      if (nucleos.length === 0) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      const dataMap: Record<string, TeletrabalhoData> = {};
      const now = new Date();

      const nucleoIds = nucleos.map(n => n.id);
      const { data: allTeletrabalhoRecords } = await supabase
        .from('nucleo_teletrabalho')
        .select('*')
        .in('nucleo_id', nucleoIds)
        .order('data_inicio', { ascending: false });

      const recordsByNucleus = allTeletrabalhoRecords?.reduce((acc, record) => {
        if (!acc[record.nucleo_id]) acc[record.nucleo_id] = [];
        acc[record.nucleo_id].push(record);
        return acc;
      }, {} as Record<string, any[]>) || {};

      for (const nucleus of nucleos) {
        const nucleusRecords = recordsByNucleus[nucleus.id] || [];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const activeTeletrabalho = nucleusRecords.find((t) => {
          const dataInicio = new Date(t.data_inicio);
          const dataInicioDay = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          const dataFim = t.data_fim ? new Date(t.data_fim) : null;
          const dataFimDay = dataFim ? new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate()) : null;
          
          if (dataFimDay && dataFimDay < today) {
            return false;
          }
          
          return true;
        });

        let status: 'none' | 'scheduled' | 'active' = 'none';

        if (activeTeletrabalho) {
          const dataInicio = new Date(activeTeletrabalho.data_inicio);
          const dataInicioDay = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          
          if (dataInicioDay > today) {
            status = 'scheduled';
          } else {
            status = 'active';
          }
        }

        dataMap[nucleus.id] = {
          nucleusId: nucleus.id,
          status,
        };
      }

      setTeletrabalhoData(dataMap);
      setIsLoadingData(false);
    };

    fetchTeletrabalhoData();
  }, [nucleos]);

  const filteredNucleos = useMemo(() => {
    return nucleos.filter(nucleo => {
      const normalizedSearchTerm = normalizeText(searchTerm);
      const matchesSearch = normalizeText(nucleo.nome).includes(normalizedSearchTerm) ||
                           normalizeText(nucleo.cidade).includes(normalizedSearchTerm);
      
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      
      const nucleoStatus = teletrabalhoData[nucleo.id]?.status || 'none';
      return nucleoStatus === statusFilter;
    });
  }, [nucleos, searchTerm, statusFilter, teletrabalhoData]);

  const stats = useMemo(() => {
    const active = nucleos.filter(n => teletrabalhoData[n.id]?.status === 'active').length;
    const scheduled = nucleos.filter(n => teletrabalhoData[n.id]?.status === 'scheduled').length;
    const none = nucleos.filter(n => !teletrabalhoData[n.id] || teletrabalhoData[n.id]?.status === 'none').length;
    
    return { active, scheduled, none };
  }, [nucleos, teletrabalhoData]);

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

      <div className="container mx-auto px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total de Núcleos</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{nucleos.length}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Em Teletrabalho</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{isLoadingData ? '-' : stats.active}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-muted-foreground">Agendados</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{isLoadingData ? '-' : stats.scheduled}</div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            disabled={isLoadingData}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Todos ({nucleos.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            disabled={isLoadingData}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Em Teletrabalho ({stats.active})
          </Button>
          <Button
            variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('scheduled')}
            disabled={isLoadingData}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Agendados ({stats.scheduled})
          </Button>
          <Button
            variant={statusFilter === 'none' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('none')}
            disabled={isLoadingData}
          >
            <Laptop className="h-4 w-4 mr-2" />
            Sem Teletrabalho ({stats.none})
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar núcleo por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">
            Exibindo {filteredNucleos.length} de {nucleos.length} núcleos
          </span>
        </div>

        {/* Mapa dos Núcleos */}
        {!loading && !isLoadingData && <MapViewTeletrabalho nucleos={filteredNucleos} onViewDetails={handleViewDetails} />}

        {/* Empty State */}
        {filteredNucleos.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum núcleo encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os termos de busca
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}>
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </SimpleHeader>
  );
};

export default Teletrabalho;
