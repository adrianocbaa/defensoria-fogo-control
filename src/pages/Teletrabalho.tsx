import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { useNucleosByModule } from '@/hooks/useNucleosByModule';
import { normalizeText } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building2,
  Laptop,
  Users,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { MapViewTeletrabalho } from '@/components/MapViewTeletrabalho';

const Teletrabalho = () => {
  const navigate = useNavigate();
  const { nucleos, loading } = useNucleosByModule('teletrabalho');
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired' | 'none'>('all');

  // Calculate teletrabalho status
  const getTeletrabalhoStatus = (nucleo: any) => {
    if (!nucleo.teletrabalho || nucleo.teletrabalho.length === 0) {
      return 'none';
    }

    const now = new Date();
    const activeTeletrabalho = nucleo.teletrabalho.find((t: any) => {
      const dataFim = t.data_fim ? new Date(t.data_fim) : null;
      return !dataFim || dataFim >= now;
    });

    if (!activeTeletrabalho) return 'expired';

    if (activeTeletrabalho.data_fim) {
      const dataFim = new Date(activeTeletrabalho.data_fim);
      const daysUntilExpiry = Math.ceil((dataFim.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30) return 'expiring';
    }

    return 'active';
  };

  const filteredNucleos = nucleos.filter(nucleo => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchesSearch = normalizeText(nucleo.nome).includes(normalizedSearchTerm) ||
           normalizeText(nucleo.cidade).includes(normalizedSearchTerm);
    
    const status = getTeletrabalhoStatus(nucleo);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = useMemo(() => {
    const active = nucleos.filter(n => getTeletrabalhoStatus(n) === 'active').length;
    const expiring = nucleos.filter(n => getTeletrabalhoStatus(n) === 'expiring').length;
    const expired = nucleos.filter(n => getTeletrabalhoStatus(n) === 'expired').length;
    const none = nucleos.filter(n => getTeletrabalhoStatus(n) === 'none').length;
    
    return { active, expiring, expired, none };
  }, [nucleos]);

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
              <span className="text-sm font-medium text-muted-foreground">Ativos</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-muted-foreground">Vencendo</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-muted-foreground">Expirados</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Sem Teletrabalho</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{stats.none}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Coordenadores</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{nucleos.length}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar núcleo por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Todos
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('active')}
              className={filterStatus === 'active' ? '' : 'border-green-200 hover:bg-green-50'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ativos
            </Button>
            <Button
              variant={filterStatus === 'expiring' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('expiring')}
              className={filterStatus === 'expiring' ? '' : 'border-yellow-200 hover:bg-yellow-50'}
            >
              <Clock className="h-4 w-4 mr-2" />
              Vencendo
            </Button>
            <Button
              variant={filterStatus === 'expired' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('expired')}
              className={filterStatus === 'expired' ? '' : 'border-red-200 hover:bg-red-50'}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Expirados
            </Button>
            <Button
              variant={filterStatus === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('none')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Sem Teletrabalho
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground">
            Exibindo {filteredNucleos.length} de {nucleos.length} núcleos
          </span>
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filterStatus === 'active' && 'Ativos'}
              {filterStatus === 'expiring' && 'Vencendo'}
              {filterStatus === 'expired' && 'Expirados'}
              {filterStatus === 'none' && 'Sem Teletrabalho'}
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFilterStatus('all')}
              className="h-6 px-2 text-xs"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Mapa dos Núcleos */}
        {!loading && <MapViewTeletrabalho nucleos={filteredNucleos} onViewDetails={handleViewDetails} />}

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
              setFilterStatus('all');
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
