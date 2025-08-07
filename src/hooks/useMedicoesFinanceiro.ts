import { useState, useEffect } from 'react';

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

        // Tentar buscar dados do resumo financeiro no localStorage
        const resumoSalvo = localStorage.getItem(`resumo_financeiro_${obraId}`);
        
        if (resumoSalvo) {
          const resumo = JSON.parse(resumoSalvo);
          const servicosExecutados = resumo.servicosExecutados || 0;
          const valorAcumulado = resumo.valorAcumulado || 0;
          const totalContrato = resumo.totalContrato || 0;
          const percentualExecutado = totalContrato > 0 ? (valorAcumulado / totalContrato) * 100 : 0;
          
          setDados({
            valorTotalOriginal: resumo.valorTotalOriginal || 0,
            totalAditivo: resumo.totalAditivo || 0,
            totalContrato: totalContrato,
            servicosExecutados: servicosExecutados,
            valorAcumulado: valorAcumulado,
            percentualExecutado: percentualExecutado,
            valorPago: 0 // Mantém valor pago zerado por enquanto
          });
        } else {
          // Se não há dados salvos, retornar zeros
          setDados({
            valorTotalOriginal: 0,
            totalAditivo: 0,
            totalContrato: 0,
            servicosExecutados: 0,
            valorAcumulado: 0,
            percentualExecutado: 0,
            valorPago: 0
          });
        }

        // TODO: Implementar quando as tabelas forem criadas:
        // 1. Buscar medições: supabase.from('medicoes').select(...).eq('obra_id', obraId)
        // 2. Buscar aditivos: supabase.from('aditivos').select(...).eq('obra_id', obraId)
        // 3. Calcular valores financeiros baseados nos dados das medições

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
      // Reexecutar a busca
      const fetchMedicoesFinanceiro = async () => {
        try {
          setLoading(true);
          setError(null);

          await new Promise(resolve => setTimeout(resolve, 500));

          setDados({
            valorTotalOriginal: 0,
            totalAditivo: 0,
            totalContrato: 0,
            servicosExecutados: 0,
            valorAcumulado: 0,
            percentualExecutado: 0,
            valorPago: 0
          });

        } catch (err) {
          console.error('Erro ao buscar dados financeiros das medições:', err);
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
          setLoading(false);
        }
      };
      fetchMedicoesFinanceiro();
    }
  };

  return { dados, loading, error, refetch };
};