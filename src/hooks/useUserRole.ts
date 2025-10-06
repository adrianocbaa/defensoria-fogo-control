import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'gm' | 'manutencao';

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
      // Query user_roles table to get the highest priority role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: true });

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } else if (data && data.length > 0) {
        // Get the highest priority role (admin > gm > editor > manutencao > viewer)
        const roles = data.map(r => r.role);
        if (roles.includes('admin')) setRole('admin');
        else if (roles.includes('gm')) setRole('gm');
        else if (roles.includes('editor')) setRole('editor');
        else if (roles.includes('manutencao')) setRole('manutencao');
        else setRole('viewer');
      } else {
        setRole('viewer');
      }
    } catch (error) {
      console.error('Exception fetching user role:', error);
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
  const canEdit = role === 'admin' || role === 'editor' || role === 'gm';
  const isGM = role === 'gm';

  const refreshRole = () => {
    fetchUserRole();
  };

  return {
    role,
    isAdmin,
    canEdit,
    isGM,
    loading,
    refreshRole
  };
}