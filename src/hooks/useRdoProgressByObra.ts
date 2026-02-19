import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRdoProgressByObra(obraId: string) {
  return useQuery({
    queryKey: ['rdo-progress', obraId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rdo_progress_by_obra', {
        p_obra_id: obraId,
      });

      if (error) throw error;
      return Number(data) || 0;
    },
    enabled: !!obraId,
    staleTime: 1000 * 60 * 5,
  });
}
