import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setRole('viewer');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('viewer');
        } else {
          setRole((data?.role as UserRole) || 'viewer');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'editor';

  return {
    role,
    isAdmin,
    canEdit,
    loading
  };
}