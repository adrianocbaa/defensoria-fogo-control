import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { normalizeText } from '@/lib/utils';
import { 
  Search, 
  Building2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { MapViewPreventivos, PreventivosStatusSummary } from '@/components/MapViewPreventivos';

interface NucleusPreventivos {
  id: string;
  nome: string;
  cidade: string;
  lat?: number;
  lng?: number;
  endereco: string;
  telefones?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

const PublicPreventivos = () => {
  const navigate = useNavigate();
  const [nucleos, setNucleos] = useState<NucleusPreventivos[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusSummary, setStatusSummary] = useState<PreventivosStatusSummary>({ regularizados: 0, atencao: 0, urgente: 0 });

  useEffect(() => {
    const fetchNucleos = async () => {
      try {
        // Buscar núcleos visíveis no módulo preventivos
        const { data: visibilityData, error: visError } = await supabase
          .from('nucleo_module_visibility')
          .select('nucleo_id')
          .eq('module_key', 'preventivos');

        if (visError) throw visError;

        const nucleoIds = visibilityData?.map(v => v.nucleo_id) || [];

        if (nucleoIds.length === 0) {
          setNucleos([]);
          setLoading(false);
          return;
        }

        // Buscar dados dos núcleos
        const { data, error } = await supabase
          .from('nucleos_central')
          .select('id, nome, cidade, endereco, lat, lng, telefones, email, created_at, updated_at')
          .in('id', nucleoIds);

        if (error) throw error;
        
        const mappedData: NucleusPreventivos[] = (data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          cidade: item.cidade,
          lat: item.lat ? Number(item.lat) : undefined,
          lng: item.lng ? Number(item.lng) : undefined,
          endereco: item.endereco || '',
          telefones: item.telefones,
          email: item.email,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        
        console.log('Nucleos carregados:', mappedData.length, 'com coordenadas:', mappedData.filter(n => n.lat && n.lng).length);
        setNucleos(mappedData);
      } catch (error) {
        console.error('Erro ao carregar núcleos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNucleos();
  }, []);

  const filteredNucleos = nucleos.filter(nucleo => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    return normalizeText(nucleo.nome).includes(normalizedSearchTerm) ||
           normalizeText(nucleo.cidade).includes(normalizedSearchTerm);
  });

  return (
    <PublicHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Preventivos"
            subtitle="Sistema de Controle de Prevenção de Incêndio dos Núcleos da Defensoria (Visualização Pública)"
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
        {!loading && <MapViewPreventivos nucleos={filteredNucleos} onViewDetails={(id) => navigate(`/public/preventivos/${id}`)} onStatusLoaded={setStatusSummary} />}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {filteredNucleos.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum núcleo encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os termos de busca
            </p>
          </div>
        )}
      </div>
    </PublicHeader>
  );
};

export default PublicPreventivos;
