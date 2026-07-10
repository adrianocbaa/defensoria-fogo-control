import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useObraNotifications } from '@/hooks/useObraNotifications';
import { useNavigate } from 'react-router-dom';
import { SidebarMenuButton } from './PreventivosLayout';

interface PreventivosPageHeaderProps {
  onOpenMenu: () => void;
  globalSearch: string;
  onGlobalSearchChange: (v: string) => void;
}

export function PreventivosPageHeader({ onOpenMenu, globalSearch, onGlobalSearchChange }: PreventivosPageHeaderProps) {
  const { unreadCount, markAllAsRead } = useObraNotifications();
  const navigate = useNavigate();

  const handleBell = () => {
    markAllAsRead();
    navigate('/gerenciar-obras');
  };

  return (
    <header className="border-b border-home-border bg-home-surface">
      <div className="flex items-start gap-3 px-4 py-5 md:px-8 md:py-6">
        <SidebarMenuButton onClick={onOpenMenu} />

        {/* Left: breadcrumb + title */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-home-muted">Dashboard / Preventivos</p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-foreground">Preventivos</h1>
          <p className="mt-1 text-sm text-home-muted">Controle de prevenção contra incêndio dos núcleos</p>
        </div>

        {/* Right: search + bell + avatar */}
        <div className="flex items-center gap-3 self-start pt-1">
          <div className="relative hidden md:block w-[280px] lg:w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-home-muted" />
            <Input
              type="search"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Pesquisar no sistema..."
              className="h-11 rounded-full border-home-border bg-home-bg pl-11 pr-5 text-[15px] focus-visible:ring-primary/40"
              aria-label="Pesquisar no sistema"
            />
          </div>

          <button
            type="button"
            onClick={handleBell}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-home-muted transition-colors hover:bg-home-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Notificações"
          >
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
            )}
          </button>

        </div>
      </div>
    </header>
  );
}
