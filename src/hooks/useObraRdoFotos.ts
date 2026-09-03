import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RdoFoto {
  id: string;
  url: string;
  uploadedAt: string;
  fileName: string;
  monthFolder: string; // YYYY-MM
  descricao: string | null;
}

/**
 * Fotos anexadas pela empresa nos RDOs da obra, agrupadas automaticamente
 * pelo mês do relatório (rdo_reports.data). Fotos marcadas como ocultas
 * não são retornadas para exibição no resumo da obra.
 */
export function useObraRdoFotos(obraId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['obra-rdo-fotos', obraId],
    enabled: !!obraId && enabled,
    queryFn: async (): Promise<RdoFoto[]> => {
      const { data, error } = await supabase
        .from('rdo_media')
        .select('id, file_url, descricao, created_at, oculto_resumo, rdo_reports!inner(data, obra_id)')
        .eq('obra_id', obraId!)
        .eq('tipo', 'foto')
        .eq('oculto_resumo', false)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) throw error;

      return (data || []).map((m: any) => {
        const dataRelatorio: string | undefined = m.rdo_reports?.data;
        const base = dataRelatorio || String(m.created_at).slice(0, 10);
        const monthFolder = base.slice(0, 7); // YYYY-MM
        return {
          id: m.id,
          url: m.file_url,
          uploadedAt: dataRelatorio ? `${dataRelatorio}T12:00:00` : m.created_at,
          fileName: m.descricao || String(m.file_url).split('/').pop() || 'foto.jpg',
          monthFolder,
          descricao: m.descricao ?? null,
        };
      });
    },
  });

  const ocultar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_media')
        .update({ oculto_resumo: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-rdo-fotos', obraId] });
      toast.success('Foto removida do álbum do resumo');
    },
    onError: () => toast.error('Não foi possível remover a foto do álbum'),
  });

  return {
    fotos: query.data || [],
    loading: query.isLoading,
    ocultarFoto: (id: string) => ocultar.mutate(id),
  };
}
