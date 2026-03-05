import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ValorPagoItem {
  obraId: string;
  valorAcumulado: number;
  totalContrato: number;
  percentual: number;
}

/**
 * Busca diretamente do banco o valor pago acumulado (soma de medicao_items.total)
 * e o total do contrato (orcamento_items.total_contrato) para um conjunto de obras.
 * Usado no mapa para exibir "Valor Pago" sem depender de cache localStorage.
 */
export function useObrasValorPagoMap(obraIds: string[]) {
  return useQuery({
    queryKey: ['obras-valor-pago-map', obraIds.slice().sort().join(',')],
    queryFn: async (): Promise<Record<string, ValorPagoItem>> => {
      if (!obraIds.length) return {};

      // Buscar sessões de medição, itens de orçamento, obras e aditivos em paralelo
      const [sessionsResult, orcResult, obrasResult, aditivoSessionsResult] = await Promise.all([
        supabase
          .from('medicao_sessions')
          .select('id, obra_id')
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

      // Buscar medicao_items e aditivo_items em paralelo
      const sessionIds = sessions.map(s => s.id);
      const aditivoSessionIds = aditivoSessions.map(s => s.id);

      const [medicaoItemsResult, aditivoItemsResult] = await Promise.all([
        sessionIds.length > 0
          ? supabase.from('medicao_items').select('medicao_id, total').in('medicao_id', sessionIds)
          : Promise.resolve({ data: [] as { medicao_id: string; total: number }[] }),
        aditivoSessionIds.length > 0
          ? supabase.from('aditivo_items').select('aditivo_id, total').in('aditivo_id', aditivoSessionIds)
          : Promise.resolve({ data: [] as { aditivo_id: string; total: number }[] }),
      ]);

      const medicaoItems = medicaoItemsResult.data || [];
      const aditivoItems = aditivoItemsResult.data || [];

      // Montar mapa sessionId → obraId e aditivoSessionId → obraId
      const sessionToObra = new Map(sessions.map(s => [s.id, s.obra_id]));
      const aditivoSessionToObra = new Map(aditivoSessions.map(s => [s.id, s.obra_id]));

      // Somar valorAcumulado por obra (soma direta de medicao_items.total)
      const valorAcumuladoPorObra = new Map<string, number>();
      medicaoItems.forEach(item => {
        const obraId = sessionToObra.get(item.medicao_id);
        if (!obraId) return;
        const prev = valorAcumuladoPorObra.get(obraId) || 0;
        valorAcumuladoPorObra.set(obraId, prev + Number(item.total || 0));
      });

      // Somar totalAditivo por obra (aditivo_items de sessões bloqueadas)
      const totalAditivoPorObra = new Map<string, number>();
      aditivoItems.forEach(item => {
        const obraId = aditivoSessionToObra.get(item.aditivo_id);
        if (!obraId) return;
        const prev = totalAditivoPorObra.get(obraId) || 0;
        totalAditivoPorObra.set(obraId, prev + Number(item.total || 0));
      });

      // Calcular totalContrato por obra (itens folha do orçamento + aditivos bloqueados)
      const totalContratoPorObra = new Map<string, number>();
      const orcPorObra = new Map<string, typeof orcItems>();
      orcItems.forEach(oi => {
        const list = orcPorObra.get(oi.obra_id) || [];
        list.push(oi);
        orcPorObra.set(oi.obra_id, list);
      });

      obraIds.forEach(obraId => {
        const items = orcPorObra.get(obraId) || [];
        const totalAditivo = totalAditivoPorObra.get(obraId) || 0;
        if (items.length > 0) {
          // Itens folha contratuais (sem filhos, excluindo extracontratuais pois já estão nos aditivos)
          const totalOrc = items.reduce((sum, oi) => {
            const isLeaf = !items.some(other => other.item.startsWith(oi.item + '.'));
            if (!isLeaf) return sum;
            if (oi.origem === 'extracontratual') return sum;
            return sum + Number(oi.total_contrato || 0);
          }, 0);
          totalContratoPorObra.set(obraId, totalOrc + totalAditivo);
        } else {
          // Fallback: valor_total + valor_aditivado da obra
          const obra = obrasData.find(o => o.id === obraId);
          const fallback = (Number(obra?.valor_total) || 0) + (Number(obra?.valor_aditivado) || 0);
          totalContratoPorObra.set(obraId, fallback);
        }
      });

      // Montar resultado final
      const result: Record<string, ValorPagoItem> = {};
      obraIds.forEach(obraId => {
        const valorAcumulado = Math.round((valorAcumuladoPorObra.get(obraId) || 0) * 100) / 100;
        const totalContrato = totalContratoPorObra.get(obraId) || 0;
        const percentual = totalContrato > 0 ? (valorAcumulado / totalContrato) * 100 : 0;
        result[obraId] = { obraId, valorAcumulado, totalContrato, percentual };
      });

      return result;
    },
    enabled: obraIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
