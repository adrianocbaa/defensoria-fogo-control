import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  UserPlus, 
  UserCog, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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

interface LoginAttempt {
  id: string;
  user_identifier: string;
  attempt_time: string;
  success: boolean;
  user_agent: string | null;
  ip_address: unknown;
}

export function AuditLogsPanel() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Fetch audit logs (focus on security-relevant tables)
      const { data: audits, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('table_name', ['profiles', 'user_roles', 'user_obra_access', 'obras'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (auditError) throw auditError;

      // Fetch login attempts
      const { data: logins, error: loginError } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(200);

      if (loginError) throw loginError;

      setAuditLogs((audits || []).map(log => ({
        ...log,
        operation: log.operation as 'INSERT' | 'UPDATE' | 'DELETE',
        changed_fields: log.changed_fields || [],
      })));
      setLoginAttempts(logins || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

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
      'profiles': 'Perfil de Usuário',
      'user_roles': 'Permissões',
      'user_obra_access': 'Acesso a Obras',
      'obras': 'Obras',
    };
    return labels[tableName] || tableName;
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <UserCog className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const formatChanges = (log: AuditLog) => {
    if (log.operation === 'INSERT') {
      if (log.table_name === 'profiles') {
        return `Novo usuário: ${log.new_values?.email || log.new_values?.display_name || 'N/A'}`;
      }
      if (log.table_name === 'user_roles') {
        return `Nova role: ${log.new_values?.role || 'N/A'}`;
      }
      return 'Novo registro criado';
    }

    if (log.operation === 'UPDATE' && log.changed_fields?.length > 0) {
      const changes = log.changed_fields
        .filter(field => !['updated_at', 'created_at'].includes(field))
        .map(field => {
          const oldVal = log.old_values?.[field];
          const newVal = log.new_values?.[field];
          
          // Special handling for role changes
          if (field === 'role') {
            return `Role: ${oldVal} → ${newVal}`;
          }
          
          return `${field}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`;
        });
      
      return changes.length > 0 ? changes.join(', ') : 'Campos de data atualizados';
    }

    if (log.operation === 'DELETE') {
      return `Registro excluído: ${log.old_values?.email || log.old_values?.display_name || log.record_id}`;
    }

    return '-';
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.new_values?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.old_values?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    const matchesOperation = filterOperation === 'all' || log.operation === filterOperation;
    
    return matchesSearch && matchesTable && matchesOperation;
  });

  // Filter login attempts
  const filteredLoginAttempts = loginAttempts.filter(attempt => {
    return searchTerm === '' || 
      attempt.user_identifier.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const failedLogins24h = loginAttempts.filter(a => {
    const attemptTime = new Date(a.attempt_time);
    const now = new Date();
    return !a.success && (now.getTime() - attemptTime.getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  const userCreations24h = auditLogs.filter(log => {
    const createdAt = new Date(log.created_at);
    const now = new Date();
    return log.table_name === 'profiles' && 
           log.operation === 'INSERT' && 
           (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  const roleChanges24h = auditLogs.filter(log => {
    const createdAt = new Date(log.created_at);
    const now = new Date();
    return (log.table_name === 'user_roles' || 
           (log.table_name === 'profiles' && log.changed_fields?.includes('role'))) && 
           (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Logins Falhos (24h)</p>
                <p className="text-2xl font-bold">{failedLogins24h}</p>
              </div>
              <div className={`p-2 rounded-full ${failedLogins24h > 5 ? 'bg-red-100 text-red-600' : 'bg-muted'}`}>
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Criados (24h)</p>
                <p className="text-2xl font-bold">{userCreations24h}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alterações de Role (24h)</p>
                <p className="text-2xl font-bold">{roleChanges24h}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auditoria de Segurança
              </CardTitle>
              <CardDescription>
                Histórico de ações de usuários, tentativas de login e alterações de permissões
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                <SelectItem value="profiles">Perfis</SelectItem>
                <SelectItem value="user_roles">Permissões</SelectItem>
                <SelectItem value="user_obra_access">Acesso a Obras</SelectItem>
                <SelectItem value="obras">Obras</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOperation} onValueChange={setFilterOperation}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Alteração</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="audit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="audit" className="gap-2">
                <Shield className="h-4 w-4" />
                Alterações ({filteredAuditLogs.length})
              </TabsTrigger>
              <TabsTrigger value="logins" className="gap-2">
                <LogIn className="h-4 w-4" />
                Tentativas de Login ({filteredLoginAttempts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audit">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAuditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro de auditoria encontrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAuditLogs.map((log) => (
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
                            <Badge variant="outline" className="text-xs">
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
            </TabsContent>

            <TabsContent value="logins">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredLoginAttempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma tentativa de login registrada
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredLoginAttempts.map((attempt) => (
                      <div 
                        key={attempt.id} 
                        className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                          !attempt.success ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <div className="mt-1">
                          {attempt.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={attempt.success ? 'default' : 'destructive'}>
                              {attempt.success ? 'Sucesso' : 'Falhou'}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 font-medium">
                            {attempt.user_identifier}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(attempt.attempt_time), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                            {attempt.user_agent && (
                              <span className="truncate max-w-[300px]" title={attempt.user_agent}>
                                {attempt.user_agent.length > 50 ? `${attempt.user_agent.substring(0, 50)}...` : attempt.user_agent}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
