import { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Loader2 } from 'lucide-react';
import { useCanEditObra } from '@/hooks/useCanEditObra';
import { useUserRole } from '@/hooks/useUserRole';

interface ObraPermissionGuardProps {
  children: ReactNode;
  obraId: string | undefined;
  showMessage?: boolean;
  /** Se true, apenas verificar role, não a obra específica */
  roleCheckOnly?: boolean;
}

/**
 * Componente que protege conteúdo baseado na permissão granular de edição de uma obra.
 * 
 * Usa a função `can_edit_obra` do banco para verificar se o usuário pode editar:
 * - Administradores podem editar qualquer obra
 * - Editores/GMs podem editar apenas obras com acesso explícito
 * - Fiscal primário pode editar sua obra
 * - Fiscais substitutos podem editar obras atribuídas
 */
export function ObraPermissionGuard({ 
  children, 
  obraId,
  showMessage = true,
  roleCheckOnly = false
}: ObraPermissionGuardProps) {
  const { isAdmin, canEdit: roleCanEdit, loading: roleLoading } = useUserRole();
  const { canEditObra, loading: obraLoading } = useCanEditObra(roleCheckOnly ? undefined : obraId);

  const loading = roleLoading || (!roleCheckOnly && obraLoading);
  
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
  const hasPermission = roleCheckOnly ? roleCanEdit : canEditObra;

  if (!hasPermission) {
    if (showMessage) {
      return (
        <Alert className="my-4">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para editar esta obra. 
            Apenas o fiscal responsável ou usuários com acesso atribuído podem editar.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return <>{children}</>;
}
