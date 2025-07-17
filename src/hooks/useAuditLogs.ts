import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id: string;
  user_email?: string;
  created_at: Date;
}

export function useAuditLogs(recordId?: string, tableName?: string) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    if (!recordId || !tableName) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', recordId)
        .eq('table_name', tableName)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedLogs: AuditLog[] = data.map(log => ({
        ...log,
        operation: log.operation as 'INSERT' | 'UPDATE' | 'DELETE',
        created_at: new Date(log.created_at),
      }));

      setAuditLogs(formattedLogs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [recordId, tableName]);

  return {
    auditLogs,
    loading,
    error,
    refetch: fetchAuditLogs,
  };
}