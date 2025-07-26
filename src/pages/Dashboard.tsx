import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleHeader } from '@/components/SimpleHeader';
import { 
  Wrench, 
  HardHat, 
  Shield, 
  Wind, 
  FolderKanban 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import das imagens dos módulos
import manutencaoIcon from '@/assets/manutencao-icon.jpg';
import obraIcon from '@/assets/obra-icon.jpg';
import arCondicionadoIcon from '@/assets/ar-condicionado-icon.jpg';
import projetosIcon from '@/assets/projetos-icon.jpg';

type Sector = 'manutencao' | 'obra' | 'preventivos' | 'ar_condicionado' | 'projetos';

interface SectorBlock {
  id: Sector;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  path: string;
  color: string;
  bgColor: string;
}

const sectorBlocks: SectorBlock[] = [
  {
    id: 'manutencao',
    title: 'Manutenção',
    icon: Wrench,
    image: manutencaoIcon,
    path: '/maintenance',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  },
  {
    id: 'obra',
    title: 'Obra',
    icon: HardHat,
    image: obraIcon,
    path: '/obras',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
  },
  {
    id: 'preventivos',
    title: 'Preventivos',
    icon: Shield,
    image: '/lovable-uploads/b54777fb-13d9-4afc-aeee-1bab8c2aef68.png',
    path: '/preventivos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    id: 'ar_condicionado',
    title: 'Ar Condicionado',
    icon: Wind,
    image: arCondicionadoIcon,
    path: '#',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
  },
  {
    id: 'projetos',
    title: 'Projetos',
    icon: FolderKanban,
    image: projetosIcon,
    path: '#',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
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

  const availableBlocks = sectorBlocks.filter(block => 
    userSectors.includes(block.id)
  );

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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Módulos</h1>
            <p className="text-muted-foreground mt-1">
              Selecione o módulo que deseja acessar
            </p>
          </div>
          <Link 
            to="/preventivos" 
            className="text-sm text-primary hover:underline"
          >
            Voltar para visualização clássica
          </Link>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableBlocks.map((block) => {
            const IconComponent = block.icon;
            const isClickable = block.path !== '#';
            
            if (isClickable) {
              return (
                <Link key={block.id} to={block.path} className="group">
                  <Card className={`h-48 transition-all duration-200 cursor-pointer overflow-hidden ${block.bgColor}`}>
                    <CardContent className="p-0 h-full flex flex-col">
                      <div className="h-32 overflow-hidden">
                        <img 
                          src={block.image} 
                          alt={`${block.title} icon`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className={`${block.color} mb-2`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <h3 className={`text-lg font-semibold ${block.color} text-center`}>
                          {block.title}
                        </h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            } else {
              return (
                <Card key={block.id} className={`h-48 transition-all duration-200 opacity-60 overflow-hidden ${block.bgColor}`}>
                  <CardContent className="p-0 h-full flex flex-col">
                    <div className="h-32 overflow-hidden">
                      <img 
                        src={block.image} 
                        alt={`${block.title} icon`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      <div className={`${block.color} mb-2`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <h3 className={`text-lg font-semibold ${block.color} text-center`}>
                        {block.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Em desenvolvimento</p>
                    </div>
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