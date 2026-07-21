import { cn } from '@/lib/utils';
import { ObrasSidebarMenuButton } from '@/components/obras/ObrasLayout';
import {
  BarChart3,
  AlertCircle,
  MapPin,
  Wrench,
  History,
  FileText,
  Settings,
  FileStack,
  Users,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface MaintenanceTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const MAINTENANCE_TABS: MaintenanceTab[] = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'tickets', label: 'Chamados', icon: AlertCircle },
  { id: 'travel', label: 'Viagens', icon: MapPin },
  { id: 'preventive', label: 'Preventivas', icon: Wrench },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'service-orders', label: 'Ordens de Serviço', icon: FileStack, disabled: true },
  { id: 'contracts', label: 'Contratos', icon: Users, disabled: true },
  { id: 'inventory', label: 'Inventário', icon: Package, disabled: true },
];

interface MaintenanceHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onOpenMenu: () => void;
}

export function MaintenanceHeader({
  activeSection,
  onSectionChange,
  onOpenMenu,
}: MaintenanceHeaderProps) {
  const active = MAINTENANCE_TABS.find((t) => t.id === activeSection) ?? MAINTENANCE_TABS[0];

  return (
    <div className="border-b border-home-border bg-home-surface">
      <div className="flex items-center gap-2 px-4 pt-4 md:px-8">
        <ObrasSidebarMenuButton onClick={onOpenMenu} />
        <nav className="flex items-center gap-1.5 text-xs text-home-muted">
          <span>SiDIF</span>
          <span>/</span>
          <span className="font-medium text-foreground">Manutenção</span>
          <span>/</span>
          <span>{active.label}</span>
        </nav>
      </div>
      <div className="px-4 pb-2 pt-2 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {active.label}
        </h1>
      </div>
      <TooltipProvider delayDuration={100}>
        <div className="px-4 md:px-8">
          <ul className="flex gap-1 overflow-x-auto pb-1">
            {MAINTENANCE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeSection;
              const btn = (
                <button
                  type="button"
                  onClick={() => !tab.disabled && onSectionChange(tab.id)}
                  disabled={tab.disabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-home-muted hover:text-foreground',
                    tab.disabled && 'cursor-not-allowed opacity-50 hover:text-home-muted',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.disabled && (
                    <Badge variant="outline" className="ml-1 h-5 border-dashed px-1.5 text-[10px] font-normal">
                      Em breve
                    </Badge>
                  )}
                </button>
              );
              if (tab.disabled) {
                return (
                  <li key={tab.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{btn}</span>
                      </TooltipTrigger>
                      <TooltipContent>Módulo em desenvolvimento.</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }
              return <li key={tab.id}>{btn}</li>;
            })}
          </ul>
        </div>
      </TooltipProvider>
    </div>
  );
}
