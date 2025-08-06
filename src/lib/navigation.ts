import {
  Shield,
  Wrench,
  Wind,
  Construction,
  FolderKanban,
  Warehouse,
  LayoutDashboard,
  Map,
  List,
  Home
} from 'lucide-react'

//aqui vai os menus dos módulos
export interface SubmenuItem {
    title: string;
    patch: string;
    icon: React.ComponentType<any>;
    submenu?: SubmenuItem[];
}

//aqui vai os submenus internos dos módulos
export interface MenuItem {
    title: string;
    patch: string;
    icon: React.ComponentType<any>;
    submenu?: SubmenuItem[];
}

//aqui contruimos o menu
export const menu: MenuItem[] = [
    {
        title: "Início",
        patch: "/",
        icon: Home,
        submenu: [
            {
                title: "Visão Geral",
                patch: "/",
                icon: Home
            }
        ]
    }
]
