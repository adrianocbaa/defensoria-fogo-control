import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface ObraPermission {
  canEdit: boolean;
  canDelete: boolean;
  role: 'admin' | 'titular' | 'substituto' | 'access' | 'none';
}

interface UseObraActionPermissionsReturn {
  permissions: Record<string, ObraPermission>;
  loading: boolean;
  error: string | null;
  getPermission: (obraId: string, obraStatus: string) => ObraPermission;
  /** Indica se o usuário pertence ao setor DIF (pode editar obras) */
  isSetorDif: boolean;
}

/**
 * Hook para verificar permissões de ação (editar/excluir) em múltiplas obras.
 * 
 * Regras:
 * - Admin: pode editar e excluir qualquer obra
 * - Fiscal Titular (setor DIF): pode editar obras em andamento, pode excluir suas obras
 * - Fiscal Substituto (setor DIF): pode editar apenas obras "Em Andamento", NÃO pode excluir
 * - User com acesso (user_obra_access, setor DIF): pode editar obras em andamento, NÃO pode excluir
 * - Usuários do setor 2ª SUB: NÃO podem editar obras, apenas visualizar
 */
export function useObraActionPermissions(obraIds: string[]): UseObraActionPermissionsReturn {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<Record<string, ObraPermission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetorDif, setIsSetorDif] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user || obraIds.length === 0) {
      setPermissions({});
      setLoading(false);
      return;
    }

    if (roleLoading) return;

    try {
      setLoading(true);
      setError(null);

      // Se for admin, todas as obras têm permissão total
      if (isAdmin) {
        const adminPermissions: Record<string, ObraPermission> = {};
        obraIds.forEach(id => {
          adminPermissions[id] = { canEdit: true, canDelete: true, role: 'admin' };
        });
        setPermissions(adminPermissions);
        setIsSetorDif(true); // Admin tem acesso completo
        setLoading(false);
        return;
      }

      // Buscar setor atuante do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('setores_atuantes')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar setor do usuário:', profileError);
      }

      const setoresAtuantes = profileData?.setores_atuantes || [];
      const userIsSetorDif = setoresAtuantes.includes('dif');
      setIsSetorDif(userIsSetorDif);

      // Se não for do setor DIF, não pode editar nenhuma obra
      if (!userIsSetorDif) {
        const noEditPermissions: Record<string, ObraPermission> = {};
        obraIds.forEach(id => {
          noEditPermissions[id] = { canEdit: false, canDelete: false, role: 'none' };
        });
        setPermissions(noEditPermissions);
        setLoading(false);
        return;
      }

      // Buscar obras onde o usuário é fiscal titular
      const { data: obrasTitular, error: titularError } = await supabase
        .from('obras')
        .select('id')
        .eq('fiscal_id', user.id)
        .in('id', obraIds);

      if (titularError) throw new Error(titularError.message);

      const titularIds = new Set((obrasTitular || []).map(o => o.id));

      // Buscar obras onde o usuário é substituto
      const { data: substitutos, error: subError } = await supabase
        .from('obra_fiscal_substitutos')
        .select('obra_id')
        .eq('substitute_user_id', user.id)
        .in('obra_id', obraIds);

      if (subError) throw new Error(subError.message);

      const substitutoIds = new Set((substitutos || []).map(s => s.obra_id));

      // Buscar obras com acesso explícito (user_obra_access)
      const { data: accessData, error: accessError } = await supabase
        .from('user_obra_access')
        .select('obra_id')
        .eq('user_id', user.id)
        .in('obra_id', obraIds);

      if (accessError) throw new Error(accessError.message);

      const accessIds = new Set((accessData || []).map(a => a.obra_id));

      // Construir mapa de permissões
      const perms: Record<string, ObraPermission> = {};
      obraIds.forEach(id => {
        if (titularIds.has(id)) {
          perms[id] = { canEdit: true, canDelete: true, role: 'titular' };
        } else if (substitutoIds.has(id)) {
          // Substituto pode editar, mas NÃO pode excluir
          perms[id] = { canEdit: true, canDelete: false, role: 'substituto' };
        } else if (accessIds.has(id)) {
          // Acesso explícito pode editar, mas NÃO pode excluir
          perms[id] = { canEdit: true, canDelete: false, role: 'access' };
        } else {
          perms[id] = { canEdit: false, canDelete: false, role: 'none' };
        }
      });

      setPermissions(perms);
    } catch (err) {
      console.error('Erro ao verificar permissões de obras:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [user?.id, obraIds.join(','), isAdmin, roleLoading]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Retorna a permissão para uma obra específica considerando o status.
   * Substitutos e usuários com acesso só podem editar obras "em_andamento".
   */
  const getPermission = useCallback((obraId: string, obraStatus: string): ObraPermission => {
    const perm = permissions[obraId];
    
    if (!perm) {
      return { canEdit: false, canDelete: false, role: 'none' };
    }

    // Admin sempre pode tudo
    if (perm.role === 'admin') {
      return perm;
    }

    // Titular pode editar qualquer status e excluir
    if (perm.role === 'titular') {
      return perm;
    }

    // Substituto e access: podem editar obras "em_andamento" ou "planejamento"
    if (perm.role === 'substituto' || perm.role === 'access') {
      const canEditThisStatus = obraStatus === 'em_andamento' || obraStatus === 'planejamento';
      return {
        canEdit: canEditThisStatus,
        canDelete: false,
        role: perm.role,
      };
    }

    return { canEdit: false, canDelete: false, role: 'none' };
  }, [permissions]);

  return {
    permissions,
    loading,
    error,
    getPermission,
    isSetorDif,
  };
}
