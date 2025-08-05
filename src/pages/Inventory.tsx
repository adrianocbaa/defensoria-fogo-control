import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimpleHeader } from '@/components/SimpleHeader';
import { InventorySidebar } from '@/components/InventorySidebar';
import { InventoryContent } from '@/components/InventoryContent';

export default function Inventory() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <SimpleHeader>
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <InventorySidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          <InventoryContent activeSection={activeSection} />
        </div>
      </SidebarProvider>
    </SimpleHeader>
  );
}