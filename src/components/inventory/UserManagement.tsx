import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Trash2, Edit, UserCheck, UserX, Key } from 'lucide-react';
import { UserRole } from '@/hooks/useUserRole';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  user_id: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, role, created_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role } : user
      ));

      toast({
        title: 'Sucesso',
        description: 'Perfil do usuário atualizado com sucesso',
      });
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil do usuário',
        variant: 'destructive',
      });
    }
  };

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));

      toast({
        title: 'Sucesso',
        description: currentStatus ? 'Usuário desativado com sucesso' : 'Usuário ativado com sucesso',
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do usuário',
        variant: 'destructive',
      });
    }
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Senha de ${userName} resetada para 12345678`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao resetar senha do usuário',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'editor': return 'default';
      case 'gm': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'gm': return 'Gerente';
      case 'manutencao': return 'Manutenção';
      default: return 'Visualizador';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando usuários...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestão de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie os perfis e permissões dos usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {user.display_name || 'Nome não informado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleUserActive(user.id, user.is_active)}
                        />
                        <span className="text-sm">
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setNewRole(user.role);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Key className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja resetar a senha de <strong>{user.display_name}</strong>?
                              <br />
                              A nova senha será: <strong>12345678</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => resetUserPassword(user.user_id, user.display_name || 'usuário')}
                            >
                              Confirmar Reset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Role Dialog */}
      <AlertDialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Perfil do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Altere o perfil de {editingUser?.display_name || 'usuário'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Visualizador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="gm">Gerente</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingUser && updateUserRole(editingUser.id, newRole)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões por Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="destructive">Administrador</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Acesso total ao sistema</li>
                <li>• Gerenciar usuários</li>
                <li>• CRUD completo de materiais</li>
                <li>• Todas as movimentações</li>
                <li>• Relatórios e notificações</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="default">Editor</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CRUD de materiais</li>
                <li>• Movimentações de estoque</li>
                <li>• Relatórios</li>
                <li>• Notificações</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="secondary">Gerente</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visualizar materiais</li>
                <li>• Relatórios completos</li>
                <li>• Notificações</li>
                <li>• Dashboard executivo</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">Visualizador</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Apenas visualização</li>
                <li>• Relatórios básicos</li>
                <li>• Notificações</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}