import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Calendar, Users } from 'lucide-react';
import { samplesApi, Sample } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';

interface ImportSampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: (importedSample: Sample) => void;
}

export function ImportSampleModal({ 
  open, 
  onOpenChange, 
  projectId, 
  onSuccess 
}: ImportSampleModalProps) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableSamples();
    }
  }, [open]);

  const loadAvailableSamples = async () => {
    setLoading(true);
    try {
      const data = await samplesApi.listMine();
      // Filter out samples from current project
      const availableSamples = data.filter(sample => sample.project_id !== projectId);
      setSamples(availableSamples);
    } catch (error) {
      console.error('Error loading samples:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar amostras disponíveis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportSample = async (sampleId: string, originalSample: Sample) => {
    try {
      const clonedSample = await samplesApi.clone(sampleId, projectId);
      onSuccess(clonedSample);
      onOpenChange(false);
      
      toast({
        title: 'Sucesso',
        description: `Amostra importada com ${originalSample.comparable_ids?.length || 0} comparáveis`,
      });
    } catch (error) {
      console.error('Error importing sample:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao importar amostra',
        variant: 'destructive',
      });
    }
  };

  const groupedSamples = samples.reduce((acc, sample) => {
    const projectName = sample.project_name || 'Projeto sem nome';
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(sample);
    return acc;
  }, {} as Record<string, Sample[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar Amostra</DialogTitle>
          <DialogDescription>
            Importe uma amostra de comparáveis de outro projeto para reutilizar no projeto atual.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="text-center py-8">Carregando amostras disponíveis...</div>
          ) : Object.keys(groupedSamples).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma amostra disponível para importação
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSamples).map(([projectName, projectSamples]) => (
                <div key={projectName}>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">
                    {projectName}
                  </h3>
                  <div className="space-y-3">
                    {projectSamples.map((sample) => (
                      <Card key={sample.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{sample.name || 'Amostra sem nome'}</h4>
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 mr-1" />
                                  {sample.comparable_ids?.length || 0} comparáveis
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(sample.created_at || '').toLocaleDateString('pt-BR')}
                                </div>
                                {sample.criteria_json && (
                                  <div>
                                    Critérios: {Object.keys(sample.criteria_json).length} filtros
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              onClick={() => handleImportSample(sample.id!, sample)}
                              className="flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Importar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}