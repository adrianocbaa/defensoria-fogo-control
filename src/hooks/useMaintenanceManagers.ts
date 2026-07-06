import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceManager {
  id: string; // user_id do profile
  nome: string;
  email?: string | null;
  ordem: number;
  ativo: boolean;
}

export function useMaintenanceManagers(_onlyActive = true) {
  const [managers, setManagers] = useState<MaintenanceManager[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Busca user_ids que têm o papel "manutencao"
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'manutencao' as any)
      .limit(10000);

    if (rolesError || !roles || roles.length === 0) {
      setManagers([]);
      setLoading(false);
      return;
    }

    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', userIds)
      .limit(10000);

    if (profilesError || !profiles) {
      setManagers([]);
      setLoading(false);
      return;
    }

    const list: MaintenanceManager[] = profiles
      .map((p: any, idx: number) => ({
        id: p.user_id,
        nome: p.display_name || p.email || 'Sem nome',
        email: p.email,
        ordem: idx + 1,
        ativo: true,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    setManagers(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { managers, loading, refetch: load };
}
