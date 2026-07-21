import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RdoStepCounts {
  atividades: number;
  ocorrencias: number;
  visitas: number;
  equipamentos: number;
  maoDeObra: number;
  fotos: number;
  fotosSemDescricao: number;
}

const EMPTY: RdoStepCounts = {
  atividades: 0,
  ocorrencias: 0,
  visitas: 0,
  equipamentos: 0,
  maoDeObra: 0,
  fotos: 0,
  fotosSemDescricao: 0,
};

/**
 * Contagens agregadas por report_id para exibir no stepper e no painel lateral.
 * Somente leitura, aditivo — não altera nenhum dado.
 */
export function useRdoStepCounts(reportId?: string) {
  return useQuery({
    queryKey: ['rdo-step-counts', reportId],
    enabled: !!reportId,
    queryFn: async (): Promise<RdoStepCounts> => {
      if (!reportId) return EMPTY;

      const head = (table: string) =>
        supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('report_id', reportId);

      const [ativ, oco, vis, eq, mo, media, mediaSemDesc] = await Promise.all([
        head('rdo_activities'),
        head('rdo_occurrences'),
        head('rdo_visits'),
        head('rdo_equipment'),
        head('rdo_workforce'),
        supabase.from('rdo_media').select('id', { count: 'exact', head: true }).eq('report_id', reportId).eq('tipo', 'foto'),
        supabase.from('rdo_media').select('id', { count: 'exact', head: true }).eq('report_id', reportId).eq('tipo', 'foto').or('descricao.is.null,descricao.eq.'),
      ]);

      return {
        atividades: ativ.count ?? 0,
        ocorrencias: oco.count ?? 0,
        visitas: vis.count ?? 0,
        equipamentos: eq.count ?? 0,
        maoDeObra: mo.count ?? 0,
        fotos: media.count ?? 0,
        fotosSemDescricao: mediaSemDesc.count ?? 0,
      };
    },
    staleTime: 15_000,
  });
}
