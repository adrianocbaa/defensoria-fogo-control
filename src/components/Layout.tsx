import { ReactNode } from 'react';
import { Building2, Shield } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">
                Defensoria Pública de Mato Grosso
              </h1>
              <p className="text-sm text-primary-foreground/80">
                Sistema de Controle de Prevenção de Incêndio
              </p>
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