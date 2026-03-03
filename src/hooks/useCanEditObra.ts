import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface UseCanEditObraReturn {
  canEditObra: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  role: 'admin' | 'titular' | 'substituto' | 'access' | 'none';
  obraStatus: string | null;
  isStatusRestricted: boolean;
  isSetorRestricted: boolean;
}

export function useCanEditObra(obraId: string | undefined): UseCanEditObraReturn {
  const { user } = useAuth();
  const { isAdmin, isDemo, loading: roleLoading } = useUserRole();
  const [canEditObra, setCanEditObra] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'titular' | 'substituto' | 'access' | 'none'>('none');
  const [obraStatus, setObraStatus] = useState<string | null>(null);
  const [isStatusRestricted, setIsStatusRestricted] = useState(false);
  const [isSetorRestricted, setIsSetorRestricted] = useState(false);

  const fetchPermission = useCallback(async () => {
    if (!user || !obraId) {
      setCanEditObra(false);
      setLoading(false);
      setRole('none');
      setObraStatus(null);
      setIsStatusRestricted(false);
      setIsSetorRestricted(false);
      return;
    }

    if (roleLoading) return;

    try {
      setLoading(true);
      setError(null);

      // Demo: acesso completo à obra demo sem verificações adicionais
      if (isDemo) {
        setCanEditObra(true);
        setRole('titular');
        setIsStatusRestricted(false);
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

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
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

      setObraStatus(obra.status);

      // Admin sempre pode editar
      if (isAdmin) {
        setCanEditObra(true);
        setRole('admin');
        setIsStatusRestricted(false);
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

      // Verificar setor atuante do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('setores_atuantes')
        .eq('user_id', user.id)
        .single();

      const setoresAtuantes = profileData?.setores_atuantes || [];
      const isSetorDif = setoresAtuantes.includes('dif');

      if (!isSetorDif) {
        setCanEditObra(false);
        setRole('none');
        setIsStatusRestricted(false);
        setIsSetorRestricted(true);
        setLoading(false);
        return;
      }

      if (obra.fiscal_id === user.id) {
        setCanEditObra(true);
        setRole('titular');
        setIsStatusRestricted(false);
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

      const { data: substituto } = await supabase
        .from('obra_fiscal_substitutos')
        .select('id')
        .eq('obra_id', obraId)
        .eq('substitute_user_id', user.id)
        .maybeSingle();

      if (substituto) {
        const canEdit = obra.status === 'em_andamento' || obra.status === 'planejamento';
        setCanEditObra(canEdit);
        setRole('substituto');
        setIsStatusRestricted(!canEdit);
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

      const { data: access } = await supabase
        .from('user_obra_access')
        .select('id')
        .eq('obra_id', obraId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (access) {
        const canEdit = obra.status === 'em_andamento' || obra.status === 'planejamento';
        setCanEditObra(canEdit);
        setRole('access');
        setIsStatusRestricted(!canEdit);
        setIsSetorRestricted(false);
        setLoading(false);
        return;
      }

      // Sem permissão
      setCanEditObra(false);
      setRole('none');
      setIsStatusRestricted(false);
      setIsSetorRestricted(false);
    } catch (err) {
      console.error('Erro ao verificar permissão de edição:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCanEditObra(false);
      setRole('none');
      setObraStatus(null);
      setIsStatusRestricted(false);
      setIsSetorRestricted(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, obraId, isAdmin, isDemo, roleLoading]);

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
    isSetorRestricted,
  };
}
