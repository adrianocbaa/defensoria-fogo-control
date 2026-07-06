import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceManager {
  id: string;
  nome: string;
  email?: string | null;
  ordem: number;
  ativo: boolean;
}

export function useMaintenanceManagers(onlyActive = true) {
  const [managers, setManagers] = useState<MaintenanceManager[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('maintenance_managers' as any)
      .select('*')
      .order('ordem', { ascending: true })
      .limit(10000);
    if (onlyActive) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (!error && data) {
      setManagers(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [onlyActive]);

  return { managers, loading, refetch: load };
}
