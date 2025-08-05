import {
  BarChart3,
  Package,
  ArrowUpDown,
  FileText,
  Bell,
  Plus,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const menuItems = [
  { id: 'dashboard', title: 'Dashboard', icon: BarChart3 },
  { id: 'materials', title: 'Materiais', icon: Package },
  { id: 'movements', title: 'Movimentações', icon: ArrowUpDown },
  { id: 'reports', title: 'Relatórios', icon: FileText },
  { id: 'notifications', title: 'Notificações', icon: Bell },
  { id: 'add-material', title: 'Novo Material', icon: Plus },
];

interface InventorySidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function InventorySidebar({ activeSection = 'dashboard', onSectionChange }: InventorySidebarProps) {
  const handleSectionClick = (sectionId: string) => {
    onSectionChange?.(sectionId);
  };

  return (
    <Sidebar className="border-r bg-card">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-3">
          <SidebarTrigger />
          <h2 className="ml-2 text-lg font-semibold">Almoxarifado</h2>
        </div>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleSectionClick(item.id)}
                        className={`w-full justify-start gap-2 ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}