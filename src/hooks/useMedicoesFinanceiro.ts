import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MedicaoMarco {
  sequencia: number;
  percentualAcumulado: number;
  valorAcumulado: number;
}

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

        // 1. Buscar dados da obra
        const { data: obraData } = await supabase
          .from('obras')
          .select('valor_total, valor_aditivado, percentual_desconto')
          .eq('id', obraId)
          .single();

        // 2. Buscar todas as sessões de medição da obra ordenadas por sequência
        const { data: sessions } = await supabase
          .from('medicao_sessions')
          .select('id, sequencia')
          .eq('obra_id', obraId)
          .order('sequencia', { ascending: true });

        // 3. Buscar todos os itens de medição dessas sessões
        let valorAcumulado = 0;
        const marcos: MedicaoMarco[] = [];
        
        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          const { data: medicaoItems } = await supabase
            .from('medicao_items')
            .select('total, medicao_id')
            .in('medicao_id', sessionIds);
          
          // Calcular valor por sessão para os marcos
          const valorPorSessao: Record<string, number> = {};
          medicaoItems?.forEach(item => {
            valorPorSessao[item.medicao_id] = (valorPorSessao[item.medicao_id] || 0) + (item.total || 0);
          });
          
          valorAcumulado = medicaoItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
          
          // Calcular marcos acumulados por sequência
          let acumulado = 0;
          for (const session of sessions) {
            acumulado += valorPorSessao[session.id] || 0;
            marcos.push({
              sequencia: session.sequencia,
              valorAcumulado: acumulado,
              percentualAcumulado: 0 // Será calculado após obter totalContrato
            });
          }
        }

        // 4. Buscar total do contrato dos itens do orçamento (apenas itens folha)
        const { data: orcamentoItems } = await supabase
          .from('orcamento_items')
          .select('total_contrato, item')
          .eq('obra_id', obraId);

        // Função para verificar se é item folha (não tem filhos)
        const ehItemFolha = (itemCode: string): boolean => {
          if (!orcamentoItems) return true;
          const prefix = itemCode + '.';
          return !orcamentoItems.some(other => other.item.startsWith(prefix));
        };

        // Filtrar apenas itens folha para o cálculo do total do contrato
        const totalContratoOrcamento = orcamentoItems?.reduce((sum, item) => {
          if (ehItemFolha(item.item)) {
            return sum + (item.total_contrato || 0);
          }
          return sum;
        }, 0) || 0;

        // 5. Buscar aditivos bloqueados
        const { data: aditivoSessions } = await supabase
          .from('aditivo_sessions')
          .select('id, status')
          .eq('obra_id', obraId)
          .eq('status', 'bloqueada');

        let totalAditivo = 0;
        if (aditivoSessions && aditivoSessions.length > 0) {
          const aditivoSessionIds = aditivoSessions.map(s => s.id);
          const { data: aditivoItems } = await supabase
            .from('aditivo_items')
            .select('total')
            .in('aditivo_id', aditivoSessionIds);
          
          totalAditivo = aditivoItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
        }

        // Calcular valores
        const valorTotalOriginal = obraData?.valor_total || 0;
        const valorAditivadoObra = obraData?.valor_aditivado || 0;
        
        // Se tem planilha importada, usar total do orçamento + aditivos bloqueados
        // Senão, usar valor da obra + valor aditivado
        const temPlanilha = totalContratoOrcamento > 0;
        const totalContrato = temPlanilha 
          ? totalContratoOrcamento + totalAditivo 
          : valorTotalOriginal + valorAditivadoObra;

        // Percentual executado
        const percentualExecutado = totalContrato > 0 ? (valorAcumulado / totalContrato) * 100 : 0;

        // Atualizar percentuais dos marcos
        const marcosComPercentual = marcos.map(marco => ({
          ...marco,
          percentualAcumulado: totalContrato > 0 ? (marco.valorAcumulado / totalContrato) * 100 : 0
        }));

        setDados({
          valorTotalOriginal: temPlanilha ? totalContratoOrcamento : valorTotalOriginal,
          totalAditivo: temPlanilha ? totalAditivo : valorAditivadoObra,
          totalContrato,
          servicosExecutados: valorAcumulado,
          valorAcumulado,
          percentualExecutado,
          valorPago: valorAcumulado,
          marcos: marcosComPercentual
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
      window.dispatchEvent(new CustomEvent('medicaoAtualizada'));
    }
  };

  return { dados, loading, error, refetch };
};
