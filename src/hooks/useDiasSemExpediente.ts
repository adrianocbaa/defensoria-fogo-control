import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getDay } from 'date-fns';

interface DiaSemExpediente {
  id: string;
  obra_id: string;
  data: string;
  marcado_por: string | null;
  created_at: string;
}

export function useDiasSemExpediente(obraId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: diasSemExpediente = [], isLoading } = useQuery({
    queryKey: ['dias-sem-expediente', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_dias_sem_expediente')
        .select('*')
        .eq('obra_id', obraId)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as DiaSemExpediente[];
    },
    enabled: !!obraId,
  });

  const marcarDiaMutation = useMutation({
    mutationFn: async (data: string) => {
      const { error } = await supabase
        .from('rdo_dias_sem_expediente')
        .insert({
          obra_id: obraId,
          data,
          marcado_por: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias-sem-expediente', obraId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-restrictions', obraId] });
      toast.success('Dia marcado como sem expediente');
    },
    onError: (error: any) => {
      console.error('Error marking day:', error);
      if (error.message?.includes('EXTRACT')) {
        toast.error('Apenas sábados e domingos podem ser marcados');
      } else {
        toast.error('Erro ao marcar dia sem expediente');
      }
    },
  });

  const desmarcarDiaMutation = useMutation({
    mutationFn: async (data: string) => {
      const { error } = await supabase
        .from('rdo_dias_sem_expediente')
        .delete()
        .eq('obra_id', obraId)
        .eq('data', data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias-sem-expediente', obraId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-restrictions', obraId] });
      toast.success('Marcação removida');
    },
    onError: () => {
      toast.error('Erro ao remover marcação');
    },
  });

  const isDiaSemExpediente = (data: string): boolean => {
    return diasSemExpediente.some(d => d.data === data);
  };

  const isWeekend = (date: Date): boolean => {
    const day = getDay(date);
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  };

  const toggleDiaSemExpediente = (data: string) => {
    if (isDiaSemExpediente(data)) {
      desmarcarDiaMutation.mutate(data);
    } else {
      marcarDiaMutation.mutate(data);
    }
  };

  return {
    diasSemExpediente,
    isLoading,
    isDiaSemExpediente,
    isWeekend,
    toggleDiaSemExpediente,
    isToggling: marcarDiaMutation.isPending || desmarcarDiaMutation.isPending,
  };
}
