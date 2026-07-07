import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TicketService } from './useTicketServices';

export interface MaintenanceTicket {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  status: 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído';
  observations?: string[];
  services?: TicketService[];
  materials?: { name: string; completed: boolean }[];
  request_type?: 'email' | 'processo' | 'direto';
  process_number?: string;
  completed_at?: string;
  requested_at?: string;
  manager_id?: string | null;
  manager_ids?: string[];
  nucleo_id?: string | null;
  user_id?: string;
  travel_id?: string;
  created_at: string;
  updated_at: string;
}

export function useMaintenanceTickets() {
  const [tickets, setTickets] = useState<{ [key: string]: MaintenanceTicket[] }>({
    'Pendente': [],
    'Em andamento': [],
    'Impedido': [],
    'Concluído': []
  });
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*, maintenance_ticket_services(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupedTickets = {
        'Pendente': [],
        'Em andamento': [],
        'Impedido': [],
        'Concluído': []
      } as { [key: string]: MaintenanceTicket[] };

      data?.forEach((ticket: any) => {
        if (groupedTickets[ticket.status]) {
          const rawServices = (ticket.maintenance_ticket_services ?? []) as any[];
          const services: TicketService[] = rawServices
            .slice()
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((r) => ({
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

          groupedTickets[ticket.status].push({
            ...ticket,
            priority: ticket.priority as 'Alta' | 'Média' | 'Baixa',
            status: ticket.status as 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído',
            services,
            materials: ticket.materials as { name: string; completed: boolean }[] || [],
            request_type: ticket.request_type as 'email' | 'processo' | 'direto' | undefined
          });
        }
      });

      setTickets(groupedTickets);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tickets de manutenção.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: Omit<MaintenanceTicket, 'id' | 'created_at' | 'updated_at' | 'services'>) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .insert([ticketData as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<MaintenanceTicket>) => {
    try {
      // não persistir 'services' no update do ticket — vem da tabela filha
      const { services: _svcs, ...rest } = updates as any;
      const { error } = await supabase
        .from('maintenance_tickets')
        .update(rest)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      await fetchTickets();
      toast({
        title: "Sucesso",
        description: "Ticket excluído com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o ticket.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: fetchTickets
  };
}
