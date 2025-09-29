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
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { Sector } from '@/hooks/useUserSectors';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Edit, Eye, Wrench, HardHat, Wind, Package, Briefcase, ChevronDown, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  sectors: Sector[];
  created_at: string;
}

export default function AdminPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    try {
      // Buscar profiles com RPC para pegar email do auth.users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar emails do auth através de um RPC ou admin API
      // Como não temos acesso direto ao auth.users, vamos usar o email do raw_user_meta_data
      const profilesWithEmails = await Promise.all(
        (profilesData || []).map(async (profile) => {
          try {
            // Tentar buscar o usuário através do supabase auth admin
            const { data: { user }, error } = await supabase.auth.admin.getUserById(profile.user_id);
            
            return {
              ...profile,
              email: user?.email || 'Email não disponível',
              role: profile.role as UserRole
            };
          } catch {
            return {
              ...profile,
              email: 'Email não disponível',
              role: profile.role as UserRole
            };
          }
        })
      );

      setProfiles(profilesWithEmails);
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

  const modules = [
    { id: 'preventivos' as Sector, label: 'Preventivos', icon: Shield },
    { id: 'manutencao' as Sector, label: 'Manutenção', icon: Wrench },
    { id: 'ar_condicionado' as Sector, label: 'Ar Condicionado', icon: Wind },
    { id: 'obra' as Sector, label: 'Obra', icon: HardHat },
    { id: 'projetos' as Sector, label: 'Projetos', icon: Briefcase },
    { id: 'almoxarifado' as Sector, label: 'Almoxarifado', icon: Package },
  ];

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

  if (roleLoading) {
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
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                              {getRoleIcon(pendingChanges[profile.user_id] || profile.role)}
                              <div className="text-left">
                                <p className="font-medium">
                                  {profile.display_name || 'Usuário sem nome'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{profile.email}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cadastrado em {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </Layout>
  );
}