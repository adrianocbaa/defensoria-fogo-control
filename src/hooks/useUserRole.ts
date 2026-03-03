import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'gm' | 'manutencao' | 'contratada' | 'prestadora' | 'demo'; // prestadora mantido para compatibilidade

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    if (!user) {
      setRole('viewer');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_user_role', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } else {
        setRole((data as UserRole) || 'viewer');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('viewer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserRole();
    } else {
      setRole('viewer');
      setLoading(false);
    }
  }, [user?.id]);

  const isAdmin = role === 'admin';
  const isDemo = role === 'demo';
  const canEdit = role === 'admin' || role === 'editor' || role === 'gm';
  const isGM = role === 'gm';
  const isContratada = role === 'contratada' || role === 'prestadora'; // Aceita ambos para compatibilidade
  const canEditRDO = role === 'admin' || role === 'editor' || role === 'gm' || role === 'contratada' || role === 'prestadora' || role === 'demo';
  const canViewMedicoes = role === 'admin' || role === 'editor' || role === 'gm' || role === 'contratada' || role === 'demo';
  const canViewObras = role === 'admin' || role === 'editor' || role === 'gm' || role === 'contratada' || role === 'demo';

  const refreshRole = () => {
    fetchUserRole();
  };

  return {
    role,
    isAdmin,
    isDemo,
    canEdit,
    isGM,
    isContratada,
    canEditRDO,
    canViewMedicoes,
    canViewObras,
    loading,
    refreshRole
  };
}