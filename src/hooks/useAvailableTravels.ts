import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableTravel {
  id: string;
  servidor: string;
  destino: string;
  data_ida: string | null;
  data_volta: string | null;
  motivo: string;
  manager_ids?: string[];
}

/**
 * Lista viagens do calendário que ainda estão em aberto:
 * - `data_ida >= hoje` (futuras/em andamento) OU
 * - `data_ida IS NULL` (sem previsão).
 *
 * Usado para vincular um serviço a uma viagem já cadastrada,
 * evitando duplicatas no calendário.
 */
export function useAvailableTravels() {
  const [travels, setTravels] = useState<AvailableTravel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // Considera "em aberto" viagens que:
    // - ainda não começaram (data_ida >= hoje), OU
    // - estão em andamento (data_volta >= hoje), OU
    // - não têm previsão (data_ida IS NULL).
    // Isso permite vincular a viagens que começaram no passado mas ainda
    // não terminaram (ex.: 30/06 → 03/07 quando hoje é 02/07).
    const { data, error } = await supabase
      .from('travels')
      .select('id, servidor, destino, data_ida, data_volta, motivo, manager_ids')
      .or(`data_ida.gte.${iso},data_volta.gte.${iso},data_ida.is.null`)
      .order('data_ida', { ascending: true, nullsFirst: false })
      .limit(10000);
    if (!error) setTravels((data ?? []) as AvailableTravel[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { travels, loading, refetch: fetch };
}
