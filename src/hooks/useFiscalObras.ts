import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FiscalObra {
  id: string;
  nome: string;
  municipio: string;
  status: string;
  fiscal_id: string | null;
}

interface UseFiscalObrasReturn {
  obras: FiscalObra[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFiscalObras(): UseFiscalObrasReturn {
  const { user } = useAuth();
  const [obras, setObras] = useState<FiscalObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = async () => {
    if (!user) {
      setObras([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar obras onde o usuário é o fiscal titular (não concluídas)
      const { data, error: supabaseError } = await supabase
        .from('obras')
        .select('id, nome, municipio, status, fiscal_id')
        .eq('fiscal_id', user.id)
        .neq('status', 'concluida')
        .order('nome');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setObras(data || []);
    } catch (err) {
      console.error('Erro ao buscar obras do fiscal:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, [user?.id]);

  return {
    obras,
    loading,
    error,
    refetch: fetchObras,
  };
}
