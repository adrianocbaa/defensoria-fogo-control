import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Substituto {
  id: string;
  substitute_user_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

interface UseObraSubstitutosReturn {
  substitutos: Substituto[];
  loading: boolean;
  addSubstituto: (userId: string) => Promise<boolean>;
  removeSubstituto: (id: string) => Promise<boolean>;
  refetch: () => void;
}

export function useObraSubstitutos(obraId: string | null): UseObraSubstitutosReturn {
  const [substitutos, setSubstitutos] = useState<Substituto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubstitutos = async () => {
    if (!obraId) {
      setSubstitutos([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('obra_fiscal_substitutos')
        .select(`
          id,
          substitute_user_id,
          created_at
        `)
        .eq('obra_id', obraId);

      if (error) throw error;

      // Buscar perfis dos substitutos
      const userIds = data?.map(s => s.substitute_user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [p.user_id, { display_name: p.display_name, email: p.email }]) || []
        );

        setSubstitutos(
          data?.map(s => ({
            ...s,
            profile: profileMap.get(s.substitute_user_id),
          })) || []
        );
      } else {
        setSubstitutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar substitutos:', error);
      toast.error('Erro ao carregar substitutos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutos();
  }, [obraId]);

  const addSubstituto = async (userId: string): Promise<boolean> => {
    if (!obraId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('obra_fiscal_substitutos')
        .insert({
          obra_id: obraId,
          substitute_user_id: userId,
          created_by: user?.id || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuário já é um substituto desta obra');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Fiscal substituto adicionado!');
      await fetchSubstitutos();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar substituto:', error);
      toast.error('Erro ao adicionar fiscal substituto');
      return false;
    }
  };

  const removeSubstituto = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('obra_fiscal_substitutos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Fiscal substituto removido!');
      await fetchSubstitutos();
      return true;
    } catch (error) {
      console.error('Erro ao remover substituto:', error);
      toast.error('Erro ao remover fiscal substituto');
      return false;
    }
  };

  return {
    substitutos,
    loading,
    addSubstituto,
    removeSubstituto,
    refetch: fetchSubstitutos,
  };
}
