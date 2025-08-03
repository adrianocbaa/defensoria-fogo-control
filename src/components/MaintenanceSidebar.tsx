import { useState } from 'react';
import { BarChart3, AlertCircle, AlertTriangle, MapPin, Package, ChevronRight } from 'lucide-react';
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
  { id: 'overview', title: 'Visão Geral', icon: BarChart3 },
  { id: 'tickets', title: 'Chamados', icon: AlertCircle },
  { id: 'alerts', title: 'Alertas', icon: AlertTriangle },
  { id: 'travel', title: 'Planejamento de Viagens', icon: MapPin },
  { id: 'inventory', title: 'Inventário de Equipamentos', icon: Package },
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