import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRdoProgressByObra(obraId: string) {
  return useQuery({
    queryKey: ['rdo-progress', obraId],
    queryFn: async () => {
      // 1. Buscar todos os itens do orçamento desta obra (excluindo administração)
      const { data: orcamentoItems, error: orcError } = await supabase
        .from('orcamento_items')
        .select('id, quantidade, eh_administracao_local')
        .eq('obra_id', obraId)
        .eq('eh_administracao_local', false);
      
      if (orcError) throw orcError;
      if (!orcamentoItems || orcamentoItems.length === 0) return 0;

      // 2. Buscar todas as atividades do RDO para esta obra
      const { data: rdoActivities, error: rdoError } = await supabase
        .from('rdo_activities')
        .select('orcamento_item_id, executado_dia')
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .not('orcamento_item_id', 'is', null);
      
      if (rdoError) throw rdoError;
      if (!rdoActivities || rdoActivities.length === 0) return 0;

      // 3. Criar mapa de quantidade por item do orçamento
      const orcamentoMap = new Map<string, number>();
      orcamentoItems.forEach(item => {
        orcamentoMap.set(item.id, item.quantidade);
      });

      // 4. Agrupar execução por item (acumular executado_dia de todos os RDOs)
      const executadoMap = new Map<string, number>();
      rdoActivities.forEach(activity => {
        const itemId = activity.orcamento_item_id;
        // Só considerar se o item existe no orçamento (não foi excluído)
        if (orcamentoMap.has(itemId)) {
          const current = executadoMap.get(itemId) || 0;
          executadoMap.set(itemId, current + (activity.executado_dia || 0));
        }
      });

      // 5. Calcular percentual médio ponderado
      let somaPercentuais = 0;
      let somaQuantidades = 0;

      orcamentoMap.forEach((quantidadeOrcamento, itemId) => {
        const executadoAcumulado = executadoMap.get(itemId) || 0;
        
        if (quantidadeOrcamento > 0) {
          const percentual = Math.min((executadoAcumulado / quantidadeOrcamento) * 100, 100);
          somaPercentuais += percentual * quantidadeOrcamento;
          somaQuantidades += quantidadeOrcamento;
        }
      });

      return somaQuantidades > 0 ? somaPercentuais / somaQuantidades : 0;
    },
    enabled: !!obraId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
