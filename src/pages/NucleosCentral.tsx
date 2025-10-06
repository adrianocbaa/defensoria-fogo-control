import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNucleosCentral, useModules } from '@/hooks/useNucleosCentral';
import { normalizeText } from '@/lib/utils';
import { Plus, Search, Building2, FileSpreadsheet, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapViewCentral } from '@/components/MapViewCentral';
import { ImportarNucleosCentral } from '@/components/ImportarNucleosCentral';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NucleosCentral = () => {
  const navigate = useNavigate();
  const { nucleos, loading, addNucleo } = useNucleosCentral();
  const { modules } = useModules();
  const { canEdit } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [visibilityData, setVisibilityData] = useState<Record<string, string[]>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  // Buscar dados de visibilidade dos núcleos
  useEffect(() => {
    const fetchVisibilityData = async () => {
      const { data, error } = await supabase
        .from('nucleo_module_visibility')
        .select('nucleo_id, module_key');
      
      if (error) {
        console.error('Erro ao buscar visibilidade:', error);
        return;
      }

      // Organizar os dados por nucleo_id
      const organized: Record<string, string[]> = {};
      data?.forEach((item) => {
        if (!organized[item.nucleo_id]) {
          organized[item.nucleo_id] = [];
        }
        organized[item.nucleo_id].push(item.module_key);
      });
      
      setVisibilityData(organized);
    };

    fetchVisibilityData();
  }, []);

  const filteredNucleos = nucleos.filter((nucleus) => {
    const normalizedSearchTerm = normalizeText(searchTerm);
    const matchesSearch = 
      normalizeText(nucleus.nome).includes(normalizedSearchTerm) ||
      normalizeText(nucleus.cidade).includes(normalizedSearchTerm);
    
    // Filtro de módulo
    if (moduleFilter === 'all') {
      return matchesSearch;
    }
    
    if (moduleFilter === 'none') {
      // Núcleos sem visibilidade configurada
      return matchesSearch && (!visibilityData[nucleus.id] || visibilityData[nucleus.id].length === 0);
    }
    
    // Núcleos visíveis no módulo selecionado
    return matchesSearch && visibilityData[nucleus.id]?.includes(moduleFilter);
  });

  const handleViewDetails = (nucleusId: string) => {
    navigate(`/nucleos-central/${nucleusId}`);
  };

  const handleImportarNucleos = async (nucleosImportados: any[]) => {
    try {
      let sucessos = 0;
      let erros = 0;

      for (const nucleo of nucleosImportados) {
        try {
          await addNucleo(nucleo);
          sucessos++;
        } catch (error) {
          console.error('Erro ao importar núcleo:', nucleo.nome, error);
          erros++;
        }
      }

      setImportDialogOpen(false);

      if (sucessos > 0) {
        toast({
          title: 'Importação concluída',
          description: `${sucessos} núcleo(s) importado(s) com sucesso${erros > 0 ? `. ${erros} erro(s).` : ''}`,
        });
      }

      if (erros > 0) {
        toast({
          title: 'Alguns núcleos não foram importados',
          description: `${erros} núcleo(s) com erro. Verifique o console para mais detalhes.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao importar núcleos:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    }
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar Planilha
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => navigate('/nucleos-central/novo')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Núcleo
                  </Button>
                </div>
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
          <div className="w-full sm:w-[280px]">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filtrar por módulo" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                <SelectItem value="none">Sem visibilidade configurada</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module.id} value={module.key}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setModuleFilter('all');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* Dialog de Importação */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Núcleos</DialogTitle>
          </DialogHeader>
          <ImportarNucleosCentral
            onImportar={handleImportarNucleos}
            onFechar={() => setImportDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </SimpleHeader>
  );
};

export default NucleosCentral;
