import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'editor' | 'viewer';

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
  };

  useEffect(() => {
    fetchUserRole();

    // Set up real-time listener for role changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          if (payload.new && 'role' in payload.new) {
            setRole((payload.new.role as UserRole) || 'viewer');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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