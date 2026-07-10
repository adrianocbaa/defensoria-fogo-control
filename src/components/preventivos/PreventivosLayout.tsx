import { ReactNode, useState } from 'react';
import { AppSidebar } from '@/components/home/AppSidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface PreventivosLayoutProps {
  children: ReactNode;
  header: (ctx: { openMenu: () => void }) => ReactNode;
}

export function PreventivosLayout({ children, header }: PreventivosLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-home-bg">
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <div className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
          <AppSidebar />
        </div>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-72 border-0 bg-home-sidebar-bg p-0 text-home-sidebar-fg"
          >
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {header({ openMenu: () => setMobileOpen(true) })}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function SidebarMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onClick}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
