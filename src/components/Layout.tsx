import { ReactNode } from 'react';
import { Building2, Shield, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar governamental */}
      <div className="bg-primary/90 text-primary-foreground text-xs py-1">
        <div className="container mx-auto px-4 flex justify-end gap-4">
          <span>Contraste</span>
          <span>Acessibilidade</span>
          <span>Ouvidoria</span>
          <span>Webmail</span>
        </div>
      </div>

      {/* Header principal */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="border-2 border-primary-foreground rounded p-2">
                <Shield className="h-8 w-8" />
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
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-6 text-sm font-medium">
                <span>INSTITUCIONAL</span>
                <span>SERVIÇOS</span>
                <span>IMPRENSA</span>
                <span>TRANSPARÊNCIA</span>
                <span>FALE CONOSCO</span>
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