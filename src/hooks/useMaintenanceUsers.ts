import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceUser {
  id: string;
  user_id: string;
  display_name: string;
}

export function useMaintenanceUsers() {
  const [users, setUsers] = useState<MaintenanceUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceUsers = async () => {
      try {
        // Get user IDs with manutencao role from user_roles table
        const { data: userRolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'manutencao');

        if (rolesError) throw rolesError;

        if (!userRolesData || userRolesData.length === 0) {
          setUsers([]);
          return;
        }

        const userIds = userRolesData.map(ur => ur.user_id);

        // Get profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, display_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        setUsers(profilesData || []);
      } catch (error) {
        console.error('Error fetching maintenance users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceUsers();
  }, []);

  return { users, loading };
}