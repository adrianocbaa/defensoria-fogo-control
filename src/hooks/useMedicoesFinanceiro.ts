import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MedicaoMarco {
  sequencia: number;
  percentualAcumulado: number;
  valorAcumulado: number;
  valorMedicao: number; // Valor individual da medição
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

        // 1. Buscar dados da obra e itens do orçamento em paralelo
        const [obraResult, orcResult, sessionsResult] = await Promise.all([
          supabase.from('obras').select('valor_total, valor_aditivado, percentual_desconto').eq('id', obraId).single(),
          supabase.from('orcamento_items').select('item, total_contrato').eq('obra_id', obraId),
          supabase.from('medicao_sessions').select('id, sequencia').eq('obra_id', obraId).order('sequencia', { ascending: true }),
        ]);

        const obraData = obraResult.data;
        const orcItems = orcResult.data || [];
        const sessions = sessionsResult.data || [];

        // Identificar itens folha do orçamento (sem filhos)
        const prefixosComFilhos = new Set<string>();
        orcItems.forEach(oi => {
          const partes = oi.item.split('.');
          for (let i = 1; i < partes.length; i++) {
            prefixosComFilhos.add(partes.slice(0, i).join('.'));
          }
        });

        // Mapa item_code -> total_contrato (apenas itens folha com total_contrato > 0)
        // Usado para calcular valor da medição via pct × total_contrato (mesma lógica da tabela)
        const totalContratoPorItem = new Map<string, number>();
        let totalContratoOrcamento = 0;
        orcItems.forEach(oi => {
          const ehFolha = !prefixosComFilhos.has(oi.item);
          if (ehFolha) {
            totalContratoOrcamento += oi.total_contrato || 0;
            if ((oi.total_contrato || 0) > 0) {
              totalContratoPorItem.set(oi.item, oi.total_contrato);
            }
          }
        });

        // Função para calcular valor de um item de medição — igual à lógica da tabela:
        // itens com total_contrato → pct × total_contrato
        // itens extracontratuais (total_contrato = 0) → total direto do banco
        const calcularValorItem = (item: { item_code: string; pct: number; total: number }): number => {
          const totalContrato = totalContratoPorItem.get(item.item_code);
          if (totalContrato !== undefined && totalContrato > 0) {
            return Math.round((item.pct / 100) * totalContrato * 100) / 100;
          }
          return Math.round((item.total || 0) * 100) / 100;
        };

        // 2. Buscar itens de medição e calcular acumulados
        let valorAcumulado = 0;
        const marcos: MedicaoMarco[] = [];

        if (sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          const { data: medicaoItems } = await supabase
            .from('medicao_items')
            .select('total, medicao_id, item_code, pct')
            .in('medicao_id', sessionIds);

          // Calcular valor por sessão
          const valorPorSessao: Record<string, number> = {};
          medicaoItems?.forEach(item => {
            const valor = calcularValorItem(item);
            valorPorSessao[item.medicao_id] = (valorPorSessao[item.medicao_id] || 0) + valor;
          });

          valorAcumulado = medicaoItems?.reduce((sum, item) => sum + calcularValorItem(item), 0) || 0;

          // Calcular marcos acumulados por sequência
          let acumulado = 0;
          for (const session of sessions) {
            const valorMedicao = valorPorSessao[session.id] || 0;
            acumulado += valorMedicao;
            marcos.push({
              sequencia: session.sequencia,
              valorAcumulado: acumulado,
              valorMedicao: valorMedicao,
              percentualAcumulado: 0 // Será calculado após obter totalContrato
            });
          }
        }

        // 3. Buscar aditivos bloqueados
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

        // Calcular valores finais
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
          percentualAcumulado: totalContrato > 0 ? (marco.valorAcumulado / totalContrato) * 100 : 0,
          percentualMedicao: totalContrato > 0 ? (marco.valorMedicao / totalContrato) * 100 : 0
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
