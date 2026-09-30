import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRdoProgressByObra(obraId: string, publicOnly = false) {
  return useQuery({
    queryKey: ['rdo-progress', obraId, publicOnly],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(publicOnly ? 'get_public_rdo_progress_by_obra' : 'get_rdo_progress_by_obra', {
        p_obra_id: obraId,
      });

      if (error) throw error;
      return data === null ? null : Number(data);
    },
    enabled: !!obraId,
    staleTime: 1000 * 60 * 5,
  });
}
