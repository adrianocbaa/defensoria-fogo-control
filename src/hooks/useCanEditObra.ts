import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseCanEditObraReturn {
  canEditObra: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para verificar se o usuário atual pode editar uma obra específica.
 * 
 * A permissão é calculada pela função PostgreSQL `can_edit_obra` que considera:
 * - Administradores podem editar qualquer obra
 * - Editores/GMs podem editar se tiverem acesso explícito na tabela user_obra_access
 * - Fiscal primário (fiscal_id) pode editar sua obra
 * - Fiscais substitutos (obra_fiscal_substitutos) podem editar
 */
export function useCanEditObra(obraId: string | undefined): UseCanEditObraReturn {
  const { user } = useAuth();
  const [canEditObra, setCanEditObra] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermission = useCallback(async () => {
    if (!user || !obraId) {
      setCanEditObra(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('can_edit_obra', {
        obra_uuid: obraId,
        user_uuid: user.id,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setCanEditObra(data === true);
    } catch (err) {
      console.error('Erro ao verificar permissão de edição:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCanEditObra(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, obraId]);

  useEffect(() => {
    fetchPermission();
  }, [fetchPermission]);

  return {
    canEditObra,
    loading,
    error,
    refetch: fetchPermission,
  };
}
