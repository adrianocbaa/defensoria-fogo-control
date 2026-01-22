import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useObraSubstitutos } from '@/hooks/useObraSubstitutos';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Trash2, User } from 'lucide-react';

interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

interface FiscalSubstitutosManagerProps {
  obraId: string;
  obraNome: string;
  canManage?: boolean;
}

export function FiscalSubstitutosManager({ obraId, obraNome, canManage = true }: FiscalSubstitutosManagerProps) {
  const { substitutos, loading, addSubstituto, removeSubstituto } = useObraSubstitutos(obraId);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      setLoadingUsers(true);
      try {
        // Buscar usuários ativos com setor DIF (fiscais potenciais)
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, setores_atuantes')
          .eq('is_active', true)
          .contains('setores_atuantes', ['dif'])
          .order('display_name');

        if (error) throw error;
        setAvailableUsers(data || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAvailableUsers();
  }, []);

  // Filtrar usuários que já são substitutos
  const substitutoIds = new Set(substitutos.map(s => s.substitute_user_id));
  const filteredUsers = availableUsers.filter(u => !substitutoIds.has(u.user_id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    
    setAdding(true);
    const success = await addSubstituto(selectedUserId);
    if (success) {
      setSelectedUserId('');
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este acesso autorizado?')) {
      await removeSubstituto(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Acessos Autorizados
        </CardTitle>
        <CardDescription>
          {canManage 
            ? 'Autorize servidores a editar esta obra'
            : 'Visualize os servidores autorizados para esta obra'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar novo substituto - apenas para titulares */}
        {canManage && (
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingUsers}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={loadingUsers ? 'Carregando...' : 'Selecione um servidor'} />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map(user => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.display_name || user.email || 'Sem nome'}
                  </SelectItem>
                ))}
                {filteredUsers.length === 0 && !loadingUsers && (
                  <SelectItem value="__none" disabled>
                    Nenhum servidor disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAdd} 
              disabled={!selectedUserId || adding}
              size="icon"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Lista de substitutos */}
        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : substitutos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum servidor autorizado cadastrado
            </p>
          ) : (
            substitutos.map(sub => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Autorizado</Badge>
                  <span className="text-sm font-medium">
                    {sub.profile?.display_name || sub.profile?.email || 'Usuário desconhecido'}
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(sub.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
