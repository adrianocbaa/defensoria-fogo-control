import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export type RdoAuditAction = 
  | 'CRIAR' 
  | 'EDITAR' 
  | 'ENVIAR_APROVACAO' 
  | 'APROVAR' 
  | 'REPROVAR' 
  | 'ASSINAR_FISCAL' 
  | 'ASSINAR_CONTRATADA' 
  | 'GERAR_PDF' 
  | 'DOWNLOAD_PDF' 
  | 'SHARE_EMAIL'
  | 'REABRIR';

export interface RdoAuditLogEntry {
  id: string;
  obra_id: string;
  report_id: string;
  acao: RdoAuditAction;
  detalhes: Record<string, any> | null;
  actor_id: string | null;
  actor_nome: string | null;
  created_at: string;
}

export function useRdoAuditLog(reportId: string) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['rdo-audit-log', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_audit_log')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RdoAuditLogEntry[];
    },
    enabled: !!reportId,
  });

  return { logs, isLoading };
}

export async function createAuditLog(params: {
  obraId: string;
  reportId: string;
  acao: RdoAuditAction;
  detalhes?: Record<string, any>;
  actorId?: string;
  actorNome?: string;
}) {
  const { error } = await supabase
    .from('rdo_audit_log')
    .insert({
      obra_id: params.obraId,
      report_id: params.reportId,
      acao: params.acao,
      detalhes: params.detalhes || null,
      actor_id: params.actorId || null,
      actor_nome: params.actorNome || null,
    });

  if (error) {
    console.error('Erro ao criar log de auditoria:', error);
    throw error;
  }
}
