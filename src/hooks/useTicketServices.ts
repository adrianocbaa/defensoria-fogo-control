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
  /** true quando `travel_id` aponta para uma viagem existente (não deve ser excluída ao editar/apagar). */
  travel_is_linked?: boolean;
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
 * associadas) e reinsere. Cria uma linha em `travels` para cada serviço com viagem
 * "própria", ou reaproveita uma viagem existente quando `travel_is_linked` estiver
 * marcado (nesse caso não cria nem apaga a viagem — apenas referencia).
 */
export async function replaceServicesForTicket(
  ticketId: string,
  services: TicketService[],
  opts: ReplaceServicesOptions
): Promise<void> {
  // 1. Buscar serviços atuais (com flag de vínculo) e o travel_id do ticket
  const [{ data: existing, error: fetchErr }, { data: ticketRow, error: ticketErr }] = await Promise.all([
    supabase
      .from('maintenance_ticket_services')
      .select('id, travel_id, travel_is_linked')
      .eq('ticket_id', ticketId),
    supabase
      .from('maintenance_tickets')
      .select('travel_id')
      .eq('id', ticketId)
      .maybeSingle(),
  ]);
  if (fetchErr) throw fetchErr;
  if (ticketErr) throw ticketErr;

  // Só apagar viagens que eram "próprias" do serviço (não vinculadas a outros procedimentos)
  const ownedOldTravelIds = (existing ?? [])
    .filter((r: any) => !!r.travel_id && !r.travel_is_linked)
    .map((r: any) => r.travel_id as string);
  const linkedOldTravelIds = (existing ?? [])
    .filter((r: any) => !!r.travel_id && !!r.travel_is_linked)
    .map((r: any) => r.travel_id as string);
  const protectedTicketTravelId = (ticketRow as any)?.travel_id ?? null;

  // 2. Apagar serviços
  const { error: delErr } = await supabase
    .from('maintenance_ticket_services')
    .delete()
    .eq('ticket_id', ticketId);
  if (delErr) throw delErr;

  // 3. Apagar apenas viagens PRÓPRIAS antigas (viagens vinculadas continuam intactas)
  if (ownedOldTravelIds.length > 0) {
    const { error: oldTravelDelErr } = await supabase.from('travels').delete().in('id', ownedOldTravelIds);
    if (oldTravelDelErr) throw oldTravelDelErr;
  }
  // Também remover órfãs criadas em salvamentos parciais (mesmo ticket_id), preservando
  // o travel do procedimento e QUALQUER viagem vinculada (linked).
  let staleTravelDelete = supabase.from('travels').delete().eq('ticket_id', ticketId);
  if (protectedTicketTravelId) {
    staleTravelDelete = staleTravelDelete.neq('id', protectedTicketTravelId);
  }
  if (linkedOldTravelIds.length > 0) {
    // .not('id', 'in', ...) precisa de sintaxe de lista
    staleTravelDelete = staleTravelDelete.not('id', 'in', `(${linkedOldTravelIds.join(',')})`);
  }
  const { error: staleTravelDelErr } = await staleTravelDelete;
  if (staleTravelDelErr) throw staleTravelDelErr;

  if (services.length === 0) return;

  // 4. Para cada serviço com viagem, criar entrada em `travels` (se não vinculada)
  const servicesWithTravelIds = await Promise.all(
    services.map(async (s) => {
      let travelId: string | null = null;
      let isLinked = false;
      if (s.envolve_viagem) {
        if (s.travel_is_linked && s.travel_id) {
          // Reaproveitar viagem existente — não cria nada em travels
          travelId = s.travel_id;
          isLinked = true;
        } else if (s.travel_cidade) {
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
      }
      return { s, travelId, isLinked };
    })
  );

  const rows = servicesWithTravelIds.map(({ s, travelId, isLinked }, i) => ({
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
    travel_is_linked: isLinked,
  }));

  const { error: insErr } = await supabase
    .from('maintenance_ticket_services')
    .insert(rows as any);
  if (insErr) {
    // Reverter apenas viagens recém-criadas (não as vinculadas)
    const newTravelIds = servicesWithTravelIds
      .filter(({ isLinked }) => !isLinked)
      .map(({ travelId }) => travelId)
      .filter((id): id is string => !!id);
    if (newTravelIds.length > 0) {
      await supabase.from('travels').delete().in('id', newTravelIds);
    }
    throw insErr;
  }
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
    travel_is_linked: r.travel_is_linked ?? false,
  }));
}
