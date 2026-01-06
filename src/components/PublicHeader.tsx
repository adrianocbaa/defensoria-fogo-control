import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

interface PublicHeaderProps {
  children: ReactNode;
}

export function PublicHeader({ children }: PublicHeaderProps) {
  return (
    <div className="w-full bg-background">
      {/* Public Header */}
      <header className="w-full bg-primary text-primary-foreground shadow-lg">
        <div className="w-full px-4 py-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
              <img 
                src="/images/logo-sidif.png" 
                alt="SIDIF - Sistema Integrado Diretoria de Infraestrutura Física" 
                className="h-24 w-auto"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/apresentacao">
                <Button variant="ghost" size="sm" className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="secondary" size="sm">
                  Acessar Sistema
                </Button>
              </Link>
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
