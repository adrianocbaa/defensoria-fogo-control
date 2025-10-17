import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useOrcamentoItems } from "@/hooks/useOrcamentoItems";
import { useRdoActivitiesAcumulado } from "@/hooks/useRdoActivitiesAcumulado";
import { ActivityNoteDialog } from "@/components/rdo/ActivityNoteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { PlanilhaTreeView } from "./PlanilhaTreeView";

interface AtividadesPlanilhaModeProps {
  reportId?: string;
  obraId: string;
  dataRdo: string;
}

export function AtividadesPlanilhaMode({ reportId, obraId, dataRdo }: AtividadesPlanilhaModeProps) {
  const queryClient = useQueryClient();
  const [localExecutado, setLocalExecutado] = useState<Record<string, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);
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

  // Garantir que usamos a atividade correta por item (evitar duplicados), priorizando maior executado_dia
  const activitiesByItem = useMemo(() => {
    const map = new Map<string, any>();
    rdoActivities.forEach((a: any) => {
      if (!a.orcamento_item_id) return;
      const existing = map.get(a.orcamento_item_id);
      if (!existing) {
        map.set(a.orcamento_item_id, a);
      } else {
        const exVal = Number(existing.executado_dia || 0);
        const newVal = Number(a.executado_dia || 0);
        if (newVal > exVal) map.set(a.orcamento_item_id, a);
      }
    });
    return map;
  }, [rdoActivities]);

  // Inicializar valores locais apenas uma vez quando as atividades carregarem
  useEffect(() => {
    if (!isInitialized && !loadingActivities && rdoActivities.length > 0) {
      const initialValues: Record<string, number> = {};
      activitiesByItem.forEach((act, key) => {
        initialValues[key] = Number(act.executado_dia || 0);
      });
      setLocalExecutado(initialValues);
      setIsInitialized(true);
    }
  }, [activitiesByItem, isInitialized, loadingActivities, rdoActivities.length]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de sincronizar');
        return;
      }

      // Para cada item da planilha, criar ou atualizar registro de atividade
      const promises = orcamentoItems.map(async (item) => {
        const existing = activitiesByItem.get(item.id as string);
        
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
    mutationFn: async ({ activityId, value, orcamentoItemId }: { activityId: string; value: number; orcamentoItemId: string }) => {
      // Buscar dados necessários para calcular o progresso corretamente
      const item = orcamentoItems.find(i => i.id === orcamentoItemId);
      const acumulado = acumulados.find(a => a.orcamento_item_id === orcamentoItemId);
      const executadoAcumulado = acumulado?.executado_acumulado || 0;
      const quantidadeTotal = item?.quantidade || 0;
      
      // Calcular progresso real: (acumulado + dia) / total * 100
      const totalExecutado = executadoAcumulado + value;
      const progresso = quantidadeTotal > 0 
        ? Math.min(100, Math.round((totalExecutado / quantidadeTotal) * 100))
        : 0;
      
      const { error } = await supabase
        .from('rdo_activities')
        .update({ 
          executado_dia: value,
          progresso: progresso,
        })
        .eq('id', activityId);
      
      if (error) throw error;
      
      return { orcamentoItemId, value };
    },
    onSuccess: (data) => {
      // Atualizar o estado local com o valor salvo
      if (data) {
        setLocalExecutado(prev => ({ ...prev, [data.orcamentoItemId]: data.value }));
      }
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-planilha', reportId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-activities-acumulado', obraId] });
    },
    onError: (error: any) => {
      // Verificar se é o erro de item sob ADMINISTRAÇÃO
      if (error?.message?.includes('ADMINISTRAÇÃO')) {
        toast.error('Itens sob o macro ADMINISTRAÇÃO não podem receber execução no RDO.');
      } else {
        toast.error('Erro ao atualizar executado');
      }
      console.error('Erro ao atualizar executado:', error);
    },
  });
  
  const handleExecutadoChange = (orcamentoItemId: string, activityId: string, value: number) => {
    setLocalExecutado(prev => ({ ...prev, [orcamentoItemId]: value }));
  };

  const handleExecutadoBlur = (orcamentoItemId: string, activityId: string, value: number) => {
    // Verificar se o item está bloqueado antes de salvar
    const item = orcamentoItems.find(i => i.id === orcamentoItemId);
    if (item?.is_under_administracao) {
      toast.error('Itens sob ADMINISTRAÇÃO não podem receber execução no RDO');
      return;
    }
    updateExecutadoMutation.mutate({ activityId, value, orcamentoItemId });
  };

  // Salvar pendências programaticamente (chamado pelo botão "Salvar")
  const savePending = useCallback(async () => {
    if (!reportId) return;
    const updates: { activityId: string; value: number; orcamentoItemId: string }[] = [];

    orcamentoItems.forEach((item) => {
      const activity = activitiesByItem.get(item.id);
      if (!activity) return;

      const localValue = localExecutado[item.id];
      const currentValue = activity.executado_dia || 0;

      if (typeof localValue === 'number' && localValue !== currentValue) {
        updates.push({ activityId: activity.id, value: localValue, orcamentoItemId: item.id });
      }
    });

    // Executa e aguarda todas as atualizações antes de retornar
    await Promise.all(
      updates.map((u) => updateExecutadoMutation.mutateAsync(u))
    );
  }, [reportId, orcamentoItems, activitiesByItem, localExecutado, updateExecutadoMutation]);

  // Expor função global para o botão Salvar aguardar
  useEffect(() => {
    (window as any).rdoSavePending = savePending;
    return () => { delete (window as any).rdoSavePending; };
  }, [savePending]);

  // Sincronizar automaticamente na primeira vez
  useEffect(() => {
    if (reportId && !loadingActivities && orcamentoItems.length > 0 && rdoActivities.length === 0) {
      syncMutation.mutate();
    }
  }, [reportId, loadingActivities, orcamentoItems.length, rdoActivities.length]);

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
    const activity = activitiesByItem.get(item.id);
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
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Visualização hierárquica da planilha orçamentária (MACRO/MICRO)
          </p>
        </CardHeader>
        <CardContent>
          {itemsComDados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item encontrado na planilha orçamentária.</p>
              <p className="text-sm mt-1">Adicione itens à planilha da obra primeiro.</p>
            </div>
          ) : (
            <PlanilhaTreeView
              items={itemsComDados}
              localExecutado={localExecutado}
              onExecutadoChange={handleExecutadoChange}
              onExecutadoBlur={handleExecutadoBlur}
              onOpenNote={(activityId, orcamentoItemId, itemDescricao) => {
                setNoteDialog({
                  open: true,
                  activityId,
                  orcamentoItemId,
                  itemDescricao,
                });
              }}
              isUpdating={updateExecutadoMutation.isPending}
            />
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
