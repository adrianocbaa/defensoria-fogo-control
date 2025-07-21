import { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface PermissionGuardProps {
  children: ReactNode;
  requiresEdit?: boolean;
  requiresAdmin?: boolean;
  showMessage?: boolean;
}

export function PermissionGuard({ 
  children, 
  requiresEdit = false, 
  requiresAdmin = false, 
  showMessage = true 
}: PermissionGuardProps) {
  const { canEdit, isAdmin, role } = useUserRole();

  const hasPermission = requiresAdmin ? isAdmin : (requiresEdit ? canEdit : true);

  if (!hasPermission) {
    if (showMessage) {
      return (
        <Alert className="my-4">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {requiresAdmin 
              ? 'Esta ação requer permissão de administrador.' 
              : 'Esta ação requer permissão de edição. Seu perfil atual é: ' + 
                (role === 'admin' ? 'Administrador' : 
                 role === 'editor' ? 'Editor' : 'Visualizador')
            }
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return <>{children}</>;
}