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
        // Get user_ids with manutencao role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'manutencao');

        if (roleError) throw roleError;
        
        if (!roleData || roleData.length === 0) {
          setUsers([]);
          return;
        }

        const userIds = roleData.map(r => r.user_id);

        // Get profiles for those users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, display_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;
        setUsers((profilesData || []) as MaintenanceUser[]);
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