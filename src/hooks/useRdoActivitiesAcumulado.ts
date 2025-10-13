import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivityAcumulado {
  orcamento_item_id: string;
  executado_acumulado: number;
  percentual_acumulado: number;
}

export function useRdoActivitiesAcumulado(obraId: string, dataAtual: string) {
  return useQuery({
    queryKey: ['rdo-activities-acumulado', obraId, dataAtual],
    queryFn: async () => {
      // Buscar todos os RDOs anteriores a esta data
      const { data, error } = await supabase
        .from('rdo_activities')
        .select(`
          orcamento_item_id,
          executado_dia,
          quantidade_total,
          report:rdo_reports!inner(data)
        `)
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .not('orcamento_item_id', 'is', null)
        .lt('report.data', dataAtual);
      
      if (error) throw error;

      // Agrupar e somar por item
      const acumuladoMap = new Map<string, { total: number; quantidade: number }>();
      
      (data || []).forEach((item: any) => {
        const itemId = item.orcamento_item_id;
        const current = acumuladoMap.get(itemId) || { total: 0, quantidade: item.quantidade_total };
        current.total += item.executado_dia || 0;
        acumuladoMap.set(itemId, current);
      });

      // Converter para array
      const result: ActivityAcumulado[] = Array.from(acumuladoMap.entries()).map(([itemId, data]) => ({
        orcamento_item_id: itemId,
        executado_acumulado: data.total,
        percentual_acumulado: data.quantidade > 0 ? (data.total / data.quantidade * 100) : 0,
      }));

      return result;
    },
    enabled: !!obraId && !!dataAtual,
  });
}
