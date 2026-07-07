import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TicketImpediment {
  id: string;
  ticket_id: string;
  motivo: string;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
}

/** Busca todos os impedimentos dos tickets informados. */
export function useTicketImpediments(ticketIds: string[]) {
  const [impediments, setImpediments] = useState<TicketImpediment[]>([]);
  const [loading, setLoading] = useState(false);

  // chave estável para evitar reruns
  const idsKey = [...new Set(ticketIds)].sort().join(',');

  const fetchImpediments = useCallback(async () => {
    if (!idsKey) {
      setImpediments([]);
      return;
    }
    setLoading(true);
    const ids = idsKey.split(',');
    const { data, error } = await supabase
      .from('maintenance_ticket_impediments')
      .select('*')
      .in('ticket_id', ids)
      .order('created_at', { ascending: false })
      .limit(10000);
    if (!error && data) setImpediments(data as TicketImpediment[]);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => { fetchImpediments(); }, [fetchImpediments]);

  return { impediments, loading, refetch: fetchImpediments };
}

/** Retorna todos os impedimentos de um único ticket. */
export function useTicketImpedimentsFor(ticketId?: string | null) {
  const [items, setItems] = useState<TicketImpediment[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticketId) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_ticket_impediments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(10000);
    if (!error && data) setItems(data as TicketImpediment[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { items, loading, refetch };
}

export async function addImpediment(
  ticketId: string,
  motivo: string,
  userId?: string | null,
  userName?: string | null,
) {
  const { error } = await supabase.from('maintenance_ticket_impediments').insert({
    ticket_id: ticketId,
    motivo,
    created_by: userId ?? null,
    created_by_name: userName ?? null,
  });
  if (error) throw error;
}

export async function resolveActiveImpediments(
  ticketId: string,
  userId?: string | null,
  userName?: string | null,
) {
  const { error } = await supabase
    .from('maintenance_ticket_impediments')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId ?? null,
      resolved_by_name: userName ?? null,
    })
    .eq('ticket_id', ticketId)
    .is('resolved_at', null);
  if (error) throw error;
}
