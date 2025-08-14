import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, FileText, MapPin, Users } from 'lucide-react';
import { ModelingInterface } from '@/components/appraisal/ModelingInterface';
import { SelectComparablesModal } from '@/components/appraisal/SelectComparablesModal';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, Project, comparablesApi, Comparable } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedComparables, setSelectedComparables] = useState<Comparable[]>([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
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
    // Mock: In a real implementation, this would fetch from samples table
    try {
      const allComparables = await comparablesApi.list();
      // For now, just show all comparables as selected sample
      setSelectedComparables(allComparables.slice(0, 8)); // Show first 8 as sample
    } catch (error) {
      console.error('Error loading project comparables:', error);
    }
  };

  const handleComparablesSelected = (comparables: Comparable[]) => {
    setSelectedComparables(comparables);
    toast({
      title: 'Sucesso',
      description: `${comparables.length} comparáveis vinculados ao projeto`,
    });
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
          
          
          <TabsContent value="comparables" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Amostra Ativa do Projeto</CardTitle>
                  <Button onClick={() => setShowSelectModal(true)} variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Alterar Amostra
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedComparables.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      Nenhum comparável selecionado para este projeto.
                    </p>
                    <Button onClick={() => setShowSelectModal(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Selecionar Comparáveis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {selectedComparables.length} comparáveis na amostra ativa
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
      </div>
    </SimpleHeader>
  );
}