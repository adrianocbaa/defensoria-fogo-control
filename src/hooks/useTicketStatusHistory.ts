import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TicketStatusHistoryEntry {
  id: string;
  ticket_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
}

export function useTicketStatusHistory(ticketId?: string | null) {
  const [items, setItems] = useState<TicketStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticketId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_ticket_status_history')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('changed_at', { ascending: true })
      .limit(10000);
    if (!error && data) setItems(data as TicketStatusHistoryEntry[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}
