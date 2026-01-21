import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface UseCanEditObraReturn {
  canEditObra: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Papel do usuário em relação à obra */
  role: 'admin' | 'titular' | 'substituto' | 'access' | 'none';
  /** Status atual da obra */
  obraStatus: string | null;
  /** Se a restrição é por status (substituto/access tentando editar obra fora de "em_andamento") */
  isStatusRestricted: boolean;
}

/**
 * Hook para verificar se o usuário atual pode editar uma obra específica.
 * 
 * A permissão é calculada considerando:
 * - Administradores podem editar qualquer obra
 * - Fiscal titular pode editar sua obra
 * - Fiscais substitutos podem editar apenas obras "Em Andamento"
 * - Usuários com acesso explícito (user_obra_access) podem editar apenas obras "Em Andamento"
 */
export function useCanEditObra(obraId: string | undefined): UseCanEditObraReturn {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [canEditObra, setCanEditObra] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'titular' | 'substituto' | 'access' | 'none'>('none');
  const [obraStatus, setObraStatus] = useState<string | null>(null);
  const [isStatusRestricted, setIsStatusRestricted] = useState(false);

  const fetchPermission = useCallback(async () => {
    if (!user || !obraId) {
      setCanEditObra(false);
      setLoading(false);
      setRole('none');
      setObraStatus(null);
      setIsStatusRestricted(false);
      return;
    }

    if (roleLoading) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar dados da obra
      const { data: obra, error: obraError } = await supabase
        .from('obras')
        .select('status, fiscal_id')
        .eq('id', obraId)
        .single();

      if (obraError || !obra) {
        setCanEditObra(false);
        setRole('none');
        setObraStatus(null);
        setIsStatusRestricted(false);
        setLoading(false);
        return;
      }

      setObraStatus(obra.status);

      // Admin sempre pode editar
      if (isAdmin) {
        setCanEditObra(true);
        setRole('admin');
        setIsStatusRestricted(false);
        setLoading(false);
        return;
      }

      // Verificar se é fiscal titular
      if (obra.fiscal_id === user.id) {
        setCanEditObra(true);
        setRole('titular');
        setIsStatusRestricted(false);
        setLoading(false);
        return;
      }

      // Verificar se é fiscal substituto
      const { data: substituto } = await supabase
        .from('obra_fiscal_substitutos')
        .select('id')
        .eq('obra_id', obraId)
        .eq('substitute_user_id', user.id)
        .maybeSingle();

      if (substituto) {
        // Substituto só pode editar obras "em_andamento"
        const canEdit = obra.status === 'em_andamento';
        setCanEditObra(canEdit);
        setRole('substituto');
        setIsStatusRestricted(!canEdit);
        setLoading(false);
        return;
      }

      // Verificar acesso explícito (user_obra_access)
      const { data: access } = await supabase
        .from('user_obra_access')
        .select('id')
        .eq('obra_id', obraId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (access) {
        // Acesso explícito só permite editar obras "em_andamento"
        const canEdit = obra.status === 'em_andamento';
        setCanEditObra(canEdit);
        setRole('access');
        setIsStatusRestricted(!canEdit);
        setLoading(false);
        return;
      }

      // Sem permissão
      setCanEditObra(false);
      setRole('none');
      setIsStatusRestricted(false);
    } catch (err) {
      console.error('Erro ao verificar permissão de edição:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCanEditObra(false);
      setRole('none');
      setObraStatus(null);
      setIsStatusRestricted(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, obraId, isAdmin, roleLoading]);

  useEffect(() => {
    fetchPermission();
  }, [fetchPermission]);

  return {
    canEditObra,
    loading,
    error,
    refetch: fetchPermission,
    role,
    obraStatus,
    isStatusRestricted,
  };
}
