import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Sector } from '@/hooks/useUserSectors';
import { useAvailableSectors } from '@/hooks/useAvailableSectors';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Edit, Eye, Wrench, ChevronDown, Mail, Key, UserX, UserCheck, RotateCcw, UserPlus } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  sectors: Sector[];
  created_at: string;
  is_active: boolean;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { sectors: availableSectors, loading: sectorsLoading } = useAvailableSectors();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [tempPassDialog, setTempPassDialog] = useState<{ open: boolean; userName: string; password: string }>({ open: false, userName: '', password: '' });
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [creatingUser, setCreatingUser] = useState(false);
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, email, role, sectors, created_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setProfiles((data || []).map(profile => ({
        ...profile,
        email: profile.email || 'Email não disponível',
        role: profile.role as UserRole,
        is_active: profile.is_active ?? true
      })));
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const [pendingChanges, setPendingChanges] = useState<Record<string, UserRole>>({});
  const [pendingSectorChanges, setPendingSectorChanges] = useState<Record<string, Sector[]>>({});
  
  const updateUserRole = (userId: string, newRole: UserRole) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const toggleUserSector = (userId: string, sector: Sector, currentSectors: Sector[]) => {
    const hasSector = currentSectors.includes(sector);
    const newSectors = hasSector 
      ? currentSectors.filter(s => s !== sector)
      : [...currentSectors, sector];
    
    setPendingSectorChanges(prev => ({
      ...prev,
      [userId]: newSectors
    }));
  };

  // Usar os setores dinâmicos carregados do banco de dados
  const modules = availableSectors;

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const saveChanges = async () => {
    const roleChanges = Object.entries(pendingChanges);
    const sectorChanges = Object.entries(pendingSectorChanges);
    
    if (roleChanges.length === 0 && sectorChanges.length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há alterações para salvar',
      });
      return;
    }

    try {
      // Save role changes
      for (const [userId, newRole] of roleChanges) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      }

      // Save sector changes
      for (const [userId, newSectors] of sectorChanges) {
        const { error } = await supabase
          .from('profiles')
          .update({ sectors: newSectors })
          .eq('user_id', userId);

        if (error) throw error;
      }

      await fetchProfiles();
      setPendingChanges({});
      setPendingSectorChanges({});

      toast({
        title: 'Sucesso',
        description: `Permissões atualizadas com sucesso`,
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar permissões',
        variant: 'destructive',
      });
    }
  };

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => 
        p.user_id === userId ? { ...p, is_active: !currentStatus } : p
      ));

      toast({
        title: 'Sucesso',
        description: currentStatus ? 'Usuário desativado' : 'Usuário ativado',
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  const deleteUserByEmail = async () => {
    if (!deleteEmail || !deleteEmail.includes('@')) {
      toast({ title: 'Erro', description: 'Email inválido', variant: 'destructive' });
      return;
    }
    setDeletingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { email: deleteEmail },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || (data as any)?.error) {
        const msg = (error as any)?.message || (data as any)?.error || 'Falha ao excluir usuário';
        toast({ title: 'Erro ao excluir usuário', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Usuário excluído', description: `Removido: ${deleteEmail}` });
      setDeleteUserDialog(false);
      setDeleteEmail('');
      fetchProfiles();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir usuário', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setDeletingUser(false);
    }
  };
  const createNewUser = async () => {
    if (!newUserEmail || !newUserEmail.includes('@')) {
      toast({
        title: 'Erro',
        description: 'Email inválido',
        variant: 'destructive',
      });
      return;
    }

    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Quick pre-check to avoid calling the edge function when email already exists
      const { data: existingProfiles, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .limit(1);

      if (checkErr) {
        console.error('Error checking existing email:', checkErr);
      } else if (existingProfiles && existingProfiles.length > 0) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está registrado no sistema. Use outro email ou edite o usuário existente.',
          variant: 'destructive',
        });
        setCreatingUser(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          displayName: newUserName || newUserEmail.split('@')[0],
          role: newUserRole,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      // When edge function returns non-2xx status, error object contains the response
      if (error) {
        let errorMessage = 'Erro ao criar usuário';

        // Try to extract error payload returned by the edge function
        const anyErr: any = error as any;
        if (anyErr?.context?.response && typeof anyErr.context.response.text === 'function') {
          try {
            const raw = await anyErr.context.response.text();
            const parsed = JSON.parse(raw);
            if (parsed?.error) errorMessage = parsed.error;
          } catch {
            // ignore JSON parse issues and fall back to default message
          }
        } else if (data?.error) {
          errorMessage = data.error as string;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Specific duplicate email detection
        if (errorMessage.includes('already been registered') || errorMessage.includes('email_exists')) {
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já está registrado no sistema. Use outro email ou edite o usuário existente.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Erro ao criar usuário',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Usuário criado!',
        description: `Email enviado para ${newUserEmail} com a senha temporária: Admin123`,
      });

      setCreateUserDialog(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('viewer');
      fetchProfiles(); // Recarregar lista
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar usuário',
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId }
      });

      if (error) throw error;

      const tempPassword: string | undefined = (data as any)?.tempPassword;
      if (tempPassword) {
        setTempPassDialog({ open: true, userName, password: tempPassword });
        try { await navigator.clipboard.writeText(tempPassword); } catch {}
      }

      toast({
        title: 'Senha resetada',
        description: tempPassword
          ? `Senha temporária de ${userName}: ${tempPassword}\n(Copiada para a área de transferência)`
          : `Senha de ${userName} resetada.`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao resetar senha',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'editor':
        return <Edit className="h-4 w-4" />;
      case 'gm':
        return <Wrench className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'editor':
        return 'default' as const;
      case 'gm':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'gm':
        return 'GM';
      default:
        return 'Visualizador';
    }
  };

  if (roleLoading || sectorsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <PageHeader
          title="Painel Administrativo"
          subtitle="Gerencie permissões de usuários"
        />

        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setCreateUserDialog(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Criar Novo Usuário
          </Button>
          <Button
            onClick={() => setDeleteUserDialog(true)}
            variant="destructive"
            className="gap-2"
          >
            <UserX className="h-4 w-4" />
            Forçar exclusão por email
          </Button>
          <Button
            onClick={() => navigate('/data-recovery')}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Recuperar Dados Excluídos
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários e Permissões</CardTitle>
            <CardDescription>
              Defina quem pode editar o sistema: Administradores têm acesso total, 
              Editores podem modificar dados, Visualizadores só podem ver.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => {
                  const currentSectors = pendingSectorChanges[profile.user_id] || profile.sectors || [];
                  const hasPendingChanges = !!pendingChanges[profile.user_id] || !!pendingSectorChanges[profile.user_id];
                  const isExpanded = expandedUsers.has(profile.user_id);
                  
                  return (
                    <Collapsible
                      key={profile.id}
                      open={isExpanded}
                      onOpenChange={() => toggleUserExpanded(profile.user_id)}
                    >
                      <div className={`border rounded-lg ${!profile.is_active ? 'opacity-50' : ''}`}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                              {getRoleIcon(pendingChanges[profile.user_id] || profile.role)}
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {profile.display_name || 'Usuário sem nome'}
                                  </p>
                                  {!profile.is_active && (
                                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{profile.email}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cadastrado em {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {/* Ações Rápidas */}
                              <div className="flex gap-1">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Resetar senha">
                                      <Key className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Resetar senha de <strong>{profile.display_name}</strong>?
                                        <br />
                                        <span className="text-sm text-muted-foreground">Uma senha temporária segura será gerada e exibida após a confirmação (copiada para a área de transferência).</span>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => resetUserPassword(profile.user_id, profile.display_name)}
                                      >
                                        Confirmar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserActive(profile.user_id, profile.is_active)}
                                  title={profile.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                                >
                                  {profile.is_active ? (
                                    <UserX className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                              </div>

                              <Badge variant={getRoleBadgeVariant(pendingChanges[profile.user_id] || profile.role)}>
                                {getRoleLabel(pendingChanges[profile.user_id] || profile.role)}
                                {hasPendingChanges && (
                                  <span className="ml-1 text-xs opacity-70">(pendente)</span>
                                )}
                              </Badge>
                              
                              <Select
                                value={pendingChanges[profile.user_id] || profile.role}
                                onValueChange={(value: UserRole) => {
                                  updateUserRole(profile.user_id, value);
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">Visualizador</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="gm">GM</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t p-4 bg-muted/20">
                            <h4 className="text-sm font-medium mb-3">Módulos Permitidos</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {modules.map((module) => {
                                const ModuleIcon = module.icon;
                                const isEnabled = currentSectors.includes(module.id);
                                
                                return (
                                  <div
                                    key={module.id}
                                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors bg-background"
                                  >
                                    <Label
                                      htmlFor={`${profile.user_id}-${module.id}`}
                                      className="flex items-center gap-2 cursor-pointer flex-1"
                                    >
                                      <ModuleIcon className="h-4 w-4" />
                                      <span className="text-sm">{module.label}</span>
                                    </Label>
                                    <Switch
                                      id={`${profile.user_id}-${module.id}`}
                                      checked={isEnabled}
                                      onCheckedChange={() => toggleUserSector(profile.user_id, module.id, currentSectors)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {(Object.keys(pendingChanges).length > 0 || Object.keys(pendingSectorChanges).length > 0) && (
          <div className="mt-4 flex justify-end">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPendingChanges({});
                  setPendingSectorChanges({});
                }}
              >
                Cancelar Alterações
              </Button>
              <Button onClick={saveChanges}>
                Salvar Alterações ({Object.keys(pendingChanges).length + Object.keys(pendingSectorChanges).length})
              </Button>
            </div>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Níveis de Permissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">Visualizador</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pode apenas visualizar dados do sistema
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Editor</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pode criar, editar e excluir núcleos e equipamentos
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  <h3 className="font-medium">GM</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pode gerenciar tarefas de manutenção e atualizar status
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  <h3 className="font-medium">Administrador</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso total + gerenciamento de usuários
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal com senha temporária */}
        <AlertDialog open={tempPassDialog.open} onOpenChange={(open) => setTempPassDialog((prev) => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Senha temporária gerada</AlertDialogTitle>
              <AlertDialogDescription>
                Informe ao usuário <strong>{tempPassDialog.userName}</strong> para colar a senha sem espaços e alterá-la no primeiro acesso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-muted rounded-md p-3 font-mono text-sm select-all">
              {tempPassDialog.password}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  if (tempPassDialog.password && navigator?.clipboard) {
                    try { navigator.clipboard.writeText(tempPassDialog.password); } catch {}
                  }
                  setTempPassDialog({ open: false, userName: '', password: '' });
                }}
              >
                Copiar e fechar
              </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog para criar novo usuário */}
          <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário. Uma senha temporária (Admin123) será enviada por email.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">Email *</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">Nome de Exibição</Label>
                  <Input
                    id="new-user-name"
                    type="text"
                    placeholder="Nome do usuário (opcional)"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-user-role">Perfil</Label>
                  <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                    <SelectTrigger id="new-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="gm">GM</SelectItem>
                      <SelectItem value="contratada">Contratada</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateUserDialog(false);
                    setNewUserEmail('');
                    setNewUserName('');
                    setNewUserRole('viewer');
                  }}
                  disabled={creatingUser}
                >
                  Cancelar
                </Button>
                <Button onClick={createNewUser} disabled={creatingUser || !newUserEmail}>
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog para forçar exclusão de usuário por email */}
          <Dialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forçar exclusão de usuário</DialogTitle>
                <DialogDescription>
                  Remove o usuário do Auth e apaga vínculos (profiles, user_roles). Use quando o Supabase recusar a exclusão por conflito no banco.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-user-email">Email do usuário *</Label>
                  <Input
                    id="delete-user-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteUserDialog(false)} disabled={deletingUser}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={deleteUserByEmail} disabled={deletingUser || !deleteEmail}>
                  {deletingUser ? 'Excluindo...' : 'Excluir Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    </Layout>
  );
}