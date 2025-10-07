import { Link, useLocation, useParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Menu,
  LayoutDashboard,
  Calendar,
  Users,
  Truck,
  Package,
  Cloud,
  Camera,
  AlertTriangle,
  Shield,
  Ruler,
  FileSignature,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const menuItems: MenuItem[] = [
  { id: 'resumo', label: 'Resumo', icon: LayoutDashboard, path: '/resumo' },
  { id: 'diario', label: 'Diário', icon: Calendar, path: '/diario' },
  { id: 'equipe', label: 'Equipe', icon: Users, path: '/equipe' },
  { id: 'equipamentos', label: 'Equipamentos', icon: Truck, path: '/equipamentos' },
  { id: 'materiais', label: 'Materiais', icon: Package, path: '/materiais' },
  { id: 'clima', label: 'Clima', icon: Cloud, path: '/clima' },
  { id: 'fotos', label: 'Fotos', icon: Camera, path: '/fotos' },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle, path: '/ocorrencias' },
  { id: 'seguranca', label: 'Segurança', icon: Shield, path: '/seguranca' },
  { id: 'medicoes', label: 'Medições', icon: Ruler, path: '/medicoes' },
  { id: 'assinaturas', label: 'Assinaturas', icon: FileSignature, path: '/assinaturas' },
  { id: 'config', label: 'Configurações', icon: Settings, path: '/config' }
];

export function RDOSidebar() {
  const location = useLocation();
  const { obraId } = useParams();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const MenuContent = () => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        const fullPath = `/obras/${obraId}/rdo${item.path}`;

        return (
          <Link
            key={item.id}
            to={fullPath}
            onClick={() => {
              if (isMobile) setIsOpen(false);
              localStorage.setItem(`rdo_last_section_${obraId}`, item.id);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "min-h-[44px]",
              active && "bg-primary/10 text-primary font-medium border-l-4 border-primary"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-primary")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50 lg:hidden min-h-[44px] min-w-[44px]"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Menu RDO</SheetTitle>
          </SheetHeader>
          <Separator />
          <ScrollArea className="h-[calc(100vh-80px)] px-4 py-4">
            <MenuContent />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden lg:block w-[260px] border-r bg-card/50 sticky top-0 h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-1">Menu RDO</h2>
        <p className="text-sm text-muted-foreground">Navegação rápida</p>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-100px)] px-4 py-4">
        <MenuContent />
      </ScrollArea>
    </aside>
  );
}
