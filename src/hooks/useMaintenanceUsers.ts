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
        const { data, error } = await supabase
          .from('profiles_secure')
          .select('id, user_id, display_name')
          .eq('role', 'manutencao');

        if (error) throw error;
        setUsers(data || []);
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