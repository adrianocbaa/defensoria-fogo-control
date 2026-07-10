import { Bell, Menu, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  breadcrumb?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onOpenMenu?: () => void;
}

export function DashboardHeader({
  breadcrumb = 'Dashboard / Visão Geral',
  searchValue,
  onSearchChange,
  onOpenMenu,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-home-border bg-home-surface px-4 md:px-12">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <p className="hidden truncate text-[15px] text-home-muted md:block">
        {breadcrumb}
      </p>

      <div className="ml-auto flex flex-1 items-center justify-end gap-3 md:flex-none md:gap-5">
        <div className="relative w-full max-w-md md:w-[420px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-home-muted" />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar no sistema..."
            className="h-11 rounded-full border-home-border bg-home-bg pl-11 pr-5 text-[15px] focus-visible:ring-primary/40"
            aria-label="Pesquisar no sistema"
          />
        </div>

        <button
          type="button"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-home-muted transition-colors hover:bg-home-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Notificações"
        >
          <Bell className="h-[20px] w-[20px]" strokeWidth={1.75} />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-warning" />
        </button>
      </div>
    </header>

  );
}
