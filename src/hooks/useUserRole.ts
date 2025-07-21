import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    console.log('useUserRole: fetchUserRole called, user:', user);
    
    if (!user) {
      console.log('useUserRole: No user, setting viewer role');
      setRole('viewer');
      setLoading(false);
      return;
    }

    try {
      console.log('useUserRole: Fetching role for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      console.log('useUserRole: Supabase response:', { data, error });

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } else {
        const newRole = (data?.role as UserRole) || 'viewer';
        console.log('useUserRole: Setting role to:', newRole);
        setRole(newRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('viewer');
    } finally {
      console.log('useUserRole: Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [user?.id]); // Adicionar user?.id como dependência específica

  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'editor';

  const refreshRole = () => {
    fetchUserRole();
  };

  return {
    role,
    isAdmin,
    canEdit,
    loading,
    refreshRole
  };
}