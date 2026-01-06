import { ReactNode } from 'react';
import { User, LogOut, Settings, ArrowLeft, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link, useLocation } from 'react-router-dom';

interface SimpleHeaderProps {
  children: ReactNode;
}

export function SimpleHeader({ children }: SimpleHeaderProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, canEdit } = useUserRole();
  const { profile } = useProfile();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <div className="w-full bg-background">
      {/* Simplified Header */}
      <header className="w-full bg-primary text-primary-foreground shadow-lg">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/images/logo-sidif.png" 
                alt="SIDIF - Sistema Integrado Diretoria de Infraestrutura Física" 
                className="h-16 w-auto"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Back to Dashboard Button */}
              {!isDashboard && (
                <Link to="/">
                  <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Voltar ao Dashboard</span>
                  </Button>
                </Link>
              )}
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile?.display_name?.charAt(0).toUpperCase() || 
                         user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">
                      {profile?.display_name || user?.email?.split('@')[0] || 'Usuário'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        Gerenciar Usuários
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}