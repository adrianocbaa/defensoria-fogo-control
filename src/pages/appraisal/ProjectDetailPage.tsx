import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, FileText, MapPin, Users, Copy } from 'lucide-react';
import { ModelingInterface } from '@/components/appraisal/ModelingInterface';
import { SelectComparablesModal } from '@/components/appraisal/SelectComparablesModal';
import { ImportSampleModal } from '@/components/appraisal/ImportSampleModal';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, Project, comparablesApi, Comparable, samplesApi, Sample } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedComparables, setSelectedComparables] = useState<Comparable[]>([]);
  const [activeSample, setActiveSample] = useState<Sample | null>(null);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProject();
      loadProjectComparables();
    }
  }, [id]);

  const loadProject = async () => {
    if (!id) return;
    
    try {
      const projectData = await projectsApi.getById(id);
      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar projeto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjectComparables = async () => {
    if (!id) return;
    
    try {
      // Load project samples
      const samples = await samplesApi.getByProject(id);
      
      if (samples.length > 0) {
        const sample = samples[0]; // Use first sample as active
        setActiveSample(sample);
        
        // Load the actual comparables from the sample
        if (sample.comparable_ids && sample.comparable_ids.length > 0) {
          const allComparables = await comparablesApi.list();
          const sampleComparables = allComparables.filter(c => 
            sample.comparable_ids!.includes(c.id!)
          );
          setSelectedComparables(sampleComparables);
        }
      } else {
        setActiveSample(null);
        setSelectedComparables([]);
      }
    } catch (error) {
      console.error('Error loading project comparables:', error);
    }
  };

  const handleComparablesSelected = (comparables: Comparable[]) => {
    setSelectedComparables(comparables);
    loadProjectComparables(); // Reload to get the updated sample
    toast({
      title: 'Sucesso',
      description: `${comparables.length} comparáveis vinculados ao projeto`,
    });
  };

  const handleSampleImported = (importedSample: Sample) => {
    setActiveSample(importedSample);
    loadProjectComparables(); // Reload to show imported sample
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </SimpleHeader>
    );
  }

  if (!project) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Projeto não encontrado</div>
        </div>
      </SimpleHeader>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/avaliacao-imoveis/projects')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Projetos
          </Button>
          
          <PageHeader
            title={project.purpose || 'Projeto de Avaliação'}
            subtitle={`Projeto criado em ${new Date(project.created_at || '').toLocaleDateString('pt-BR')}`}
          />
        </div>

        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Finalidade</div>
                <div className="font-medium">{project.purpose}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Data Base</div>
                <div className="font-medium">
                  {project.base_date ? new Date(project.base_date).toLocaleDateString('pt-BR') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Método</div>
                <div className="font-medium">{project.approach}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div>{getStatusBadge(project.status || 'draft')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="comparables" className="w-full">
          <TabsList>
            <TabsTrigger value="comparables" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Amostra de Comparáveis
            </TabsTrigger>
            <TabsTrigger value="modeling" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Modelagem Estatística
            </TabsTrigger>
            <TabsTrigger value="property" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Imóvel Alvo
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Laudo
            </TabsTrigger>
          </TabsList>
          
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={() => navigate(`/avaliacao-imoveis/projects/${id}/report`)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Gerar Laudo
            </Button>
          </div>
          
          
          <TabsContent value="comparables" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Amostra Ativa do Projeto</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Importar de Outro Projeto
                    </Button>
                    <Button onClick={() => setShowSelectModal(true)} variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      {selectedComparables.length > 0 ? 'Editar Seleção' : 'Criar/Selecionar Amostra'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedComparables.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Nenhuma amostra ativa para este projeto.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setShowSelectModal(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Criar Amostra
                      </Button>
                      <Button onClick={() => setShowImportModal(true)} variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Importar Amostra
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {selectedComparables.length} comparáveis na amostra ativa
                        {activeSample?.name && ` • ${activeSample.name}`}
                      </div>
                      {activeSample?.criteria_json && (
                        <Badge variant="secondary">
                          {Object.keys(activeSample.criteria_json).length} critérios aplicados
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {selectedComparables.map((comparable, index) => (
                        <div key={comparable.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={comparable.kind === 'urban' ? 'default' : 'secondary'}>
                                  {comparable.kind === 'urban' ? 'Urbano' : 'Rural'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {comparable.source} • {new Date(comparable.date || '').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Preço Total:</span><br/>
                                  <span className="font-medium">{formatCurrency(comparable.price_total || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Preço Unit:</span><br/>
                                  <span className="font-medium">{formatCurrency(comparable.price_unit || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Área Terreno:</span><br/>
                                  <span className="font-medium">{comparable.land_area} m²</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Área Construída:</span><br/>
                                  <span className="font-medium">{comparable.built_area} m²</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="modeling" className="space-y-6">
            {id && <ModelingInterface projectId={id} />}
          </TabsContent>
          
          <TabsContent value="property" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imóvel Objeto da Avaliação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Configure o imóvel alvo da avaliação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Laudo de Avaliação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Execute a modelagem estatística para gerar o laudo de avaliação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SelectComparablesModal
          open={showSelectModal}
          onOpenChange={setShowSelectModal}
          projectId={id!}
          onSuccess={handleComparablesSelected}
        />

        <ImportSampleModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          projectId={id!}
          onSuccess={handleSampleImported}
        />
      </div>
    </SimpleHeader>
  );
}