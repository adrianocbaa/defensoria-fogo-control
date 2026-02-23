import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserRole } from '@/hooks/useUserRole';
import { useNucleosByModule } from '@/hooks/useNucleosByModule';
import { normalizeText } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building2,
  AlertTriangle,
  Shield,
  CheckCircle
} from 'lucide-react';
import { MapViewPreventivos, PreventivosStatusSummary } from '@/components/MapViewPreventivos';

const Preventivos = () => {
  const navigate = useNavigate();
  const { nucleos, loading } = useNucleosByModule('preventivos');
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusSummary, setStatusSummary] = useState<PreventivosStatusSummary>({ regularizados: 0, atencao: 0, urgente: 0 });
  const filteredNucleos = nucleos.filter(nucleo => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    return normalizeText(nucleo.nome).includes(normalizedSearchTerm) ||
           normalizeText(nucleo.cidade).includes(normalizedSearchTerm);
  });

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/preventivos/${nucleusId}`);
  };

  return (
    <SimpleHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Preventivos"
            subtitle="Sistema de Controle de Prevenção de Incêndio dos Núcleos da Defensoria"
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
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-muted-foreground">Regularizados</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{statusSummary.regularizados}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">Irregulares</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{statusSummary.atencao + statusSummary.urgente}</div>
          </div>
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
        {!loading && <MapViewPreventivos nucleos={filteredNucleos} onViewDetails={handleViewDetails} onStatusLoaded={setStatusSummary} />}

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
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar Busca
            </Button>
          </div>
        )}
      </div>
    </SimpleHeader>
  );
};

export default Preventivos;
