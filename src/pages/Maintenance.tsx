import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimpleHeader } from '@/components/SimpleHeader';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <SimpleHeader>
      <div className="h-[calc(100vh-200px)] w-full">
        <SidebarProvider>
          <div className="flex w-full h-full">
            <MaintenanceSidebar 
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
            <main className="flex-1 overflow-auto">
              <MaintenanceDashboard activeSection={activeSection} />
            </main>
          </div>
        </SidebarProvider>
      </div>
    </SimpleHeader>
  );
}