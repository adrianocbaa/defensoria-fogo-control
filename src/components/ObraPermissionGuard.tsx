import { ReactNode, useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface ObraPermissionGuardProps {
  children: ReactNode;
  obraId: string | undefined;
  showMessage?: boolean;
  /** Se true, apenas verificar role, não a obra específica */
  roleCheckOnly?: boolean;
}

interface ObraPermissionInfo {
  canEdit: boolean;
  role: 'admin' | 'titular' | 'substituto' | 'access' | 'none';
  obraStatus: string | null;
  loading: boolean;
}

/**
 * Componente que protege conteúdo baseado na permissão granular de edição de uma obra.
 * 
 * Verifica se o usuário pode editar considerando:
 * - Administradores podem editar qualquer obra
 * - Editores/GMs podem editar apenas obras com acesso explícito
 * - Fiscal primário pode editar sua obra
 * - Fiscais substitutos podem editar obras "Em Andamento" atribuídas
 */
export function ObraPermissionGuard({ 
  children, 
  obraId,
  showMessage = true,
  roleCheckOnly = false
}: ObraPermissionGuardProps) {
  const { user } = useAuth();
  const { isAdmin, canEdit: roleCanEdit, loading: roleLoading } = useUserRole();
  const [permissionInfo, setPermissionInfo] = useState<ObraPermissionInfo>({
    canEdit: false,
    role: 'none',
    obraStatus: null,
    loading: true,
  });

  useEffect(() => {
    if (roleCheckOnly || !obraId || !user) {
      setPermissionInfo({
        canEdit: roleCanEdit,
        role: isAdmin ? 'admin' : 'none',
        obraStatus: null,
        loading: false,
      });
      return;
    }

    const checkPermission = async () => {
      try {
        // Buscar dados da obra
        const { data: obra, error: obraError } = await supabase
          .from('obras')
          .select('status, fiscal_id')
          .eq('id', obraId)
          .single();

        if (obraError || !obra) {
          setPermissionInfo({
            canEdit: false,
            role: 'none',
            obraStatus: null,
            loading: false,
          });
          return;
        }

        // Admin sempre pode
        if (isAdmin) {
          setPermissionInfo({
            canEdit: true,
            role: 'admin',
            obraStatus: obra.status,
            loading: false,
          });
          return;
        }

        // Verificar se é fiscal titular
        if (obra.fiscal_id === user.id) {
          setPermissionInfo({
            canEdit: true,
            role: 'titular',
            obraStatus: obra.status,
            loading: false,
          });
          return;
        }

        // Verificar se é fiscal substituto
        const { data: substituto } = await supabase
          .from('obra_fiscal_substitutos')
          .select('id')
          .eq('obra_id', obraId)
          .eq('substitute_user_id', user.id)
          .maybeSingle();

        if (substituto) {
          // Substituto só pode editar obras "em_andamento"
          const canEdit = obra.status === 'em_andamento';
          setPermissionInfo({
            canEdit,
            role: 'substituto',
            obraStatus: obra.status,
            loading: false,
          });
          return;
        }

        // Verificar acesso explícito (user_obra_access)
        const { data: access } = await supabase
          .from('user_obra_access')
          .select('id')
          .eq('obra_id', obraId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (access) {
          // Acesso explícito só permite editar obras "em_andamento"
          const canEdit = obra.status === 'em_andamento';
          setPermissionInfo({
            canEdit,
            role: 'access',
            obraStatus: obra.status,
            loading: false,
          });
          return;
        }

        // Sem permissão
        setPermissionInfo({
          canEdit: false,
          role: 'none',
          obraStatus: obra.status,
          loading: false,
        });
      } catch (err) {
        console.error('Erro ao verificar permissão:', err);
        setPermissionInfo({
          canEdit: false,
          role: 'none',
          obraStatus: null,
          loading: false,
        });
      }
    };

    checkPermission();
  }, [user?.id, obraId, isAdmin, roleCanEdit, roleCheckOnly]);

  const loading = roleLoading || permissionInfo.loading;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admin sempre pode editar
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se roleCheckOnly, usar apenas verificação por role
  const hasPermission = roleCheckOnly ? roleCanEdit : permissionInfo.canEdit;

  if (!hasPermission) {
    if (showMessage) {
      // Mensagem específica para substitutos tentando editar obra fora de "em_andamento"
      const isStatusRestriction = 
        (permissionInfo.role === 'substituto' || permissionInfo.role === 'access') && 
        permissionInfo.obraStatus !== 'em_andamento';

      return (
        <Alert className="my-4">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {isStatusRestriction 
              ? `Você não pode editar esta obra porque ela está com status "${permissionInfo.obraStatus}". Fiscais substitutos só podem editar obras "Em Andamento".`
              : 'Você não tem permissão para editar esta obra. Apenas o fiscal responsável ou usuários com acesso atribuído podem editar.'
            }
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return <>{children}</>;
}
