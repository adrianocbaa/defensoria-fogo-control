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
      // Buscar apenas RDOs de dias ANTERIORES ao dia atual (lógica progressiva/sequencial).
      // Isso garante que o acumulado exibido no RDO do dia X reflita somente
      // o que foi executado até o dia X-1, sem contaminar com execuções futuras.
      //
      // IMPORTANTE: fazer em 2 passos. O filtro em campo de tabela embarcada
      // (`rdo_reports.data` via `!inner`) nem sempre é aplicado corretamente
      // pelo PostgREST e estava deixando passar tudo OU truncando — provocando
      // acumulado zerado em itens cujas atividades estavam mais ao final do
      // resultado (caso real: itens 2.13 e 2.14 da obra de Paranatinga).

      // Passo 1: IDs de RDOs anteriores ao dia atual
      const { data: reports, error: reportsError } = await supabase
        .from('rdo_reports')
        .select('id')
        .eq('obra_id', obraId)
        .lt('data', dataAtual)
        .limit(10000);

      if (reportsError) throw reportsError;

      const reportIds = (reports || []).map((r) => r.id);
      if (reportIds.length === 0) return [];

      // Passo 2: atividades de planilha desses RDOs
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('orcamento_item_id, executado_dia, quantidade_total, report_id')
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .not('orcamento_item_id', 'is', null)
        .in('report_id', reportIds)
        .limit(100000);

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
