import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  return (
    <div className="h-[calc(100vh-200px)] w-full">
      <SidebarProvider>
        <div className="flex w-full h-full">
          <MaintenanceSidebar />
          <main className="flex-1 overflow-auto">
            <MaintenanceDashboard />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}