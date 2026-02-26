import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOrcamentoItems } from "@/hooks/useOrcamentoItems";
import { useRdoActivitiesAcumulado } from "@/hooks/useRdoActivitiesAcumulado";
import { useAditivosParaRdo, calcularAjusteAditivos } from "@/hooks/useAditivosParaRdo";
import { ActivityNoteDialog } from "@/components/rdo/ActivityNoteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { PlanilhaTreeView } from "./PlanilhaTreeView";
import { useUserRole } from "@/hooks/useUserRole";
interface AtividadesPlanilhaModeProps {
  reportId?: string;
  obraId: string;
  dataRdo: string;
  disabled?: boolean;
}

export function AtividadesPlanilhaMode({ reportId, obraId, dataRdo, disabled }: AtividadesPlanilhaModeProps) {
  const queryClient = useQueryClient();
  const { isContratada } = useUserRole();
  const [localExecutado, setLocalExecutado] = useState<Record<string, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    activityId?: string;
    orcamentoItemId?: string;
    itemDescricao?: string;
  }>({ open: false });

  const { data: orcamentoItems = [], isLoading: loadingOrcamento } = useOrcamentoItems(obraId);
  const { data: acumulados = [], isLoading: loadingAcumulados } = useRdoActivitiesAcumulado(obraId, dataRdo, reportId);
  const { data: aditivos = [], isLoading: loadingAditivos } = useAditivosParaRdo(obraId);

  // Criar mapas para correspondência de códigos de aditivos
  const codigoToItemCode = useMemo(() => {
    const map = new Map<string, string>();
    orcamentoItems.forEach(item => {
      // Mapear código de banco (SINAPI, etc) para o item code hierárquico
      if (item.codigo) {
        map.set(item.codigo.trim(), item.item);
      }
    });
    return map;
  }, [orcamentoItems]);

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

  // Buscar contagem de notas por atividade
  const { data: activityNotesData = [] } = useQuery({
    queryKey: ['rdo-activity-notes-count', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_activity_notes')
        .select('activity_id')
        .eq('report_id', reportId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!reportId,
  });

  // Criar mapa de contagem de notas por activityId
  const activityNotesMap = useMemo(() => {
    const map = new Map<string, number>();
    activityNotesData.forEach((note: any) => {
      const count = map.get(note.activity_id) || 0;
      map.set(note.activity_id, count + 1);
    });
    return map;
  }, [activityNotesData]);

  // Buscar status do RDO
  const { data: rdoReport } = useQuery({
    queryKey: ['rdo-report-status', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('rdo_reports')
        .select('status')
        .eq('id', reportId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  const isRdoApproved = rdoReport?.status === 'aprovado';
  const isDisabled = disabled || isRdoApproved;

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

  // Resetar estado quando reportId mudar
  useEffect(() => {
    setIsInitialized(false);
    setLocalExecutado({});
  }, [reportId]);

  // Inicializar valores locais APENAS na primeira carga (quando ainda não foi inicializado)
  useEffect(() => {
    if (!loadingActivities && rdoActivities.length > 0 && !isInitialized) {
      const initialValues: Record<string, number> = {};
      activitiesByItem.forEach((act, key) => {
        initialValues[key] = Number(act.executado_dia || 0);
      });
      setLocalExecutado(initialValues);
      setIsInitialized(true);
    }
  }, [rdoActivities, loadingActivities, isInitialized]);

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
      
      // Calcular ajuste de aditivos para usar quantidade ajustada
      const ajusteAditivo = (item && item.origem !== 'extracontratual') ? calcularAjusteAditivos(item.item, aditivos, codigoToItemCode) : 0;
      const quantidadeAjustada = Math.max(0, (item?.quantidade || 0) + ajusteAditivo);
      
      // Calcular progresso real: (acumulado + dia) / total ajustado * 100
      const totalExecutado = executadoAcumulado + value;
      const progresso = quantidadeAjustada > 0 
        ? Math.min(100, Math.round((totalExecutado / quantidadeAjustada) * 100))
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
  });

  // Referência para atualizações pendentes (deve ser declarado antes do uso)
  const pendingUpdatesRef = useRef<Map<string, { activityId: string; value: number }>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleExecutadoChange = (orcamentoItemId: string, activityId: string, value: number) => {
    // Calcular saldo disponível para impedir que ultrapasse o limite contratual
    const item = orcamentoItems.find(i => i.id === orcamentoItemId);
    const acumulado = acumulados.find(a => a.orcamento_item_id === orcamentoItemId);
    const executadoAcumulado = acumulado?.executado_acumulado || 0;
    const ajusteAditivo = (item && item.origem !== 'extracontratual') ? calcularAjusteAditivos(item.item, aditivos, codigoToItemCode) : 0;
    const quantidadeAjustada = Math.max(0, (item?.quantidade || 0) + ajusteAditivo);
    // Manter precisão total internamente para cálculos financeiros
    const saldoDisponivel = Math.max(0, quantidadeAjustada - executadoAcumulado);
    // Clamp sem arredondar — preserva precisão para a medição
    const clampedValue = Math.min(value, saldoDisponivel);
    // Apenas para exibição no toast, mostrar 2 casas decimais
    if (value > saldoDisponivel && saldoDisponivel >= 0) {
      const saldoDisplay = saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      toast.warning(`Quantidade máxima permitida: ${saldoDisplay}. O valor foi ajustado automaticamente.`);
    }

    setLocalExecutado(prev => ({ ...prev, [orcamentoItemId]: clampedValue }));
    // Agendar auto-save
    pendingUpdatesRef.current.set(orcamentoItemId, { activityId, value: clampedValue });
  };

  // Auto-save com debounce
  useEffect(() => {
    if (pendingUpdatesRef.current.size === 0) return;
    
    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Agendar save após 500ms de inatividade
    debounceTimerRef.current = setTimeout(() => {
      const updates = Array.from(pendingUpdatesRef.current.entries());
      pendingUpdatesRef.current.clear();
      
      updates.forEach(([orcamentoItemId, { activityId, value }]) => {
        updateExecutadoMutation.mutate({ activityId, value, orcamentoItemId });
      });
    }, 500);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localExecutado]);

  const handleExecutadoBlur = (orcamentoItemId: string, activityId: string, value: number) => {
    // Recalcular saldo no blur também para garantir consistência
    const item = orcamentoItems.find(i => i.id === orcamentoItemId);
    const acumulado = acumulados.find(a => a.orcamento_item_id === orcamentoItemId);
    const executadoAcumulado = acumulado?.executado_acumulado || 0;
    const ajusteAditivo = (item && item.origem !== 'extracontratual') ? calcularAjusteAditivos(item.item, aditivos, codigoToItemCode) : 0;
    const quantidadeAjustada = Math.max(0, (item?.quantidade || 0) + ajusteAditivo);
    const saldoDisponivel = Math.max(0, quantidadeAjustada - executadoAcumulado);
    const clampedValue = Math.min(value, saldoDisponivel);

    if (clampedValue !== value) {
      setLocalExecutado(prev => ({ ...prev, [orcamentoItemId]: clampedValue }));
    }

    // Salvar imediatamente no blur (caso o usuário saia do campo)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    pendingUpdatesRef.current.delete(orcamentoItemId);
    updateExecutadoMutation.mutate({ activityId, value: clampedValue, orcamentoItemId });
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

  // Sincronizar automaticamente quando houver itens sem atividades
  // Dependência em activitiesByItem.size garante re-disparo após cada sync parcial
  useEffect(() => {
    if (!reportId || loadingActivities || loadingOrcamento || orcamentoItems.length === 0 || syncMutation.isPending) return;
    const itemsSemAtividade = orcamentoItems.filter(item => !activitiesByItem.has(item.id as string));
    if (itemsSemAtividade.length > 0) {
      syncMutation.mutate();
    }
  }, [reportId, loadingActivities, loadingOrcamento, orcamentoItems.length, activitiesByItem.size]);

  if (loadingOrcamento || loadingAcumulados || loadingActivities || loadingAditivos) {
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
    
    // Itens extracontratuais já têm a quantidade correta do aditivo — não somar novamente.
    // O ajuste de aditivos só se aplica a itens do contrato original (folha) com supressões/acréscimos.
    const ajusteAditivo = item.origem === 'extracontratual'
      ? 0
      : calcularAjusteAditivos(item.item, aditivos, codigoToItemCode);
    
    // Quantidade ajustada = quantidade original + ajustes de aditivos
    const quantidadeAjustada = Math.max(0, item.quantidade + ajusteAditivo);
    
    const totalExecutado = executadoAcumulado + executadoDia;
    const percentualExecutado = quantidadeAjustada > 0 ? (totalExecutado / quantidadeAjustada * 100) : 0;
    const disponivel = Math.max(0, quantidadeAjustada - executadoAcumulado);
    // Usar tolerância para evitar falso positivo por imprecisão de ponto flutuante
    const excedeuLimite = totalExecutado > quantidadeAjustada + 0.0001;

    return {
      ...item,
      activity,
      executadoAcumulado,
      executadoDia,
      totalExecutado,
      percentualExecutado,
      disponivel,
      excedeuLimite,
      quantidadeOriginal: item.quantidade,
      quantidadeAjustada,
      ajusteAditivo,
    };
  });

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Lista de Serviços (Planilha)</CardTitle>
              </div>
              <SaveIndicator isSaving={updateExecutadoMutation.isPending || syncMutation.isPending} />
            </div>
            {/* Botão de sincronização manual — fallback caso o automático falhe */}
            {reportId && orcamentoItems.filter(i => !activitiesByItem.has(i.id as string)).length > 0 && (
              <button
                onClick={() => syncMutation.mutate()}
                className="text-xs text-primary underline"
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? 'Sincronizando...' : `⟳ Carregar campos faltantes (${orcamentoItems.filter(i => !activitiesByItem.has(i.id as string)).length} itens)`}
              </button>
            )}
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
              isRdoApproved={isDisabled}
              isContratada={isContratada}
              activityNotes={activityNotesMap}
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
