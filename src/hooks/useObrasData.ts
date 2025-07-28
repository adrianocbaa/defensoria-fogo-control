import { useState, useEffect } from 'react';
import { obrasSimuladas, type Obra } from '@/data/mockObras';

interface UseObrasDataReturn {
  obras: Obra[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useObrasData(): UseObrasDataReturn {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API delay for realistic loading experience
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Simulate potential network issues (5% chance)
      if (Math.random() < 0.05) {
        throw new Error('Erro ao carregar dados das obras');
      }
      
      setObras(obrasSimuladas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, []);

  const refetch = () => {
    fetchObras();
  };

  return {
    obras,
    loading,
    error,
    refetch
  };
}