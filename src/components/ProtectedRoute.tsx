import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [checkingActive, setCheckingActive] = useState(true);

  useEffect(() => {
    const checkUserActive = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', user.id)
          .single();

        if (profile && !profile.is_active) {
          setIsActive(false);
          await signOut();
        } else {
          setIsActive(true);
        }
      }
      setCheckingActive(false);
    };

    checkUserActive();
  }, [user, signOut]);

  if (loading || checkingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Sua conta está bloqueada. Entre em contato com o administrador do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}