import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRdoProgressByObra(obraId: string) {
  return useQuery({
    queryKey: ['rdo-progress', obraId],
    queryFn: async () => {
      // Buscar todas as atividades do tipo planilha desta obra
      // com join para verificar se o item é de administração
      const { data, error } = await supabase
        .from('rdo_activities')
        .select(`
          orcamento_item_id, 
          executado_dia, 
          quantidade_total,
          orcamento_items!inner(eh_administracao_local)
        `)
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .not('orcamento_item_id', 'is', null);
      
      if (error) throw error;
      if (!data || data.length === 0) return 0;

      // Agrupar por item para calcular totais (excluindo administração)
      const itemMap = new Map<string, { executado: number; total: number }>();
      
      data.forEach((activity: any) => {
        // Pular itens de Administração Local
        if (activity.orcamento_items?.eh_administracao_local) return;
        
        const itemId = activity.orcamento_item_id;
        const current = itemMap.get(itemId) || { executado: 0, total: activity.quantidade_total || 0 };
        current.executado += activity.executado_dia || 0;
        itemMap.set(itemId, current);
      });

      // Calcular percentual médio ponderado
      let somaPercentuais = 0;
      let somaQuantidades = 0;

      itemMap.forEach(({ executado, total }) => {
        if (total > 0) {
          const percentual = (executado / total) * 100;
          somaPercentuais += percentual * total; // Ponderado pela quantidade total
          somaQuantidades += total;
        }
      });

      return somaQuantidades > 0 ? somaPercentuais / somaQuantidades : 0;
    },
    enabled: !!obraId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
