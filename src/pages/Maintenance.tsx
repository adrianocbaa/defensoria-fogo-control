import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header principal */}
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
                  SISTEMA DE MANUTENÇÃO
                </h1>
                <p className="text-sm text-primary-foreground/90">
                  DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <SidebarProvider>
        <div className="flex w-full">
          <MaintenanceSidebar />
          <main className="flex-1">
            <MaintenanceDashboard />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}