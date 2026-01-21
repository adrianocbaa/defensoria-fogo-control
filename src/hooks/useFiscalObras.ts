import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FiscalObra {
  id: string;
  nome: string;
  municipio: string;
  status: string;
  fiscal_id: string | null;
  role: 'titular' | 'substituto';
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
      const { data: obrasTitular, error: titularError } = await supabase
        .from('obras')
        .select('id, nome, municipio, status, fiscal_id')
        .eq('fiscal_id', user.id)
        .neq('status', 'concluida')
        .order('nome');

      if (titularError) {
        throw new Error(titularError.message);
      }

      // Buscar obras onde o usuário é fiscal substituto
      const { data: substitutos, error: substitutosError } = await supabase
        .from('obra_fiscal_substitutos')
        .select('obra_id')
        .eq('substitute_user_id', user.id);

      if (substitutosError) {
        throw new Error(substitutosError.message);
      }

      const obraIdsSubstituto = substitutos?.map(s => s.obra_id) || [];

      let obrasSubstituto: typeof obrasTitular = [];
      if (obraIdsSubstituto.length > 0) {
        const { data: obrasSubData, error: obrasSubError } = await supabase
          .from('obras')
          .select('id, nome, municipio, status, fiscal_id')
          .in('id', obraIdsSubstituto)
          .neq('status', 'concluida')
          .order('nome');

        if (obrasSubError) {
          throw new Error(obrasSubError.message);
        }
        obrasSubstituto = obrasSubData || [];
      }

      // Combinar e marcar o papel do usuário
      const titularIds = new Set((obrasTitular || []).map(o => o.id));
      
      const combinedObras: FiscalObra[] = [
        ...(obrasTitular || []).map(o => ({ ...o, role: 'titular' as const })),
        ...obrasSubstituto
          .filter(o => !titularIds.has(o.id)) // Evitar duplicatas
          .map(o => ({ ...o, role: 'substituto' as const })),
      ];

      // Ordenar: titulares primeiro, depois substitutos, alfabético dentro de cada grupo
      combinedObras.sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === 'titular' ? -1 : 1;
        }
        return a.nome.localeCompare(b.nome);
      });

      setObras(combinedObras);
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
