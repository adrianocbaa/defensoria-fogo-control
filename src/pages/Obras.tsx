import { SimpleHeader } from '@/components/SimpleHeader';
import { Building, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Obras() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Mapa de Obras Públicas</h1>
                  <p className="text-muted-foreground">
                    Visualização e acompanhamento de obras por localização
                  </p>
                </div>
              </div>
              
              {/* Mobile menu toggle */}
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Sidebar */}
            <div className={`
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0 transition-transform duration-300 ease-in-out
              fixed md:relative top-0 left-0 z-40 md:z-0
              w-80 md:w-80 h-full md:h-auto
              bg-card border-r md:border-r-0 md:bg-transparent
              p-4 md:p-0
              shadow-lg md:shadow-none
            `}>
              <div className="space-y-4">
                <div className="flex items-center justify-between md:justify-start">
                  <h2 className="text-lg font-semibold">Filtros</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Placeholder para filtros */}
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground text-center">
                      Filtros serão implementados na próxima etapa
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground text-center">
                      Busca por município
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground text-center">
                      Filtro por status
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground text-center">
                      Filtro por tipo
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main map area */}
            <div className="flex-1 min-h-0">
              <div className="h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Área do Mapa
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Mapa interativo será implementado na próxima etapa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </SimpleHeader>
  );
}