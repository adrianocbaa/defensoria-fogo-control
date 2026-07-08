import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeUsageByManagerMonth,
  TRAVEL_DAYS_LIMIT_PER_MONTH,
  TravelRow,
} from '@/lib/travelDaysLimit';

/** Hook: retorna o total de dias já utilizados por servidor no `monthKey` (YYYY-MM). */
export function useTravelDaysUsage(monthKey: string) {
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!monthKey) {
      setUsage({});
      setLoading(false);
      return;
    }
    const [y, m] = monthKey.split('-').map(Number);
    const first = `${monthKey}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('travels')
      .select('id, data_ida, data_volta, manager_ids, diarias')
      .not('data_ida', 'is', null)
      .lte('data_ida', last)
      .gte('data_ida', first)
      .limit(10000);

    if (error) {
      console.error('Erro ao carregar consumo de viagens:', error);
      setUsage({});
      setLoading(false);
      return;
    }
    const full = computeUsageByManagerMonth((data ?? []) as TravelRow[]);
    const monthUsage: Record<string, number> = {};
    for (const [managerId, months] of Object.entries(full)) {
      monthUsage[managerId] = months[monthKey] ?? 0;
    }
    setUsage(monthUsage);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { usage, loading, refetch: load, limit: TRAVEL_DAYS_LIMIT_PER_MONTH };
}
