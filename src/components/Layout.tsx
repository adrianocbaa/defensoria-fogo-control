import { ReactNode } from 'react';
import { Building2, Shield, LogOut, User, Eye, Settings, Wrench, UserCog, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import logoSidif from '@/assets/logo-sidif-new.png';
import logoDif from '@/assets/logo-dif-dpmt.jpg';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { profile } = useProfile();
  return (
    <div className="min-h-screen bg-background">

      {/* Header principal */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={logoSidif} 
                alt="SiDIF" 
                className="h-12 object-contain"
              />
              <div className="h-10 w-px bg-primary-foreground/40" />
              <img 
                src={logoDif} 
                alt="DIF" 
                className="h-10 object-contain rounded"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-6 text-sm font-medium">
                <Link 
                  to="/" 
                  className="flex items-center gap-2 hover:text-primary-foreground/80 transition-colors cursor-pointer"
                >
                  <LayoutGrid className="h-4 w-4" />
                  MÓDULOS
                </Link>
              </div>
              
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
                          <UserCog className="mr-2 h-4 w-4" />
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
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Building2 className="h-4 w-4" />
            <span>
              Defensoria Pública do Estado de Mato Grosso - Sistema Interno
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}