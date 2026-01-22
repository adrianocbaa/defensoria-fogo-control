import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  UserPlus, 
  UserCog, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  FileText,
  Calculator,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any;
  new_values: any;
  changed_fields: string[];
  user_id: string;
  user_email: string;
  created_at: string;
}

interface ObraAuditLogsProps {
  obraId: string;
}

export function ObraAuditLogs({ obraId }: ObraAuditLogsProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabelas relacionadas a medição e obra
  const relevantTables = [
    'orcamento_items',
    'medicao_sessions',
    'medicao_items',
    'aditivo_sessions',
    'aditivo_items',
    'aditivos',
    'medicoes',
    'obras',
    'cronograma_financeiro',
    'cronograma_items',
    'cronograma_periodos',
    'rdo_activities',
    'rdo_reports'
  ];

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Buscar logs de auditoria relacionados à obra
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('table_name', relevantTables)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filtrar logs que pertencem a esta obra específica
      const filteredLogs = (logs || []).filter(log => {
        // Verificar se o registro pertence a esta obra
        const values = log.new_values || log.old_values;
        
        // Values pode ser null/undefined ou não ser objeto
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
          return false;
        }
        
        const valuesObj = values as Record<string, unknown>;
        
        // Verificar campos que referenciam a obra
        if (valuesObj.obra_id === obraId) return true;
        if (valuesObj.id === obraId && log.table_name === 'obras') return true;
        
        // Para itens de medição/aditivo, verificar a sessão
        if (log.table_name === 'medicao_items' || log.table_name === 'aditivo_items') {
          // Esses registros não têm obra_id diretamente, verificação parcial
          return false; // Ignorar sem obra_id para evitar mostrar logs de outras obras
        }
        
        return false;
      });

      setAuditLogs(filteredLogs.map(log => ({
        ...log,
        operation: log.operation as 'INSERT' | 'UPDATE' | 'DELETE',
        changed_fields: log.changed_fields || [],
      })));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (obraId) {
      fetchAuditLogs();
    }
  }, [obraId]);

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Criação</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Alteração</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Exclusão</Badge>;
      default:
        return <Badge variant="outline">{operation}</Badge>;
    }
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      'orcamento_items': 'Itens do Orçamento',
      'medicao_sessions': 'Sessão de Medição',
      'medicao_items': 'Itens de Medição',
      'aditivo_sessions': 'Sessão de Aditivo',
      'aditivo_items': 'Itens de Aditivo',
      'aditivos': 'Aditivos',
      'medicoes': 'Medições',
      'obras': 'Obra',
      'cronograma_financeiro': 'Cronograma',
      'cronograma_items': 'Itens do Cronograma',
      'cronograma_periodos': 'Períodos do Cronograma',
      'rdo_activities': 'Atividades RDO',
      'rdo_reports': 'Relatórios RDO',
    };
    return labels[tableName] || tableName;
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Pencil className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getTableIcon = (tableName: string) => {
    if (tableName.includes('medicao') || tableName.includes('medicoes')) {
      return <Calculator className="h-3 w-3" />;
    }
    if (tableName.includes('aditivo')) {
      return <FileText className="h-3 w-3" />;
    }
    if (tableName.includes('orcamento')) {
      return <FileText className="h-3 w-3" />;
    }
    return <FileText className="h-3 w-3" />;
  };

  const formatChanges = (log: AuditLog) => {
    if (log.operation === 'INSERT') {
      if (log.table_name === 'medicao_sessions') {
        return `Nova medição #${log.new_values?.sequencia || ''}`;
      }
      if (log.table_name === 'aditivo_sessions') {
        return `Novo aditivo #${log.new_values?.sequencia || ''}`;
      }
      if (log.table_name === 'orcamento_items') {
        return `Novo item: ${log.new_values?.descricao?.substring(0, 50) || log.new_values?.item || 'N/A'}`;
      }
      return 'Novo registro criado';
    }

    if (log.operation === 'UPDATE' && log.changed_fields?.length > 0) {
      const changes = log.changed_fields
        .filter(field => !['updated_at', 'created_at'].includes(field))
        .slice(0, 3)
        .map(field => {
          const oldVal = log.old_values?.[field];
          const newVal = log.new_values?.[field];
          
          // Formatar valores numéricos
          if (typeof newVal === 'number') {
            return `${field}: ${oldVal} → ${newVal}`;
          }
          
          return `${field}`;
        });
      
      return changes.length > 0 
        ? `Campos alterados: ${changes.join(', ')}` 
        : 'Campos atualizados';
    }

    if (log.operation === 'DELETE') {
      if (log.table_name === 'orcamento_items') {
        return `Item removido: ${log.old_values?.descricao?.substring(0, 50) || log.old_values?.item || log.record_id}`;
      }
      if (log.table_name === 'medicao_sessions') {
        return `Medição #${log.old_values?.sequencia || ''} removida`;
      }
      return `Registro removido: ${log.record_id.substring(0, 8)}...`;
    }

    return '-';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </CardTitle>
            <CardDescription>
              Registro de ações realizadas nesta obra
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma alteração registrada para esta obra
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getOperationIcon(log.operation)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getOperationBadge(log.operation)}
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {getTableIcon(log.table_name)}
                        {getTableLabel(log.table_name)}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1 text-foreground">
                      {formatChanges(log)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserCog className="h-3 w-3" />
                        {log.user_email || 'Sistema'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
