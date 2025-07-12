import { ReactNode } from 'react';
import { Building2, Shield } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
            <div className="hidden md:flex gap-6 text-sm font-medium">
              <span>INSTITUCIONAL</span>
              <span>SERVIÇOS</span>
              <span>IMPRENSA</span>
              <span>TRANSPARÊNCIA</span>
              <span>FALE CONOSCO</span>
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