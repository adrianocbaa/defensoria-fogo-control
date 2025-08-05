import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertCircle, AlertTriangle, MapPin, Package, ChevronRight, ChevronDown, FileText, Users, Wrench, History, Settings, TestTube, ArrowUpDown, Bell, Plus } from 'lucide-react';
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
  { id: 'travel', title: 'Viagens', icon: MapPin },
  { id: 'service-orders', title: 'Ordens de Serviço', icon: FileText },
  { id: 'contracts', title: 'Contratos e Fornecedores', icon: Users },
  { 
    id: 'inventory', 
    title: 'Almoxarifado', 
    icon: Package,
    submenus: [
      { id: 'inventory-dashboard', title: 'Dashboard', icon: BarChart3 },
      { id: 'inventory-materials', title: 'Materiais', icon: Package },
      { id: 'inventory-movements', title: 'Movimentações', icon: ArrowUpDown },
      { id: 'inventory-reports', title: 'Relatórios', icon: FileText },
      { id: 'inventory-notifications', title: 'Notificações', icon: Bell },
      { id: 'inventory-add-material', title: 'Novo Material', icon: Plus },
    ]
  },
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
  onSectionChange 
}: MaintenanceSidebarProps) {
  const [currentSection, setCurrentSection] = useState(activeSection);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleSectionClick = (sectionId: string, item: any) => {
    if (sectionId === 'inventory') {
      // Redirecionar para /inventory
      navigate('/inventory');
      return;
    }

    setCurrentSection(sectionId);
    onSectionChange?.(sectionId);

    // Toggle submenu expansion
    if (item.submenus) {
      setExpandedMenus(prev => 
        prev.includes(sectionId) 
          ? prev.filter(id => id !== sectionId)
          : [...prev, sectionId]
      );
    }
  };

  const handleSubmenuClick = (submenuId: string) => {
    // Redirecionar para /inventory com query parameter para o submenu
    navigate(`/inventory?section=${submenuId.replace('inventory-', '')}`);
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
                const isExpanded = expandedMenus.includes(item.id);
                
                return (
                  <div key={item.id}>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => handleSectionClick(item.id, item)}
                        className={cn(
                          "w-full justify-start text-left p-3 rounded-md transition-colors",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.submenus && (
                          isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        )}
                        {!item.submenus && isActive && <ChevronRight className="h-4 w-4" />}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {/* Submenus */}
                    {item.submenus && isExpanded && (
                      <div className="ml-6 mt-2 space-y-1">
                        {item.submenus.map((submenu: any) => (
                          <SidebarMenuItem key={submenu.id}>
                            <SidebarMenuButton
                              onClick={() => handleSubmenuClick(submenu.id)}
                              className="w-full justify-start text-left p-2 rounded-md transition-colors hover:bg-muted text-sm"
                            >
                              <submenu.icon className="mr-2 h-3 w-3" />
                              <span>{submenu.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}