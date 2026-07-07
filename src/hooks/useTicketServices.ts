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
  // Viagem por serviço
  envolve_viagem?: boolean;
  travel_cidade?: string | null;
  travel_data_ida?: string | null;
  travel_data_volta?: string | null;
  travel_sem_previsao?: boolean;
  travel_id?: string | null;
  /** Nome do servidor a registrar no calendário (apenas transiente na UI, não persistido em maintenance_ticket_services) */
  travel_servidor?: string | null;
}

export interface ReplaceServicesOptions {
  /** Título do procedimento — usado como "motivo" das viagens criadas */
  ticketTitle: string;
  /** Fallback de servidor quando o serviço não tiver responsável personalizado */
  fallbackServidor: string;
  /** user_id que dispara a criação das viagens (owner) */
  userId?: string;
}

function firstName(nome?: string | null) {
  if (!nome) return '';
  return nome.trim().split(/\s+/)[0] || '';
}

/**
 * Substitui a lista de serviços de uma tarefa: apaga os existentes (e suas viagens
 * associadas) e reinsere. Cria uma linha em `travels` para cada serviço com viagem.
 */
export async function replaceServicesForTicket(
  ticketId: string,
  services: TicketService[],
  opts: ReplaceServicesOptions
): Promise<void> {
  // 1. Buscar serviços atuais para conhecer os travel_ids existentes
  const { data: existing, error: fetchErr } = await supabase
    .from('maintenance_ticket_services')
    .select('id, travel_id')
    .eq('ticket_id', ticketId);
  if (fetchErr) throw fetchErr;

  const oldTravelIds = (existing ?? [])
    .map((r: any) => r.travel_id)
    .filter((id: string | null): id is string => !!id);

  // 2. Apagar serviços (cascade não afeta travels — ON DELETE SET NULL)
  const { error: delErr } = await supabase
    .from('maintenance_ticket_services')
    .delete()
    .eq('ticket_id', ticketId);
  if (delErr) throw delErr;

  // 3. Apagar as viagens antigas vinculadas
  if (oldTravelIds.length > 0) {
    await supabase.from('travels').delete().in('id', oldTravelIds);
  }

  if (services.length === 0) return;

  // 4. Para cada serviço com viagem, criar entrada em `travels` primeiro
  const servicesWithTravelIds = await Promise.all(
    services.map(async (s) => {
      let travelId: string | null = null;
      if (s.envolve_viagem && s.travel_cidade) {
        const servidorSource =
          s.travel_servidor ||
          (s.custom_assignment ? null : null) ||
          opts.fallbackServidor;
        const servidor = firstName(servidorSource) || opts.fallbackServidor || '—';
        const dataIda = s.travel_sem_previsao ? null : s.travel_data_ida || null;
        const dataVolta = s.travel_sem_previsao ? null : s.travel_data_volta || null;
        const { data: travelRow, error: travelErr } = await supabase
          .from('travels')
          .insert({
            servidor,
            destino: s.travel_cidade,
            data_ida: dataIda,
            data_volta: dataVolta,
            motivo: opts.ticketTitle,
            ticket_id: ticketId,
            user_id: opts.userId ?? null,
          } as any)
          .select('id')
          .single();
        if (travelErr) {
          console.error('Erro ao criar viagem do serviço:', travelErr);
        } else {
          travelId = travelRow?.id ?? null;
        }
      }
      return { s, travelId };
    })
  );

  const rows = servicesWithTravelIds.map(({ s, travelId }, i) => ({
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
    envolve_viagem: !!s.envolve_viagem,
    travel_cidade: s.envolve_viagem ? s.travel_cidade ?? null : null,
    travel_data_ida: s.envolve_viagem && !s.travel_sem_previsao ? s.travel_data_ida ?? null : null,
    travel_data_volta: s.envolve_viagem && !s.travel_sem_previsao ? s.travel_data_volta ?? null : null,
    travel_sem_previsao: !!s.travel_sem_previsao,
    travel_id: travelId,
  }));

  const { error: insErr } = await supabase
    .from('maintenance_ticket_services')
    .insert(rows as any);
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
    envolve_viagem: r.envolve_viagem ?? false,
    travel_cidade: r.travel_cidade,
    travel_data_ida: r.travel_data_ida,
    travel_data_volta: r.travel_data_volta,
    travel_sem_previsao: r.travel_sem_previsao ?? false,
    travel_id: r.travel_id,
  }));
}
