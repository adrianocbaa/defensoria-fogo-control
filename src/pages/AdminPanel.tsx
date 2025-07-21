import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Edit, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export default function AdminPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles((data || []).map(profile => ({
        ...profile,
        role: profile.role as UserRole
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
  
  const updateUserRole = (userId: string, newRole: UserRole) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const saveChanges = async () => {
    const changesToSave = Object.entries(pendingChanges);
    if (changesToSave.length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há alterações para salvar',
      });
      return;
    }

    try {
      for (const [userId, newRole] of changesToSave) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      }

      // Update local state
      setProfiles(profiles.map(profile => 
        pendingChanges[profile.user_id] 
          ? { ...profile, role: pendingChanges[profile.user_id] }
          : profile
      ));

      setPendingChanges({});

      toast({
        title: 'Sucesso',
        description: `${changesToSave.length} permissão(ões) atualizada(s) com sucesso`,
      });
    } catch (error) {
      console.error('Error updating user roles:', error);
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
        <div className="flex items-center gap-3 mb-8">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie permissões de usuários</p>
          </div>
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
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div 
                    key={profile.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRoleIcon(profile.role)}
                      <div>
                        <p className="font-medium">
                          {profile.display_name || 'Usuário sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Cadastrado em {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={getRoleBadgeVariant(pendingChanges[profile.user_id] || profile.role)}>
                        {getRoleLabel(pendingChanges[profile.user_id] || profile.role)}
                        {pendingChanges[profile.user_id] && (
                          <span className="ml-1 text-xs opacity-70">(pendente)</span>
                        )}
                      </Badge>
                      
                      <Select
                        value={pendingChanges[profile.user_id] || profile.role}
                        onValueChange={(value: UserRole) => updateUserRole(profile.user_id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {Object.keys(pendingChanges).length > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setPendingChanges({})}
              >
                Cancelar Alterações
              </Button>
              <Button onClick={saveChanges}>
                Salvar Alterações ({Object.keys(pendingChanges).length})
              </Button>
            </div>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Níveis de Permissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
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