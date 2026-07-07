import { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, MapPin, Package, ChevronRight, FileText, Users, Wrench, History, Settings, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { id: 'overview', title: 'Visão Geral', icon: BarChart3 },
  { id: 'tickets', title: 'Chamados', icon: AlertCircle },
  { id: 'travel', title: 'Viagens', icon: MapPin },
  { id: 'service-orders', title: 'Ordens de Serviço', icon: FileText },
  { id: 'contracts', title: 'Contratos e Fornecedores', icon: Users },
  { id: 'inventory', title: 'Inventário de Equipamentos', icon: Package },
  { id: 'preventive', title: 'Manutenções Preventivas', icon: Wrench },
  { id: 'history', title: 'Histórico de Atendimentos', icon: History },
  { id: 'reports', title: 'Relatórios', icon: BarChart3 },
  { id: 'settings', title: 'Configurações', icon: Settings },
  { id: 'test', title: 'Teste', icon: TestTube },
];

interface MaintenanceSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function MaintenanceSidebar({
  activeSection = 'overview',
  onSectionChange,
}: MaintenanceSidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection);

  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  const handleSectionClick = (sectionId: string) => {
    setCurrentSection(sectionId);
    onSectionChange?.(sectionId);
  };

  return (
    <nav className="flex h-full flex-col overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-foreground">Menu Principal</h2>
      </div>
      <ul className="flex flex-col gap-1 px-2 pb-4">
        {menuItems.map((item) => {
          const isActive = currentSection === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSectionClick(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md p-3 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.title}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
