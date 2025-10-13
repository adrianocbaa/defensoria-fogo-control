import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useOrcamentoItems } from "@/hooks/useOrcamentoItems";
import { useRdoActivitiesAcumulado } from "@/hooks/useRdoActivitiesAcumulado";
import { ActivityNoteDialog } from "@/components/rdo/ActivityNoteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveIndicator } from "@/components/ui/save-indicator";

interface AtividadesPlanilhaModeProps {
  reportId?: string;
  obraId: string;
  dataRdo: string;
}

export function AtividadesPlanilhaMode({ reportId, obraId, dataRdo }: AtividadesPlanilhaModeProps) {
  const queryClient = useQueryClient();
  const [localExecutado, setLocalExecutado] = useState<Record<string, number>>({});
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    activityId?: string;
    orcamentoItemId?: string;
    itemDescricao?: string;
  }>({ open: false });

  const { data: orcamentoItems = [], isLoading: loadingOrcamento } = useOrcamentoItems(obraId);
  const { data: acumulados = [], isLoading: loadingAcumulados } = useRdoActivitiesAcumulado(obraId, dataRdo);

  const { data: rdoActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['rdo-activities-planilha', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('*')
        .eq('report_id', reportId)
        .eq('tipo', 'planilha');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!reportId,
  });

  // Inicializar valores locais quando as atividades carregarem
  useEffect(() => {
    if (rdoActivities.length > 0) {
      const initialValues: Record<string, number> = {};
      rdoActivities.forEach((act) => {
        if (act.orcamento_item_id) {
          initialValues[act.orcamento_item_id] = act.executado_dia || 0;
        }
      });
      setLocalExecutado(initialValues);
    }
  }, [rdoActivities]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de sincronizar');
        return;
      }

      // Para cada item da planilha, criar ou atualizar registro de atividade
      const promises = orcamentoItems.map(async (item) => {
        const existing = rdoActivities.find(a => a.orcamento_item_id === item.id);
        
        if (existing) {
          // Atualizar quantidade_total se mudou
          if (existing.quantidade_total !== item.quantidade) {
            await supabase
              .from('rdo_activities')
              .update({ quantidade_total: item.quantidade })
              .eq('id', existing.id);
          }
        } else {
          // Criar novo registro
          await supabase.from('rdo_activities').insert({
            obra_id: obraId,
            report_id: reportId,
            tipo: 'planilha',
            orcamento_item_id: item.id,
            item_code: item.item,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade_total: item.quantidade,
            executado_dia: 0,
            progresso: 0,
            status: 'em_andamento',
          });
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-planilha', reportId] });
      toast.success('Planilha sincronizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao sincronizar planilha');
    },
  });

  const updateExecutadoMutation = useMutation({
    mutationFn: async ({ activityId, value }: { activityId: string; value: number }) => {
      const { error } = await supabase
        .from('rdo_activities')
        .update({ 
          executado_dia: value,
          progresso: value > 0 ? 100 : 0, // Se executou algo, marca como 100%, senão 0
        })
        .eq('id', activityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-planilha', reportId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-acumulado', obraId] });
    },
  });

  const handleExecutadoChange = (orcamentoItemId: string, activityId: string, value: number) => {
    setLocalExecutado(prev => ({ ...prev, [orcamentoItemId]: value }));
  };

  const handleExecutadoBlur = (activityId: string, value: number) => {
    updateExecutadoMutation.mutate({ activityId, value });
  };

  // Sincronizar automaticamente na primeira vez
  useEffect(() => {
    if (reportId && orcamentoItems.length > 0 && rdoActivities.length === 0) {
      syncMutation.mutate();
    }
  }, [reportId, orcamentoItems.length, rdoActivities.length]);

  if (loadingOrcamento || loadingAcumulados || loadingActivities) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Serviços (Planilha)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const itemsComDados = orcamentoItems.map((item) => {
    const activity = rdoActivities.find(a => a.orcamento_item_id === item.id);
    const acumulado = acumulados.find(a => a.orcamento_item_id === item.id);
    const executadoAcumulado = acumulado?.executado_acumulado || 0;
    const executadoDia = localExecutado[item.id] ?? (activity?.executado_dia || 0);
    const totalExecutado = executadoAcumulado + executadoDia;
    const percentualExecutado = item.quantidade > 0 ? (totalExecutado / item.quantidade * 100) : 0;
    const disponivel = Math.max(0, item.quantidade - executadoAcumulado);
    const excedeuLimite = totalExecutado > item.quantidade;

    return {
      ...item,
      activity,
      executadoAcumulado,
      executadoDia,
      totalExecutado,
      percentualExecutado,
      disponivel,
      excedeuLimite,
    };
  });

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Lista de Serviços (Planilha)</CardTitle>
              </div>
              <SaveIndicator isSaving={updateExecutadoMutation.isPending} />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Itens da planilha orçamentária vinculada à obra
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {itemsComDados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item encontrado na planilha orçamentária.</p>
              <p className="text-sm mt-1">Adicione itens à planilha da obra primeiro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itemsComDados.map((item) => (
                <div key={item.id} className="p-4 border rounded-xl space-y-3 bg-card">
                  {/* Header do Item */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {item.item}
                        </Badge>
                        {item.origem === 'aditivo' && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Aditivo {item.aditivo_num}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 line-clamp-2">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Quantidade total: {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {item.unidade}
                      </p>
                    </div>
                    {item.activity && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNoteDialog({
                          open: true,
                          activityId: item.activity!.id,
                          orcamentoItemId: item.id,
                          itemDescricao: `${item.item} - ${item.descricao}`,
                        })}
                        className="shrink-0"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Informações de Execução */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <label className="text-muted-foreground text-xs">Acumulado Anterior</label>
                        <p className="font-medium">
                          {item.executadoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {item.unidade}
                        </p>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs">Disponível</label>
                        <p className="font-medium">
                          {item.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {item.unidade}
                        </p>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs block mb-1">
                          Executado Hoje
                          {item.excedeuLimite && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="inline-block h-3 w-3 ml-1 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excede o total disponível</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.executadoDia}
                          onChange={(e) => item.activity && handleExecutadoChange(
                            item.id,
                            item.activity.id,
                            parseFloat(e.target.value) || 0
                          )}
                          onBlur={(e) => item.activity && handleExecutadoBlur(
                            item.activity.id,
                            parseFloat(e.target.value) || 0
                          )}
                          className={item.excedeuLimite ? 'border-destructive focus-visible:ring-destructive' : ''}
                          disabled={!item.activity}
                        />
                      </div>
                    </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso Total</span>
                      <span className={`font-semibold ${item.excedeuLimite ? 'text-destructive' : 'text-primary'}`}>
                        {item.percentualExecutado.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, item.percentualExecutado)} 
                      className="h-2"
                    />
                    {item.excedeuLimite && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Execução excede a quantidade total contratada
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {noteDialog.open && noteDialog.activityId && (
        <ActivityNoteDialog
          open={noteDialog.open}
          onOpenChange={(open) => setNoteDialog({ open })}
          reportId={reportId!}
          activityId={noteDialog.activityId}
          orcamentoItemId={noteDialog.orcamentoItemId}
          itemDescricao={noteDialog.itemDescricao || ''}
          source="planilha"
          itemRef={noteDialog.orcamentoItemId}
        />
      )}
    </>
  );
}
