import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MaintenanceTicket {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  status: 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído';
  observations?: string[];
  services?: { name: string; completed: boolean }[];
  materials?: { name: string; completed: boolean }[];
  request_type?: 'email' | 'processo';
  process_number?: string;
  completed_at?: string;
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupedTickets = {
        'Pendente': [],
        'Em andamento': [],
        'Impedido': [],
        'Concluído': []
      } as { [key: string]: MaintenanceTicket[] };

      data?.forEach(ticket => {
        if (groupedTickets[ticket.status]) {
          groupedTickets[ticket.status].push({
            ...ticket,
            priority: ticket.priority as 'Alta' | 'Média' | 'Baixa',
            status: ticket.status as 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído',
            services: ticket.services as { name: string; completed: boolean }[] || [],
            materials: ticket.materials as { name: string; completed: boolean }[] || [],
            request_type: ticket.request_type as 'email' | 'processo' | undefined
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

  const createTicket = async (ticketData: Omit<MaintenanceTicket, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      await fetchTickets();
      toast({
        title: "Sucesso",
        description: "Ticket criado com sucesso!",
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<MaintenanceTicket>) => {
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      await fetchTickets();
      toast({
        title: "Sucesso",
        description: "Ticket atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o ticket.",
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