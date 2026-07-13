import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceManager {
  id: string; // user_id do profile
  nome: string;
  email?: string | null;
  ordem: number;
  ativo: boolean;
  is_maintenance_responsible?: boolean;
}

export function useMaintenanceManagers(_onlyActive = true) {
  const [managers, setManagers] = useState<MaintenanceManager[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    // 1) Usuários com role 'gm' (servidores da manutenção clássicos)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gm' as any)
      .limit(10000);
    const gmIds = new Set<string>((roles ?? []).map((r: any) => r.user_id));

    // 2) Perfis marcados como Responsável pela Manutenção (fiscais + manutenção)
    const { data: flagged } = await (supabase.from('profiles') as any)
      .select('user_id, display_name, email')
      .eq('is_maintenance_responsible', true)
      .limit(10000);
    const flaggedIds = new Set<string>((flagged ?? []).map((p: any) => p.user_id));

    const allIds = Array.from(new Set<string>([...gmIds, ...flaggedIds]));
    if (allIds.length === 0) {
      setManagers([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', allIds)
      .limit(10000);

    const list: MaintenanceManager[] = (profiles ?? [])
      .map((p: any, idx: number) => ({
        id: p.user_id,
        nome: p.display_name || p.email || 'Sem nome',
        email: p.email,
        ordem: idx + 1,
        ativo: true,
        is_maintenance_responsible: flaggedIds.has(p.user_id),
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
