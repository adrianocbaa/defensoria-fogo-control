import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRdoProgressByObra(obraId: string) {
  return useQuery({
    queryKey: ['rdo-progress', obraId],
    queryFn: async () => {
      // 1. Buscar todos os itens do orçamento desta obra (excluindo administração)
      const { data: orcamentoItems, error: orcError } = await supabase
        .from('orcamento_items_hierarquia')
        .select('id, item, quantidade, eh_administracao_local, is_macro, origem')
        .eq('obra_id', obraId)
        .eq('eh_administracao_local', false)
        .or('is_macro.is.null,is_macro.eq.false')
        .neq('origem', 'extracontratual');
      
      if (orcError) throw orcError;
      if (!orcamentoItems || orcamentoItems.length === 0) return 0;

      // 2. Buscar aditivos bloqueados para ajustar quantidades
      const { data: aditivoSessions } = await supabase
        .from('aditivo_sessions')
        .select('id, status')
        .eq('obra_id', obraId)
        .eq('status', 'bloqueada');

      let aditivoAjustes = new Map<string, number>();
      
      if (aditivoSessions && aditivoSessions.length > 0) {
        const sessionIds = aditivoSessions.map(s => s.id);
        const { data: aditivoItems } = await supabase
          .from('aditivo_items')
          .select('item_code, qtd')
          .in('aditivo_id', sessionIds);
        
        // Acumular ajustes por item_code
        aditivoItems?.forEach(item => {
          const code = (item.item_code || '').trim();
          const current = aditivoAjustes.get(code) || 0;
          aditivoAjustes.set(code, current + (item.qtd || 0));
        });
      }

      // 3. Buscar todas as atividades do RDO para esta obra
      const { data: rdoActivities, error: rdoError } = await supabase
        .from('rdo_activities')
        .select('orcamento_item_id, executado_dia')
        .eq('obra_id', obraId)
        .not('orcamento_item_id', 'is', null);
      
      if (rdoError) throw rdoError;
      if (!rdoActivities || rdoActivities.length === 0) return 0;

      // 4. Criar mapa de quantidade AJUSTADA por item do orçamento
      const orcamentoMap = new Map<string, { quantidade: number; itemCode: string }>();
      orcamentoItems.forEach(item => {
        const ajuste = aditivoAjustes.get(item.item) || 0;
        const quantidadeAjustada = Math.max(0, item.quantidade + ajuste);
        orcamentoMap.set(item.id, { quantidade: quantidadeAjustada, itemCode: item.item });
      });

      // 5. Agrupar execução por item (acumular executado_dia de todos os RDOs)
      const executadoMap = new Map<string, number>();
      rdoActivities.forEach(activity => {
        const itemId = activity.orcamento_item_id;
        // Só considerar se o item existe no orçamento (não foi excluído)
        if (orcamentoMap.has(itemId)) {
          const current = executadoMap.get(itemId) || 0;
          executadoMap.set(itemId, current + (activity.executado_dia || 0));
        }
      });

      // 6. Calcular percentual médio ponderado usando quantidades ajustadas
      let somaPercentuais = 0;
      let somaQuantidades = 0;

      orcamentoMap.forEach((itemData, itemId) => {
        const quantidadeAjustada = itemData.quantidade;
        const executadoAcumulado = executadoMap.get(itemId) || 0;
        
        if (quantidadeAjustada > 0) {
          // Limitar executado ao máximo permitido pela quantidade ajustada
          const executadoLimitado = Math.min(executadoAcumulado, quantidadeAjustada);
          const percentual = (executadoLimitado / quantidadeAjustada) * 100;
          somaPercentuais += percentual * quantidadeAjustada;
          somaQuantidades += quantidadeAjustada;
        }
      });

      return somaQuantidades > 0 ? somaPercentuais / somaQuantidades : 0;
    },
    enabled: !!obraId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
