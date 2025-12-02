import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface RdoCounts {
  relatorios: number;
  atividades: number;
  ocorrencias: number;
  comentarios: number;
  fotos: number;
  videos: number;
}

export interface RdoCalendarDay {
  data: string;
  report_id: string;
  numero_seq: number;
  status: string;
  activity_count: number;
  occurrence_count: number;
  photo_count: number;
  comment_count: number;
  fiscal_concluido_em: string | null;
  contratada_concluido_em: string | null;
}

export interface RdoRecente {
  id: string;
  data: string;
  numero_seq: number;
  status: string;
  created_at: string;
  activity_count: number;
  photo_count: number;
}

export interface FotoRecente {
  id: string;
  file_url: string;
  thumb_url: string | null;
  created_at: string;
}

export function useRdoCounts(obraId: string, currentMonth: Date) {
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['rdo-counts', obraId, startDate, endDate],
    queryFn: async (): Promise<RdoCounts> => {
      // Get report IDs for the period
      const { data: reports } = await supabase
        .from('rdo_reports')
        .select('id')
        .eq('obra_id', obraId)
        .gte('data', startDate)
        .lte('data', endDate);

      const reportIds = reports?.map(r => r.id) || [];

      if (reportIds.length === 0) {
        return {
          relatorios: 0,
          atividades: 0,
          ocorrencias: 0,
          comentarios: 0,
          fotos: 0,
          videos: 0,
        };
      }

      // Count activities
      const { count: activitiesCount } = await supabase
        .from('rdo_activities')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds);

      // Count occurrences
      const { count: occurrencesCount } = await supabase
        .from('rdo_occurrences')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds);

      // Count comments
      const { count: commentsCount } = await supabase
        .from('rdo_comments')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds);

      // Count photos
      const { count: photosCount } = await supabase
        .from('rdo_media')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds)
        .eq('tipo', 'foto');

      // Count videos
      const { count: videosCount } = await supabase
        .from('rdo_media')
        .select('*', { count: 'exact', head: true })
        .in('report_id', reportIds)
        .eq('tipo', 'video');

      return {
        relatorios: reports.length,
        atividades: activitiesCount || 0,
        ocorrencias: occurrencesCount || 0,
        comentarios: commentsCount || 0,
        fotos: photosCount || 0,
        videos: videosCount || 0,
      };
    },
    enabled: !!obraId,
  });
}

export function useRdoCalendar(obraId: string, currentMonth: Date) {
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['rdo-calendar', obraId, startDate, endDate],
    queryFn: async (): Promise<RdoCalendarDay[]> => {
      const { data: reports, error } = await supabase
        .from('rdo_reports')
        .select(`
          id,
          data,
          numero_seq,
          status,
          fiscal_concluido_em,
          contratada_concluido_em
        `)
        .eq('obra_id', obraId)
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (error) throw error;
      if (!reports) return [];

      // Get counts for each report
      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const [activities, occurrences, photos, comments] = await Promise.all([
            supabase
              .from('rdo_activities')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id),
            supabase
              .from('rdo_occurrences')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id),
            supabase
              .from('rdo_media')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id)
              .eq('tipo', 'foto'),
            supabase
              .from('rdo_comments')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id),
          ]);

          return {
            data: report.data,
            report_id: report.id,
            numero_seq: report.numero_seq,
            status: report.status,
            activity_count: activities.count || 0,
            occurrence_count: occurrences.count || 0,
            photo_count: photos.count || 0,
            comment_count: comments.count || 0,
            fiscal_concluido_em: report.fiscal_concluido_em,
            contratada_concluido_em: report.contratada_concluido_em,
          };
        })
      );

      return enrichedReports;
    },
    enabled: !!obraId,
  });
}

export function useRdoRecentes(obraId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['rdo-recentes', obraId, limit],
    queryFn: async (): Promise<RdoRecente[]> => {
      const { data: reports, error } = await supabase
        .from('rdo_reports')
        .select('id, data, numero_seq, status, created_at')
        .eq('obra_id', obraId)
        .order('data', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!reports) return [];

      // Get counts for each report
      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const [activities, photos] = await Promise.all([
            supabase
              .from('rdo_activities')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id),
            supabase
              .from('rdo_media')
              .select('*', { count: 'exact', head: true })
              .eq('report_id', report.id)
              .eq('tipo', 'foto'),
          ]);

          return {
            ...report,
            activity_count: activities.count || 0,
            photo_count: photos.count || 0,
          };
        })
      );

      return enrichedReports;
    },
    enabled: !!obraId,
  });
}

export function useFotosRecentes(obraId: string, limit: number = 12) {
  return useQuery({
    queryKey: ['fotos-recentes', obraId, limit],
    queryFn: async (): Promise<FotoRecente[]> => {
      const { data, error } = await supabase
        .from('rdo_media')
        .select('id, file_url, thumb_url, created_at')
        .eq('obra_id', obraId)
        .eq('tipo', 'foto')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!obraId,
  });
}

// Hook para buscar o último RDO preenchido (não rascunho) de todos os tempos
export function useLastFilledRdo(obraId: string) {
  return useQuery({
    queryKey: ['last-filled-rdo', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_reports')
        .select('data, status')
        .eq('obra_id', obraId)
        .neq('status', 'rascunho')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!obraId,
    staleTime: 30000,
  });
}