import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calcularFinanceiroMedicao } from '@/lib/medicaoCalculo';

interface ValorPagoItem {
  obraId: string;
  valorAcumulado: number;
  totalContrato: number;
  percentual: number;
}

/**
 * Busca diretamente do banco todos os dados necessários para calcular o financeiro
 * de cada obra usando exatamente o mesmo `calcularFinanceiroMedicao` da tela de medições,
 * garantindo que o percentual exibido no mapa seja idêntico ao da tela.
 */
export function useObrasValorPagoMap(obraIds: string[]) {
  return useQuery({
    queryKey: ['obras-valor-pago-map', obraIds.slice().sort().join(',')],
    queryFn: async (): Promise<Record<string, ValorPagoItem>> => {
      if (!obraIds.length) return {};

      // Buscar todos os dados necessários em paralelo
      const [sessionsResult, orcResult, obrasResult, aditivoSessionsResult] = await Promise.all([
        supabase
          .from('medicao_sessions')
          .select('id, obra_id, sequencia')
          .in('obra_id', obraIds),
        supabase
          .from('orcamento_items')
          .select('obra_id, item, total_contrato, origem')
          .in('obra_id', obraIds),
        supabase
          .from('obras')
          .select('id, valor_total, valor_aditivado')
          .in('id', obraIds),
        supabase
          .from('aditivo_sessions')
          .select('id, obra_id')
          .in('obra_id', obraIds)
          .eq('status', 'bloqueada'),
      ]);

      const sessions = sessionsResult.data || [];
      const orcItems = orcResult.data || [];
      const obrasData = obrasResult.data || [];
      const aditivoSessions = aditivoSessionsResult.data || [];

      const sessionIds = sessions.map(s => s.id);
      const aditivoSessionIds = aditivoSessions.map(s => s.id);

      // Buscar itens de medição e de aditivos em paralelo
      const [medicaoItemsResult, aditivoItemsResult] = await Promise.all([
        sessionIds.length > 0
          ? supabase
              .from('medicao_items')
              .select('medicao_id, item_code, pct, total')
              .in('medicao_id', sessionIds)
          : Promise.resolve({ data: [] as { medicao_id: string; item_code: string; pct: number; total: number }[] }),
        aditivoSessionIds.length > 0
          ? supabase
              .from('aditivo_items')
              .select('aditivo_id, total')
              .in('aditivo_id', aditivoSessionIds)
          : Promise.resolve({ data: [] as { aditivo_id: string; total: number }[] }),
      ]);

      const allMedicaoItems = medicaoItemsResult.data || [];
      const allAditivoItems = aditivoItemsResult.data || [];

      // Calcular resultado por obra usando exatamente calcularFinanceiroMedicao
      const result: Record<string, ValorPagoItem> = {};

      obraIds.forEach(obraId => {
        const obraSessions = sessions.filter(s => s.obra_id === obraId);
        const obraOrcItems = orcItems.filter(oi => oi.obra_id === obraId);
        const obraAditivoSessionIds = new Set(
          aditivoSessions.filter(s => s.obra_id === obraId).map(s => s.id)
        );
        const obraAditivoItems = allAditivoItems.filter(i => obraAditivoSessionIds.has(i.aditivo_id));
        const obraSessionIds = new Set(obraSessions.map(s => s.id));
        const obraMedicaoItems = allMedicaoItems.filter(i => obraSessionIds.has(i.medicao_id));
        const obra = obrasData.find(o => o.id === obraId);

        const calc = calcularFinanceiroMedicao(
          obraOrcItems,
          obraAditivoItems,
          obraSessions,
          obraMedicaoItems,
          Number(obra?.valor_total || 0),
          Number(obra?.valor_aditivado || 0),
        );

        result[obraId] = {
          obraId,
          valorAcumulado: calc.valorAcumulado,
          totalContrato: calc.totalContrato,
          percentual: calc.percentualExecutado,
        };
      });

      return result;
    },
    enabled: obraIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
