import { supabase } from '@/integrations/supabase/client';

export interface TicketService {
  id?: string;
  title: string;
  description?: string | null;
  order_index: number;
  completed: boolean;
  status: string;
  custom_assignment: boolean;
  nucleo_id?: string | null;
  location?: string | null;
  manager_id?: string | null;
  scheduled_date?: string | null;
  materials?: { name: string; completed: boolean }[];
}

/**
 * Substitui a lista de serviços de uma tarefa: apaga tudo e insere de novo.
 * Simples e suficiente para os volumes esperados (poucos serviços por tarefa).
 */
export async function replaceServicesForTicket(
  ticketId: string,
  services: TicketService[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('maintenance_ticket_services')
    .delete()
    .eq('ticket_id', ticketId);
  if (delErr) throw delErr;

  if (services.length === 0) return;

  const rows = services.map((s, i) => ({
    ticket_id: ticketId,
    title: s.title,
    description: s.description ?? null,
    order_index: s.order_index ?? i,
    completed: !!s.completed,
    status: s.status || 'Em Análise',
    custom_assignment: !!s.custom_assignment,
    nucleo_id: s.custom_assignment ? s.nucleo_id ?? null : null,
    location: s.custom_assignment ? s.location ?? null : null,
    manager_id: s.custom_assignment ? s.manager_id ?? null : null,
    scheduled_date: s.custom_assignment ? s.scheduled_date ?? null : null,
    materials: (s.materials ?? []) as any,
  }));

  const { error: insErr } = await supabase
    .from('maintenance_ticket_services')
    .insert(rows);
  if (insErr) throw insErr;
}

export async function fetchServicesForTicket(ticketId: string): Promise<TicketService[]> {
  const { data, error } = await supabase
    .from('maintenance_ticket_services')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    order_index: r.order_index,
    completed: r.completed,
    status: r.status,
    custom_assignment: r.custom_assignment,
    nucleo_id: r.nucleo_id,
    location: r.location,
    manager_id: r.manager_id,
    scheduled_date: r.scheduled_date,
    materials: (r.materials as any) ?? [],
  }));
}
