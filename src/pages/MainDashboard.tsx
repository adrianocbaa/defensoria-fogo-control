import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { 
  Wrench, 
  HardHat, 
  Shield, 
  Wind, 
  FolderKanban,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Sector = 'manutencao' | 'obra' | 'preventivos' | 'ar_condicionado' | 'projetos' | 'almoxarifado';

interface SectorBlock {
  id: Sector | string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  bgColor: string;
}

const sectorBlocks: SectorBlock[] = [
  {
    id: 'preventivos',
    title: 'Preventivos',
    icon: Shield,
    path: '/preventivos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    id: 'manutencao',
    title: 'Manutenção',
    icon: Wrench,
    path: '/maintenance',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  },
  {
    id: 'ar_condicionado',
    title: 'Ar Condicionado',
    icon: Wind,
    path: '#',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
  },
  {
    id: 'obra',
    title: 'Obra',
    icon: HardHat,
    path: '/obras',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
  },
  {
    id: 'projetos',
    title: 'Projetos',
    icon: FolderKanban,
    path: '#',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
  },
  {
    id: 'almoxarifado',
    title: 'Almoxarifado',
    icon: Package,
    path: '/inventory',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
  }
];

export default function Dashboard() {
  const { user } = useAuth();
  const [userSectors, setUserSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSectors = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('sectors')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user sectors:', error);
          setUserSectors(['preventivos']); // Default fallback
        } else {
          setUserSectors(data?.sectors || ['preventivos']);
        }
      } catch (error) {
        console.error('Error:', error);
        setUserSectors(['preventivos']);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSectors();
  }, [user]);

  // Show all modules instead of filtering by user sectors for now
  const availableBlocks = sectorBlocks;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Módulos"
          subtitle="Selecione o módulo que deseja acessar"
        />

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableBlocks.map((block) => {
            const IconComponent = block.icon;
            const isClickable = block.path !== '#';
            
            if (isClickable) {
              return (
                <Link key={block.id} to={block.path} className="group">
                  <Card className={`h-40 transition-all duration-200 cursor-pointer ${block.bgColor}`}>
                    <CardContent className="flex flex-col items-center justify-center h-full p-6">
                      <div className={`${block.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                        <IconComponent className="h-12 w-12" />
                      </div>
                      <h3 className={`text-lg font-semibold ${block.color} text-center`}>
                        {block.title}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              );
            } else {
              return (
                <Card key={block.id} className={`h-40 transition-all duration-200 opacity-60 ${block.bgColor}`}>
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className={`${block.color} mb-4`}>
                      <IconComponent className="h-12 w-12" />
                    </div>
                    <h3 className={`text-lg font-semibold ${block.color} text-center`}>
                      {block.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">Em desenvolvimento</p>
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>

        {availableBlocks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum módulo disponível para seu perfil.
            </p>
          </div>
        )}
      </div>
    </SimpleHeader>
  );
}