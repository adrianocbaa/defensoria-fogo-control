import { useState } from 'react';
import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SimpleHeader } from '@/components/SimpleHeader';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <SimpleHeader>
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <MaintenanceSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <main className="flex-1 overflow-auto min-w-0">
            {/* Mobile menu trigger */}
            <div className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-4 py-2">
              <SidebarTrigger className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <span className="text-sm font-medium text-foreground">Menu</span>
            </div>
            <MaintenanceDashboard activeSection={activeSection} />
          </main>
        </div>
      </SidebarProvider>
    </SimpleHeader>
  );
}
