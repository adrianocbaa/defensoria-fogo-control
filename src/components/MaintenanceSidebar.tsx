import { useState } from 'react';
import { 
  LayoutDashboard, 
  AlertCircle, 
  AlertTriangle,
  MapPin, 
  FileText, 
  Users, 
  Package, 
  Calendar, 
  History, 
  BarChart3, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Visão Geral', icon: LayoutDashboard, id: 'overview' },
  { title: 'Chamados', icon: AlertCircle, id: 'tickets' },
  { title: 'Viagens', icon: MapPin, id: 'travel-planning' },
  { title: 'Contratos e ATAs', icon: Users, id: 'contracts' },
  { title: 'Inventário de Equipamentos', icon: Package, id: 'inventory' },
  { title: 'Manutenções Preventivas', icon: Calendar, id: 'preventive' },
  { title: 'Histórico de Atendimentos', icon: History, id: 'history' },
  { title: 'Relatórios', icon: BarChart3, id: 'reports' },
  { title: 'Configurações', icon: Settings, id: 'settings' },
];

interface MaintenanceSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function MaintenanceSidebar({ 
  activeSection = 'overview', 
  onSectionChange 
}: MaintenanceSidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection);

  const handleSectionClick = (sectionId: string) => {
    setCurrentSection(sectionId);
    onSectionChange?.(sectionId);
  };

  return (
    <Sidebar className="w-64 border-r bg-card h-[calc(100vh-120px)] sticky top-0">
      <SidebarContent>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Menu Principal</h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      onClick={() => handleSectionClick(item.id)}
                      className={cn(
                        "w-full justify-start text-left p-3 rounded-md transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}