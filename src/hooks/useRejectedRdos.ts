import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Hook para buscar os report_ids de RDOs que foram reprovados pela fiscalização
 * dentro de um período específico (baseado no histórico de auditoria)
 */
export function useRejectedRdosInPeriod(obraId: string, currentMonth: Date) {
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['rejected-rdos', obraId, startDate, endDate],
    queryFn: async (): Promise<Set<string>> => {
      // Buscar IDs dos RDOs no período
      const { data: reports, error: reportsError } = await supabase
        .from('rdo_reports')
        .select('id')
        .eq('obra_id', obraId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (reportsError) throw reportsError;
      if (!reports || reports.length === 0) return new Set();

      const reportIds = reports.map(r => r.id);

      // Buscar quais desses RDOs têm histórico de reprovação
      const { data: rejections, error: rejectionsError } = await supabase
        .from('rdo_audit_log')
        .select('report_id')
        .in('report_id', reportIds)
        .eq('acao', 'REPROVAR');

      if (rejectionsError) throw rejectionsError;

      return new Set((rejections || []).map(r => r.report_id));
    },
    enabled: !!obraId,
    staleTime: 30000, // 30 segundos
  });
}
