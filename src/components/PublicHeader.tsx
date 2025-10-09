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
