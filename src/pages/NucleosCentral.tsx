import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNucleosCentral } from '@/hooks/useNucleosCentral';
import { normalizeText } from '@/lib/utils';
import { Plus, Search, Building2 } from 'lucide-react';
import { MapViewCentral } from '@/components/MapViewCentral';

const NucleosCentral = () => {
  const navigate = useNavigate();
  const { nucleos, loading } = useNucleosCentral();
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredNucleos = nucleos.filter((nucleus) => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    return (
      normalizeText(nucleus.nome).includes(normalizedSearchTerm) ||
      normalizeText(nucleus.cidade).includes(normalizedSearchTerm)
    );
  });

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/nucleos-central/${nucleusId}`);
  };

  return (
    <SimpleHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Núcleos - Cadastro Central"
            subtitle="Gestão centralizada de núcleos da DPE-MT"
            actions={
              canEdit && (
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/nucleos-central/novo')}
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
            <div className="text-2xl font-bold text-foreground">{nucleos.length}</div>
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
        <MapViewCentral nucleos={filteredNucleos} onViewDetails={handleViewDetails} />

        {/* Empty State */}
        {filteredNucleos.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum núcleo encontrado</h3>
            <p className="text-muted-foreground mb-4">Tente ajustar os termos de busca</p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar Busca
            </Button>
          </div>
        )}
      </div>
    </SimpleHeader>
  );
};

export default NucleosCentral;
