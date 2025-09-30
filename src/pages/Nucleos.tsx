import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNuclei } from '@/hooks/useNuclei';
import { normalizeText } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building2,
  Laptop,
  Users
} from 'lucide-react';
import { MapView } from '@/components/MapView';

const Nucleos = () => {
  const navigate = useNavigate();
  const { nuclei, loading } = useNuclei();
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredNuclei = nuclei.filter(nucleus => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    return normalizeText(nucleus.name).includes(normalizedSearchTerm) ||
           normalizeText(nucleus.city).includes(normalizedSearchTerm);
  });

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/nucleos/${nucleusId}`);
  };

  return (
    <SimpleHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Teletrabalho"
            subtitle="Sistema de Gestão de Núcleos e Teletrabalho da Defensoria Pública"
            actions={
              canEdit && (
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/nucleos/novo')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Núcleo
                </Button>
              )
            }
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
            <div className="text-2xl font-bold text-foreground">{nuclei.length}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Em Teletrabalho</span>
            </div>
            <div className="text-2xl font-bold text-foreground">0</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Coordenadores</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{nuclei.length}</div>
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
            Exibindo {filteredNuclei.length} de {nuclei.length} núcleos
          </span>
        </div>

        {/* Mapa dos Núcleos */}
        <MapView nuclei={filteredNuclei} onViewDetails={handleViewDetails} />

        {/* Empty State */}
        {filteredNuclei.length === 0 && (
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

export default Nucleos;
