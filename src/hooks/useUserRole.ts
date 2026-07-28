import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'gm' | 'manutencao' | 'contratada' | 'prestadora' | 'demo'; // prestadora mantido para compatibilidade

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('viewer');
  const [isMaintenanceResponsible, setIsMaintenanceResponsible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    if (!user) {
      setRole('viewer');
      setIsMaintenanceResponsible(false);
      setLoading(false);
      return;
    }

    try {
      const [{ data: roleData, error: roleErr }, { data: profileData }] = await Promise.all([
        supabase.rpc('get_user_role', { user_uuid: user.id }),
        (supabase.from('profiles') as any)
          .select('is_maintenance_responsible')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (roleErr) {
        console.error('Error fetching user role:', roleErr);
        setRole('viewer');
      } else {
        setRole((roleData as UserRole) || 'viewer');
      }
      setIsMaintenanceResponsible(!!(profileData as any)?.is_maintenance_responsible);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('viewer');
      setIsMaintenanceResponsible(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserRole();
    } else {
      setRole('viewer');
      setIsMaintenanceResponsible(false);
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
    isMaintenanceResponsible,
    canEditRDO,
    canViewMedicoes,
    canViewObras,
    loading,
    refreshRole
  };
}
