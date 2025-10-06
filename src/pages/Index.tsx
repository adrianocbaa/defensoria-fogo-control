import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { MapView } from '@/components/MapView';
import { NucleusForm } from '@/components/NucleusForm';
import { Button } from '@/components/ui/button';
import { useNucleiContext } from '@/contexts/NucleiContext';
import { NucleusCard } from '@/components/NucleusCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { seedDatabase } from '@/utils/seedDatabase';
import { normalizeText } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter,
  Building2,
  Droplets,
  AlertTriangle,
  Clock,
  BarChart3,
  Database,
  Palette
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { nuclei, addNucleus, loading, refetch } = useNucleiContext();
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHydrant, setFilterHydrant] = useState<'all' | 'with' | 'without'>('all');
  const [filterExpired, setFilterExpired] = useState<'all' | 'expired'>('all');
  const [showNucleusForm, setShowNucleusForm] = useState(false);
  const { toast } = useToast();

  const filteredNuclei = nuclei.filter(nucleus => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchesSearch = normalizeText(nucleus.name).includes(normalizedSearchTerm) ||
                         normalizeText(nucleus.city).includes(normalizedSearchTerm);
    
    const matchesHydrant = filterHydrant === 'all' ||
                           (filterHydrant === 'with' && nucleus.hydrants.length > 0) ||
                           (filterHydrant === 'without' && nucleus.hydrants.length === 0);

    const hasExpiredItems = filterExpired === 'all' || 
                           (filterExpired === 'expired' && (
                             nucleus.fireExtinguishers.some(ext => ext.status === 'expired') ||
                             (nucleus.fireDepartmentLicense?.validUntil && 
                              new Date(nucleus.fireDepartmentLicense.validUntil) < new Date())
                           ));

    return matchesSearch && matchesHydrant && hasExpiredItems;
  });

  const totalExtinguishers = nuclei.reduce((total, nucleus) => 
    total + nucleus.fireExtinguishers.length, 0
  );

  const expiredExtinguishers = nuclei.reduce((total, nucleus) => 
    total + nucleus.fireExtinguishers.filter(ext => ext.status === 'expired').length, 0
  );

  const nucleiWithHydrant = nuclei.filter(nucleus => nucleus.hydrants.length > 0).length;

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/nucleus/${nucleusId}`);
  };

  const handleNucleusSubmit = async (data: any) => {
    try {
      // Função para calcular status do extintor baseado na data de vencimento
      const calculateExtinguisherStatus = (expirationDate: Date) => {
        const now = new Date();
        const diffInMonths = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (diffInMonths < 0) {
          return 'expired' as const;
        } else if (diffInMonths <= 6) {
          return 'expiring-soon' as const;
        } else {
          return 'valid' as const;
        }
      };

      const newNucleus = {
        name: data.name,
        city: data.city,
        address: data.address,
        coordinates: data.coordinates,
        isAgentMode: data.isAgentMode || false,
        hydrants: data.hydrants || [],
        contact: {
          phone: data.phone || undefined,
          email: data.email || undefined,
        },
        fireExtinguishers: (data.extinguishers || []).map((ext: any) => ({
          type: ext.type,
          expirationDate: new Date(ext.expirationDate),
          location: ext.location,
          capacity: ext.capacity || undefined,
          hydrostaticTest: ext.hydrostaticTest ? new Date(ext.hydrostaticTest) : undefined,
          supportType: ext.supportType || undefined,
          hasVerticalSignage: ext.hasVerticalSignage || false,
          status: calculateExtinguisherStatus(new Date(ext.expirationDate))
        })),
        documents: (data.documents || []).map((doc: any) => ({
          type: doc.type,
          name: doc.name,
          url: `/documents/${doc.file?.name || 'document.pdf'}`,
          uploadedAt: new Date(),
          size: doc.file?.size || 0,
          mimeType: doc.file?.type || 'application/pdf'
        })),
        fireDepartmentLicense: data.hasAVCB && data.avcbExpirationDate ? {
          validUntil: new Date(data.avcbExpirationDate),
          documentUrl: '/documents/alvara.pdf'
        } : undefined,
      };
      
      await addNucleus(newNucleus);
      
      toast({
        title: "Núcleo cadastrado com sucesso!",
        description: `${data.name} foi adicionado ao sistema.`,
      });
      
      setShowNucleusForm(false);
    } catch (error) {
      toast({
        title: "Erro ao cadastrar núcleo",
        description: "Tente novamente ou verifique os dados inseridos.",
        variant: "destructive",
      });
      console.error('Erro ao cadastrar núcleo:', error);
    }
  };

  return (
    <SimpleHeader>
      {/* Page Header */}
      <div className="border-b bg-card transition-colors">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Núcleos DPE-MT"
            subtitle="Sistema de Controle de Prevenção de Incêndio dos Núcleos da Defensoria"
            actions={
              canEdit && (
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setShowNucleusForm(true)}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total de Núcleos</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{nuclei.length}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Com Hidrante</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{nucleiWithHydrant}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Extintores</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalExtinguishers}</div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-danger" />
              <span className="text-sm font-medium text-muted-foreground">Vencidos</span>
            </div>
            <div className="text-2xl font-bold text-danger">{expiredExtinguishers}</div>
          </div>
        </div>

        {/* Filters and Search */}
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
          
          <div className="flex gap-2">
            <Button
              variant={filterHydrant === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterHydrant('all')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Todos
            </Button>
            <Button
              variant={filterHydrant === 'with' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterHydrant('with')}
            >
              <Droplets className="h-4 w-4 mr-2" />
              Com Hidrante
            </Button>
            <Button
              variant={filterHydrant === 'without' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterHydrant('without')}
            >
              Sem Hidrante
            </Button>
            <Button
              variant={filterExpired === 'expired' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterExpired(filterExpired === 'expired' ? 'all' : 'expired')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Vencidos
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">
            Exibindo {filteredNuclei.length} de {nuclei.length} núcleos
          </span>
          {filterHydrant !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {filterHydrant === 'with' ? 'Com hidrante' : 'Sem hidrante'}
            </Badge>
          )}
          {filterExpired === 'expired' && (
            <Badge variant="destructive" className="text-xs">
              Vencidos
            </Badge>
          )}
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
              Tente ajustar os filtros ou termos de busca
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setFilterHydrant('all');
            }}>
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Formulário de Cadastro */}
        <NucleusForm
          open={showNucleusForm}
          onOpenChange={setShowNucleusForm}
          onSubmit={handleNucleusSubmit}
        />
      </div>
    </SimpleHeader>
  );
};

export default Index;
