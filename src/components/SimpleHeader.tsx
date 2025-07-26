import { ReactNode } from 'react';
import { User, LogOut, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link, useLocation } from 'react-router-dom';

interface SimpleHeaderProps {
  children: ReactNode;
}

export function SimpleHeader({ children }: SimpleHeaderProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Simplified Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                <img 
                  src="/lovable-uploads/b1b86eb2-3439-4770-9572-77fb9dd247a3.png" 
                  alt="Defensoria Pública Logo" 
                  className="h-16 w-auto"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  DEFENSORIA PÚBLICA
                </h1>
                <p className="text-sm text-primary-foreground/90">
                  DO ESTADO DE MATO GROSSO
                </p>
              </div>
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
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Settings className="mr-2 h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
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