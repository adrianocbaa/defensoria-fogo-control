import { ReactNode } from 'react';
import { Building2, Shield, LogOut, User, Eye, Settings, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  return (
    <div className="min-h-screen bg-background">

      {/* Header principal */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-[260px]">
              <div className="flex items-center justify-center">
                <img 
                  src="/lovable-uploads/b1b86eb2-3439-4770-9572-77fb9dd247a3.png" 
                  alt="Defensoria Pública Logo" 
                  className="h-10 w-auto"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  DEFENSORIA PÚBLICA
                </h1>
                <p className="text-xs text-primary-foreground/90">
                  DO ESTADO DE MATO GROSSO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-6 text-sm font-medium">
                <a 
                  href="https://painel.dif.app.br/" 
                  className="hover:text-primary-foreground/80 transition-colors cursor-pointer"
                >
                  PREVENTIVOS DE INCÊNDIO
                </a>
                <Link 
                  to="/maintenance" 
                  className="hover:text-primary-foreground/80 transition-colors cursor-pointer"
                >
                  MANUTENÇÃO
                </Link>
                <Link 
                  to="/obras" 
                  className="hover:text-primary-foreground/80 transition-colors cursor-pointer"
                >
                  OBRAS
                </Link>
              </div>
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user?.email?.split('@')[0] || 'Usuário'}
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
                          <Settings className="mr-2 h-4 w-4" />
                          Painel Admin
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