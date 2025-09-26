import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/PermissionGuard';

interface LoginAttempt {
  id: string;
  user_identifier: string;
  attempt_time: string;
  success: boolean;
  user_agent?: string | null;
  ip_address?: string | null;
}

export function SecurityDashboard() {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLoginAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLoginAttempts((data || []) as LoginAttempt[]);
    } catch (error) {
      console.error('Erro ao buscar tentativas de login:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de segurança.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldAttempts = async () => {
    try {
      await supabase.rpc('cleanup_old_login_attempts');
      await fetchLoginAttempts();
      toast({
        title: "Limpeza realizada",
        description: "Tentativas antigas foram removidas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível limpar os dados antigos.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLoginAttempts();
  }, []);

  const recentFailures = loginAttempts.filter(attempt => 
    !attempt.success && 
    new Date(attempt.attempt_time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const suspiciousPatterns = loginAttempts.reduce((acc, attempt) => {
    if (!attempt.success) {
      const key = attempt.user_identifier;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const highRiskUsers = Object.entries(suspiciousPatterns)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PermissionGuard requiresAdmin showMessage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Dashboard de Segurança</h2>
          </div>
          <Button onClick={cleanupOldAttempts} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Dados Antigos
          </Button>
        </div>

        {recentFailures.length > 5 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Detectadas {recentFailures.length} tentativas de login falhadas nas últimas 24 horas.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total de Tentativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loginAttempts.length}</div>
              <p className="text-xs text-muted-foreground">Últimas 50 tentativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Falhas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{recentFailures.length}</div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Usuários de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{highRiskUsers.length}</div>
              <p className="text-xs text-muted-foreground">3+ falhas</p>
            </CardContent>
          </Card>
        </div>

        {highRiskUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Usuários com Múltiplas Falhas</CardTitle>
              <CardDescription>
                Usuários com 3 ou mais tentativas de login falhadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Tentativas Falhadas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRiskUsers.map(([identifier, count]) => (
                    <TableRow key={identifier}>
                      <TableCell className="font-mono text-sm">{identifier}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        <Badge variant={count >= 5 ? "destructive" : "secondary"}>
                          {count >= 5 ? "Alto Risco" : "Monitorar"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tentativas de Login Recentes</CardTitle>
            <CardDescription>
              Histórico das últimas tentativas de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginAttempts.slice(0, 20).map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(attempt.attempt_time).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{attempt.user_identifier}</TableCell>
                    <TableCell>
                      <Badge variant={attempt.success ? "default" : "destructive"}>
                        {attempt.success ? "Sucesso" : "Falha"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {attempt.user_agent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}