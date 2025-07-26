import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimpleHeader } from '@/components/SimpleHeader';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <SimpleHeader>
      <SidebarProvider>
        <div className="flex w-full min-h-[calc(100vh-80px)]">
          <MaintenanceSidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <main className="flex-1 overflow-auto">
            <MaintenanceDashboard activeSection={activeSection} />
          </main>
        </div>
      </SidebarProvider>
    </SimpleHeader>
  );
}