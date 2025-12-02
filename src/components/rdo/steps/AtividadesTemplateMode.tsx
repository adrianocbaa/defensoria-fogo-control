import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sparkles, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRdoTemplates } from "@/hooks/useRdoTemplates";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ActivityNoteDialog } from "../ActivityNoteDialog";

interface Activity {
  id?: string;
  descricao: string;
  progresso: number;
  status: 'em_andamento' | 'concluida';
  observacao?: string;
  item_ref?: string; // key do template
}

interface AtividadesTemplateModeProps {
  reportId?: string;
  obraId: string;
  localValues: Record<string, Partial<Activity>>;
  setLocalValues: React.Dispatch<React.SetStateAction<Record<string, Partial<Activity>>>>;
  disabled?: boolean;
}

export function AtividadesTemplateMode({
  reportId,
  obraId,
  localValues,
  setLocalValues,
  disabled,
}: AtividadesTemplateModeProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    activityId?: string;
    itemRef?: string;
    itemDescricao?: string;
  }>({ open: false });

  const { data: templates = [], isLoading: loadingTemplates } = useRdoTemplates();

  // Buscar template_id salvo no RDO
  const { data: rdoReport } = useQuery({
    queryKey: ['rdo-report-template', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('rdo_reports')
        .select('template_id')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Atualizar template selecionado quando carregar
  useEffect(() => {
    if (rdoReport?.template_id) {
      setSelectedTemplateId(rdoReport.template_id);
    }
  }, [rdoReport]);

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['rdo-activities-template', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('*')
        .eq('report_id', reportId)
        .eq('tipo', 'template')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!reportId,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!reportId) {
        toast.error('Salve o RDO antes de selecionar template');
        return;
      }

      const { error } = await supabase
        .from('rdo_reports')
        .update({ template_id: templateId })
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-report-template', reportId] });
    },
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!reportId) {
        toast.error('Salve o RDO antes de carregar template');
        return;
      }

      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // Inserir itens do template como atividades
      const inserts = template.itens.map((item) => ({
        obra_id: obraId,
        report_id: reportId,
        tipo: 'template',
        descricao: item.descricao,
        unidade: item.un,
        qtd: item.qtd_base,
        progresso: 0,
        status: 'em_andamento',
        item_ref: item.key,
      }));

      const { error } = await supabase
        .from('rdo_activities')
        .insert(inserts);
      
      if (error) throw error;

      await updateTemplateMutation.mutateAsync(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-template', reportId] });
      toast.success('Template carregado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao carregar template');
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar atividades');
        return;
      }

      const { error } = await supabase.from('rdo_activities').insert({
        obra_id: obraId,
        report_id: reportId,
        tipo: 'template',
        descricao: '',
        progresso: 0,
        status: 'em_andamento',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo_activities-template', reportId] });
      toast.success('Atividade adicionada');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Activity; value: any }) => {
      const { error } = await supabase
        .from('rdo_activities')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-template', reportId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-template', reportId] });
      toast.success('Atividade removida');
    },
  });

  const handleBlur = (activityId: string, field: keyof Activity) => {
    const value = localValues[activityId]?.[field];
    if (value !== undefined) {
      updateMutation.mutate({ id: activityId, field, value });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (activities.length === 0) {
      // Carregar automaticamente se não houver atividades
      loadTemplateMutation.mutate(templateId);
    } else {
      // Perguntar se quer substituir
      if (confirm('Já existem atividades. Deseja substituir pelo template selecionado?')) {
        // Deletar atividades existentes e carregar template
        Promise.all(activities.map(a => deleteMutation.mutateAsync(a.id!)))
          .then(() => loadTemplateMutation.mutate(templateId));
      } else {
        updateTemplateMutation.mutate(templateId);
      }
    }
  };

  if (loadingTemplates || loadingActivities) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Modelo Padrão</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Modelo Padrão (Template)</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Carregue um template pré-definido de atividades e personalize conforme necessário
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Template */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecionar Modelo</label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.titulo}
                    {template.tipo_obra && ` - ${template.tipo_obra}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <p className="text-xs text-muted-foreground">
                {templates.find(t => t.id === selectedTemplateId)?.descricao}
              </p>
            )}
          </div>

          {/* Lista de Atividades */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Atividades</h3>
              {!disabled && (
                <Button onClick={() => addMutation.mutate()} size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar Extra</span>
                </Button>
              )}
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma atividade carregada.</p>
                <p className="text-sm mt-1">Selecione um template acima para começar.</p>
              </div>
            ) : (
              activities.map((activity) => {
                const progresso = localValues[activity.id!]?.progresso ?? activity.progresso;
                const isFromTemplate = !!activity.item_ref;
                
                return (
                  <div key={activity.id} className="p-4 border rounded-xl space-y-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            placeholder="Descrição da atividade"
                            value={localValues[activity.id!]?.descricao ?? activity.descricao}
                            onChange={(e) =>
                              setLocalValues(prev => ({
                                ...prev,
                                [activity.id!]: { ...prev[activity.id!], descricao: e.target.value }
                              }))
                            }
                            onBlur={() => handleBlur(activity.id!, 'descricao')}
                            className="flex-1 min-w-[200px]"
                            disabled={disabled}
                          />
                          {isFromTemplate && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Template
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {activity.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNoteDialog({
                              open: true,
                              activityId: activity.id!,
                              itemRef: activity.item_ref,
                              itemDescricao: activity.descricao,
                            })}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {!disabled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(activity.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <label className="font-medium">Progresso Executado</label>
                          <span className="font-semibold text-primary">{progresso}%</span>
                        </div>
                        <Slider
                          value={[progresso]}
                          onValueChange={([value]) => {
                            setLocalValues(prev => ({
                              ...prev,
                              [activity.id!]: { ...prev[activity.id!], progresso: value }
                            }));
                          }}
                          onValueCommit={() => handleBlur(activity.id!, 'progresso')}
                          max={100}
                          step={5}
                          className="w-full"
                          disabled={disabled}
                        />
                      </div>

                      <Select
                        value={localValues[activity.id!]?.status ?? activity.status}
                        onValueChange={(v: 'em_andamento' | 'concluida') => {
                          setLocalValues(prev => ({
                            ...prev,
                            [activity.id!]: { ...prev[activity.id!], status: v }
                          }));
                          updateMutation.mutate({
                            id: activity.id!,
                            field: 'status',
                            value: v,
                          });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                        </SelectContent>
                      </Select>

                      <Textarea
                        placeholder="Observações sobre esta atividade..."
                        rows={2}
                        value={(localValues[activity.id!]?.observacao ?? activity.observacao) || ''}
                        onChange={(e) =>
                          setLocalValues(prev => ({
                            ...prev,
                            [activity.id!]: { ...prev[activity.id!], observacao: e.target.value }
                          }))
                        }
                        onBlur={() => handleBlur(activity.id!, 'observacao')}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {noteDialog.open && noteDialog.activityId && (
        <ActivityNoteDialog
          open={noteDialog.open}
          onOpenChange={(open) => setNoteDialog({ open })}
          reportId={reportId!}
          activityId={noteDialog.activityId}
          itemDescricao={noteDialog.itemDescricao || ''}
          source="template"
          itemRef={noteDialog.itemRef}
        />
      )}
    </>
  );
}
