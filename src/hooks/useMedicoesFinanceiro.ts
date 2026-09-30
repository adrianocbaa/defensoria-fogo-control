import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calcularFinanceiroMedicao, MarcoCalculado } from '@/lib/medicaoCalculo';
import { resolveItensEfetivos, MEDICAO_SNAPSHOT_COLUMNS } from '@/lib/medicaoSnapshot';
import { fetchAllPaged } from '@/lib/supabasePaged';

// Re-exporta como MedicaoMarco para retrocompatibilidade
export type MedicaoMarco = MarcoCalculado;

interface MedicaoFinanceira {
  valorTotalOriginal: number;
  totalAditivo: number;
  totalContrato: number;
  servicosExecutados: number;
  valorAcumulado: number;
  percentualExecutado: number;
  valorPago: number;
  marcos: MedicaoMarco[];
}

export const useMedicoesFinanceiro = (obraId: string) => {
  const [dados, setDados] = useState<MedicaoFinanceira>({
    valorTotalOriginal: 0,
    totalAditivo: 0,
    totalContrato: 0,
    servicosExecutados: 0,
    valorAcumulado: 0,
    percentualExecutado: 0,
    valorPago: 0,
    marcos: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obraId) {
      setLoading(false);
      return;
    }

    const fetchMedicoesFinanceiro = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar todos os dados em paralelo (paginado para evitar truncamento
        // silencioso no limite de linhas por requisição)
        const [obraResult, orcItems, sessions, aditivoSessions] = await Promise.all([
          supabase.from('obras').select('valor_total, valor_aditivado').eq('id', obraId).single(),
          fetchAllPaged((from, to) =>
            supabase.from('orcamento_items').select('item, total_contrato, origem, eh_administracao_local')
              .eq('obra_id', obraId).order('id', { ascending: true }).range(from, to)),
          fetchAllPaged((from, to) =>
            supabase.from('medicao_sessions').select('id, sequencia, status, periodo_inicio, periodo_fim, data_vistoria, data_relatorio')
              .eq('obra_id', obraId).order('sequencia', { ascending: true }).order('id', { ascending: true }).range(from, to)),
          fetchAllPaged((from, to) =>
            supabase.from('aditivo_sessions').select('id').eq('obra_id', obraId).eq('status', 'bloqueada')
              .order('id', { ascending: true }).range(from, to)),
        ]);

        if (obraResult.error) throw obraResult.error;
        const obraData = obraResult.data;

        // Buscar itens de medição e aditivos em paralelo (se houver)
        const [medicaoRows, aditivoItems] = await Promise.all([
          sessions.length > 0
            ? fetchAllPaged((from, to) =>
                supabase.from('medicao_items').select(`total, medicao_id, item_code, pct, ${MEDICAO_SNAPSHOT_COLUMNS}`)
                  .in('medicao_id', sessions.map(s => s.id)).order('id', { ascending: true }).range(from, to))
            : Promise.resolve([] as any[]),
          aditivoSessions.length > 0
            ? fetchAllPaged((from, to) =>
                supabase.from('aditivo_items').select('total').in('aditivo_id', aditivoSessions.map(s => s.id))
                  .order('id', { ascending: true }).range(from, to))
            : Promise.resolve([] as any[]),
        ]);

        const medicaoItems = resolveItensEfetivos(medicaoRows);

        // Calcular usando o utilitário centralizado
        const resultado = calcularFinanceiroMedicao(
          orcItems,
          aditivoItems,
          sessions,
          medicaoItems,
          obraData?.valor_total || 0,
          obraData?.valor_aditivado || 0,
        );

        setDados({
          valorTotalOriginal: resultado.totalContratoOrcamento,
          totalAditivo: resultado.totalAditivo,
          totalContrato: resultado.totalContrato,
          servicosExecutados: resultado.valorAcumulado,
          valorAcumulado: resultado.valorAcumulado,
          percentualExecutado: resultado.percentualExecutado,
          valorPago: resultado.valorAcumulado,
          marcos: resultado.marcos,
        });

      } catch (err) {
        console.error('Erro ao buscar dados financeiros das medições:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchMedicoesFinanceiro();

    const handleMedicaoAtualizada = () => fetchMedicoesFinanceiro();
    window.addEventListener('medicaoAtualizada', handleMedicaoAtualizada);
    return () => window.removeEventListener('medicaoAtualizada', handleMedicaoAtualizada);
  }, [obraId]);

  const refetch = () => {
    if (obraId) window.dispatchEvent(new CustomEvent('medicaoAtualizada'));
  };

  return { dados, loading, error, refetch };
};
