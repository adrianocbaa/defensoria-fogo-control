import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SimpleHeader } from '@/components/SimpleHeader';
import { MaintenanceSidebar } from '@/components/MaintenanceSidebar';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setMobileOpen(false);
  };

  return (
    <SimpleHeader>
      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 shrink-0 border-r bg-card">
          <MaintenanceSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        </aside>

        <main className="flex-1 min-w-0">
          {/* Mobile menu trigger — sits inside the content area, below the green header */}
          <div className="md:hidden flex items-center gap-2 border-b bg-background px-4 py-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu"
                  className="h-10 w-10 text-foreground"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 p-0"
              >
                <MaintenanceSidebar
                  activeSection={activeSection}
                  onSectionChange={handleSectionChange}
                />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-foreground">Menu</span>
          </div>

          <MaintenanceDashboard activeSection={activeSection} />
        </main>
      </div>
    </SimpleHeader>
  );
}
