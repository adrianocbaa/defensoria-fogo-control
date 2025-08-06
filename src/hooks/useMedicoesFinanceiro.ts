import { useState, useEffect } from 'react';

interface MedicaoFinanceira {
  valorTotalOriginal: number;
  valorAditivado: number;
  valorFinal: number;
  percentualExecutado: number;
  valorPago: number;
}

export const useMedicoesFinanceiro = (obraId: string) => {
  const [dados, setDados] = useState<MedicaoFinanceira>({
    valorTotalOriginal: 0,
    valorAditivado: 0,
    valorFinal: 0,
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

        // Por enquanto, retornar dados zerados até que as tabelas de medições sejam criadas
        // Esta integração será ativada quando as tabelas medicoes e aditivos forem criadas no Supabase
        
        // Simular um pequeno delay para mostrar o loading
        await new Promise(resolve => setTimeout(resolve, 500));

        setDados({
          valorTotalOriginal: 0,
          valorAditivado: 0,
          valorFinal: 0,
          percentualExecutado: 0,
          valorPago: 0
        });

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
            valorAditivado: 0,
            valorFinal: 0,
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