import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Edit, Plus, Trash2 } from 'lucide-react';

interface AuditHistoryProps {
  recordId: string;
  tableName: string;
}

const operationIcons = {
  INSERT: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
};

const operationLabels = {
  INSERT: 'Criado',
  UPDATE: 'Atualizado', 
  DELETE: 'Excluído',
};

const operationColors = {
  INSERT: 'bg-green-500/10 text-green-700 border-green-200',
  UPDATE: 'bg-blue-500/10 text-blue-700 border-blue-200',
  DELETE: 'bg-red-500/10 text-red-700 border-red-200',
};

export function AuditHistory({ recordId, tableName }: AuditHistoryProps) {
  const { auditLogs, loading, error } = useAuditLogs(recordId, tableName);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Carregando histórico...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-destructive">Erro ao carregar histórico: {error}</div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Nenhum histórico encontrado</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-4 p-4">
        {auditLogs.map((log, index) => {
          const Icon = operationIcons[log.operation];
          
          return (
            <div key={log.id} className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={operationColors[log.operation]}>
                      {operationLabels[log.operation]}
                    </Badge>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{log.user_email || 'Usuário desconhecido'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(log.created_at, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {log.operation === 'UPDATE' && log.changed_fields && log.changed_fields.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Campos alterados: </span>
                      <span className="font-medium">
                        {log.changed_fields
                          .filter(field => !['updated_at', 'created_at'].includes(field))
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {index < auditLogs.length - 1 && <Separator className="my-2" />}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}