import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimpleHeader } from '@/components/SimpleHeader';
import { InventorySidebar } from '@/components/InventorySidebar';
import { InventoryContent } from '@/components/InventoryContent';

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const sectionFromQuery = searchParams.get('section') || 'dashboard';
  const [activeSection, setActiveSection] = useState(sectionFromQuery);

  useEffect(() => {
    const section = searchParams.get('section') || 'dashboard';
    setActiveSection(section);
  }, [searchParams]);

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