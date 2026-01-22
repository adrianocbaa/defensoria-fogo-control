import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  LogIn, 
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoginAttempt {
  id: string;
  user_identifier: string;
  attempt_time: string;
  success: boolean;
  user_agent: string | null;
  ip_address: unknown;
}

export function LoginAttemptsPanel() {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLoginAttempts = async () => {
    setLoading(true);
    try {
      const { data: logins, error: loginError } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(200);

      if (loginError) throw loginError;
      setLoginAttempts(logins || []);
    } catch (error) {
      console.error('Error fetching login attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginAttempts();
  }, []);

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

  const successLogins24h = loginAttempts.filter(a => {
    const attemptTime = new Date(a.attempt_time);
    const now = new Date();
    return a.success && (now.getTime() - attemptTime.getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-muted-foreground">Logins Bem-Sucedidos (24h)</p>
                <p className="text-2xl font-bold">{successLogins24h}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
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
                Tentativas de Login
              </CardTitle>
              <CardDescription>
                Histórico de tentativas de login no sistema
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLoginAttempts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

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
                            {attempt.user_agent.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
