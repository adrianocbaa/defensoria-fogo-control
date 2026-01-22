import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  RefreshCw,
  Clock,
  Save,
  FolderOpen,
  Lock,
  FilePlus,
  FileSpreadsheet,
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Trash2,
  Edit,
  User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActionLog {
  id: string;
  obra_id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  action_description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ObraAuditLogsProps {
  obraId: string;
}

export function ObraAuditLogs({ obraId }: ObraAuditLogsProps) {
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActionLogs = async () => {
    setLoading(true);
    try {
      // Use explicit typing to bypass generated types (table was just created)
      const { data: logs, error } = await (supabase as any)
        .from('obra_action_logs')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActionLogs((logs || []) as ActionLog[]);
    } catch (error) {
      console.error('Error fetching action logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (obraId) {
      fetchActionLogs();
    }
  }, [obraId]);

  const getActionIcon = (actionType: string) => {
    const icons: Record<string, React.ReactNode> = {
      'medicao_salva': <Save className="h-4 w-4 text-green-600" />,
      'medicao_reaberta': <FolderOpen className="h-4 w-4 text-amber-600" />,
      'medicao_bloqueada': <Lock className="h-4 w-4 text-blue-600" />,
      'aditivo_criado': <FilePlus className="h-4 w-4 text-purple-600" />,
      'aditivo_bloqueado': <Lock className="h-4 w-4 text-purple-600" />,
      'aditivo_reaberto': <FolderOpen className="h-4 w-4 text-purple-600" />,
      'cronograma_atualizado': <Calendar className="h-4 w-4 text-blue-600" />,
      'cronograma_importado': <FileSpreadsheet className="h-4 w-4 text-blue-600" />,
      'planilha_importada': <FileSpreadsheet className="h-4 w-4 text-green-600" />,
      'planilha_exportada': <Download className="h-4 w-4 text-gray-600" />,
      'relatorio_exportado': <FileText className="h-4 w-4 text-gray-600" />,
      'rdo_criado': <Calendar className="h-4 w-4 text-green-600" />,
      'rdo_aprovado': <CheckCircle className="h-4 w-4 text-green-600" />,
      'rdo_excluido': <Trash2 className="h-4 w-4 text-red-600" />,
      'itens_alterados': <Edit className="h-4 w-4 text-amber-600" />,
    };
    return icons[actionType] || <History className="h-4 w-4" />;
  };

  const getActionBadge = (actionType: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'medicao_salva': { label: 'Medição', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'medicao_reaberta': { label: 'Medição', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      'medicao_bloqueada': { label: 'Medição', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'aditivo_criado': { label: 'Aditivo', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      'aditivo_bloqueado': { label: 'Aditivo', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      'aditivo_reaberto': { label: 'Aditivo', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      'cronograma_atualizado': { label: 'Cronograma', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'cronograma_importado': { label: 'Cronograma', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      'planilha_importada': { label: 'Planilha', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'planilha_exportada': { label: 'Exportação', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
      'relatorio_exportado': { label: 'Relatório', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
      'rdo_criado': { label: 'RDO', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'rdo_aprovado': { label: 'RDO', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      'rdo_excluido': { label: 'RDO', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      'itens_alterados': { label: 'Itens', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    };
    const badge = badges[actionType] || { label: 'Ação', className: '' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  // Agrupar logs por data
  const groupedLogs = actionLogs.reduce((groups, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, ActionLog[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Ações
            </CardTitle>
            <CardDescription>
              Registro de ações realizadas nesta obra
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchActionLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : actionLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ação registrada para esta obra</p>
              <p className="text-sm mt-1">As ações serão registradas conforme você utiliza o sistema</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([date, logs]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-background py-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors ml-2"
                      >
                        <div className="mt-0.5">
                          {getActionIcon(log.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionBadge(log.action_type)}
                          </div>
                          <p className="text-sm mt-1 font-medium text-foreground">
                            {log.action_description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user_email || 'Usuário'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.created_at), 'HH:mm')}
                              {' · '}
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
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
