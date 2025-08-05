import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Wrench,
  Building2,
  Package,
  BarChart3,
  ArrowUpDown,
  FileText,
  Bell,
  Plus,
  ChevronDown,
  Settings,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const menuItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    path: '/dashboard',
  },
  {
    id: 'maintenance',
    title: 'Manutenção',
    icon: Wrench,
    path: '/maintenance',
  },
  {
    id: 'obras',
    title: 'Obras',
    icon: Building2,
    path: '/obras',
  },
  {
    id: 'inventory',
    title: 'Almoxarifado',
    icon: Package,
    subItems: [
      { id: 'dashboard', title: 'Dashboard', icon: BarChart3, path: '/inventory?section=dashboard' },
      { id: 'materials', title: 'Materiais', icon: Package, path: '/inventory?section=materials' },
      { id: 'movements', title: 'Movimentações', icon: ArrowUpDown, path: '/inventory?section=movements' },
      { id: 'reports', title: 'Relatórios', icon: FileText, path: '/inventory?section=reports' },
      { id: 'notifications', title: 'Notificações', icon: Bell, path: '/inventory?section=notifications' },
      { id: 'add-material', title: 'Novo Material', icon: Plus, path: '/inventory?section=add-material' },
    ],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [expandedItems, setExpandedItems] = useState<string[]>(['inventory']);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [basePath, query] = path.split('?');
      return location.pathname === basePath && location.search.includes(query.split('=')[1]);
    }
    return location.pathname === path;
  };

  const isParentActive = (subItems?: any[]) => {
    if (!subItems) return false;
    return subItems.some(item => isActive(item.path));
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <Sidebar className="border-r bg-slate-900 text-white">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-semibold text-white">Sistema</h2>
                <p className="text-xs text-slate-400">Gestão Integrada</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider px-4 py-2">
            PRINCIPAL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItems.includes(item.id);
                const itemIsActive = item.path ? isActive(item.path) : isParentActive(item.subItems);

                if (hasSubItems) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleExpanded(item.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`w-full justify-between hover:bg-slate-800 ${
                              itemIsActive ? 'bg-primary text-white' : 'text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent className="h-5 w-5" />
                              {!collapsed && <span>{item.title}</span>}
                            </div>
                            {!collapsed && (
                              <ChevronDown 
                                className={`h-4 w-4 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} 
                              />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!collapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems?.map((subItem) => {
                                const SubIcon = subItem.icon;
                                return (
                                  <SidebarMenuSubItem key={subItem.id}>
                                    <SidebarMenuSubButton
                                      onClick={() => handleNavigation(subItem.path)}
                                      className={`hover:bg-slate-800 ${
                                        isActive(subItem.path) ? 'bg-primary/20 text-primary' : 'text-slate-400'
                                      }`}
                                    >
                                      <SubIcon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => item.path && handleNavigation(item.path)}
                      className={`hover:bg-slate-800 ${
                        itemIsActive ? 'bg-primary text-white' : 'text-slate-300'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
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