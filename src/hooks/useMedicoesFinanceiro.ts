import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MedicaoFinanceira {
  valorTotalOriginal: number;
  totalAditivo: number;
  totalContrato: number;
  servicosExecutados: number;
  valorAcumulado: number;
  percentualExecutado: number;
  valorPago: number;
}

export const useMedicoesFinanceiro = (obraId: string) => {
  const [dados, setDados] = useState<MedicaoFinanceira>({
    valorTotalOriginal: 0,
    totalAditivo: 0,
    totalContrato: 0,
    servicosExecutados: 0,
    valorAcumulado: 0,
    percentualExecutado: 0,
    valorPago: 0
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

        // 1. Buscar dados da obra
        const { data: obraData } = await supabase
          .from('obras')
          .select('valor_total, valor_aditivado, percentual_desconto')
          .eq('id', obraId)
          .single();

        // 2. Buscar TODOS os itens de medição para calcular o acumulado
        // Agrupa por obra_id e soma todos os totais de todas as medições
        const { data: medicaoItems } = await supabase
          .from('medicao_items')
          .select(`
            total,
            medicao_id,
            medicao_sessions!inner(obra_id)
          `)
          .eq('medicao_sessions.obra_id', obraId);

        // 3. Buscar total do contrato dos itens do orçamento (apenas itens folha)
        const { data: orcamentoItems } = await supabase
          .from('orcamento_items_hierarquia')
          .select('total_contrato, is_macro')
          .eq('obra_id', obraId)
          .or('is_macro.is.null,is_macro.eq.false');

        // 4. Buscar aditivos bloqueados
        const { data: aditivoSessions } = await supabase
          .from('aditivo_sessions')
          .select('id, status')
          .eq('obra_id', obraId)
          .eq('status', 'bloqueada');

        let totalAditivo = 0;
        if (aditivoSessions && aditivoSessions.length > 0) {
          const sessionIds = aditivoSessions.map(s => s.id);
          const { data: aditivoItems } = await supabase
            .from('aditivo_items')
            .select('total')
            .in('aditivo_id', sessionIds);
          
          totalAditivo = aditivoItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
        }

        // Calcular valores
        const valorTotalOriginal = obraData?.valor_total || 0;
        const valorAditivadoObra = obraData?.valor_aditivado || 0;
        
        // Total do contrato: soma dos itens folha do orçamento
        const totalContratoOrcamento = orcamentoItems?.reduce((sum, item) => sum + (item.total_contrato || 0), 0) || 0;
        
        // Se tem planilha importada, usar total do orçamento + aditivos bloqueados
        // Senão, usar valor da obra + valor aditivado
        const temPlanilha = totalContratoOrcamento > 0;
        const totalContrato = temPlanilha 
          ? totalContratoOrcamento + totalAditivo 
          : valorTotalOriginal + valorAditivadoObra;

        // Valor acumulado: soma de TODOS os totais de medição (todas as sessões)
        const valorAcumulado = medicaoItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

        // Percentual executado
        const percentualExecutado = totalContrato > 0 ? (valorAcumulado / totalContrato) * 100 : 0;

        setDados({
          valorTotalOriginal: temPlanilha ? totalContratoOrcamento : valorTotalOriginal,
          totalAditivo: temPlanilha ? totalAditivo : valorAditivadoObra,
          totalContrato,
          servicosExecutados: valorAcumulado,
          valorAcumulado,
          percentualExecutado,
          valorPago: valorAcumulado
        });

      } catch (err) {
        console.error('Erro ao buscar dados financeiros das medições:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchMedicoesFinanceiro();

    // Escutar eventos de atualização de medições
    const handleMedicaoAtualizada = () => {
      fetchMedicoesFinanceiro();
    };

    window.addEventListener('medicaoAtualizada', handleMedicaoAtualizada);

    return () => {
      window.removeEventListener('medicaoAtualizada', handleMedicaoAtualizada);
    };
  }, [obraId]);

  const refetch = () => {
    if (obraId) {
      // Trigger re-fetch by dispatching the event
      window.dispatchEvent(new CustomEvent('medicaoAtualizada'));
    }
  };

  return { dados, loading, error, refetch };
};
