import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivityAcumulado {
  orcamento_item_id: string;
  executado_acumulado: number;
  percentual_acumulado: number;
}

export function useRdoActivitiesAcumulado(obraId: string, dataAtual: string, currentReportId?: string) {
  return useQuery({
    queryKey: ['rdo-activities-acumulado', obraId, dataAtual, currentReportId],
    queryFn: async () => {
      // Buscar todos os RDOs de TODOS os dias, exceto o RDO atual
      // Isso garante que o saldo disponível considere execuções passadas E futuras
      let query = supabase
        .from('rdo_activities')
        .select(`
          orcamento_item_id,
          executado_dia,
          quantidade_total,
          report_id
        `)
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .not('orcamento_item_id', 'is', null);

      // Excluir o RDO atual do acumulado (para não contar com ele mesmo)
      if (currentReportId) {
        query = query.neq('report_id', currentReportId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Agrupar e somar por item
      const acumuladoMap = new Map<string, { total: number; quantidade: number }>();
      
      (data || []).forEach((item: any) => {
        const itemId = item.orcamento_item_id;
        const current = acumuladoMap.get(itemId) || { total: 0, quantidade: item.quantidade_total };
        current.total += item.executado_dia || 0;
        acumuladoMap.set(itemId, current);
      });

      // Converter para array, arredondando para evitar imprecisão de ponto flutuante
      const result: ActivityAcumulado[] = Array.from(acumuladoMap.entries()).map(([itemId, data]) => {
        const executado = Math.round(data.total * 10000) / 10000;
        return {
          orcamento_item_id: itemId,
          executado_acumulado: executado,
          percentual_acumulado: data.quantidade > 0 ? Math.round((executado / data.quantidade * 100) * 10000) / 10000 : 0,
        };
      });

      return result;
    },
    enabled: !!obraId && !!dataAtual,
  });
}
