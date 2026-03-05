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

      // Buscar sessões de medição, itens de orçamento e obras em paralelo
      const [sessionsResult, orcResult, obrasResult] = await Promise.all([
        supabase
          .from('medicao_sessions')
          .select('id, obra_id')
          .in('obra_id', obraIds),
        supabase
          .from('orcamento_items')
          .select('obra_id, item, total_contrato')
          .in('obra_id', obraIds),
        supabase
          .from('obras')
          .select('id, valor_total, valor_aditivado')
          .in('id', obraIds),
      ]);

      const sessions = sessionsResult.data || [];
      const orcItems = orcResult.data || [];
      const obrasData = obrasResult.data || [];

      // Buscar todos os medicao_items das sessões encontradas
      const sessionIds = sessions.map(s => s.id);
      let medicaoItems: { medicao_id: string; total: number }[] = [];

      if (sessionIds.length > 0) {
        const { data } = await supabase
          .from('medicao_items')
          .select('medicao_id, total')
          .in('medicao_id', sessionIds);
        medicaoItems = data || [];
      }

      // Montar mapa sessionId → obraId
      const sessionToObra = new Map(sessions.map(s => [s.id, s.obra_id]));

      // Somar valorAcumulado por obra (soma direta de medicao_items.total)
      const valorAcumuladoPorObra = new Map<string, number>();
      medicaoItems.forEach(item => {
        const obraId = sessionToObra.get(item.medicao_id);
        if (!obraId) return;
        const prev = valorAcumuladoPorObra.get(obraId) || 0;
        valorAcumuladoPorObra.set(obraId, prev + Number(item.total || 0));
      });

      // Calcular totalContrato por obra (itens folha do orçamento)
      const totalContratoPorObra = new Map<string, number>();
      const orcPorObra = new Map<string, typeof orcItems>();
      orcItems.forEach(oi => {
        const list = orcPorObra.get(oi.obra_id) || [];
        list.push(oi);
        orcPorObra.set(oi.obra_id, list);
      });

      obraIds.forEach(obraId => {
        const items = orcPorObra.get(obraId) || [];
        if (items.length > 0) {
          // Apenas itens folha (sem filhos)
          const total = items.reduce((sum, oi) => {
            const isLeaf = !items.some(other => other.item.startsWith(oi.item + '.'));
            return isLeaf ? sum + Number(oi.total_contrato || 0) : sum;
          }, 0);
          totalContratoPorObra.set(obraId, total);
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
