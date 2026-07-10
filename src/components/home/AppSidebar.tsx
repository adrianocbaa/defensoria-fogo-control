import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useUserSectors } from '@/hooks/useUserSectors';
import { MODULES, SIDEBAR_GROUPS } from './modulesConfig';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logoSidif from '@/assets/logo-sidif.png';

interface AppSidebarProps {
  onNavigate?: () => void;
}

function SidebarItem({
  to,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-sidebar-active/70',
        active
          ? 'bg-home-sidebar-active text-home-sidebar-active-fg shadow-sm'
          : 'text-home-sidebar-fg/85 hover:bg-white/5 hover:text-home-sidebar-fg'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { sectors } = useUserSectors();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  const displayName =
    profile?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex h-full w-full flex-col bg-home-sidebar-bg text-home-sidebar-fg">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-home-sidebar-active">
          <img src={logoSidif} alt="" className="h-6 w-6 object-contain" />
        </div>
        <span className="text-lg font-bold tracking-tight">SiDIF</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          <SidebarItem
            to="/"
            icon={LayoutDashboard}
            label="Dashboard"
            active={isActive('/')}
            onClick={onNavigate}
          />
        </div>

        {SIDEBAR_GROUPS.map((group) => {
          const items = group.ids
            .map((id) => MODULES.find((m) => m.id === id))
            .filter((m): m is NonNullable<typeof m> => !!m && sectors.includes(m.id) && m.path !== '#');
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mt-6">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-home-sidebar-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {items.map((m) => (
                  <SidebarItem
                    key={m.id}
                    to={m.path}
                    icon={m.icon}
                    label={m.title}
                    active={isActive(m.path)}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-home-sidebar-border px-3 py-4">
        <div className="space-y-1">
          <SidebarItem
            to="/profile"
            icon={Settings}
            label="Configurações"
            active={isActive('/profile')}
            onClick={onNavigate}
          />
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              signOut();
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'text-home-sidebar-fg/85 hover:bg-white/5 hover:text-home-sidebar-fg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-sidebar-active/70'
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span>Sair</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-3">
          <Avatar className="h-9 w-9 border border-home-sidebar-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-home-sidebar-active text-home-sidebar-active-fg text-xs">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-home-sidebar-fg">
              {displayName}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
