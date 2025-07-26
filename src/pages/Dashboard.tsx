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

// Import module images
import manutencaoImg from '@/assets/manutencao-module.jpg';
import obraImg from '@/assets/obra-module.jpg';
import preventivosImg from '@/assets/preventivos-module.jpg';
import arCondicionadoImg from '@/assets/ar-condicionado-module.jpg';
import projetosImg from '@/assets/projetos-module.jpg';

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
    image: manutencaoImg,
    path: '/maintenance',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  },
  {
    id: 'obra',
    title: 'Obra',
    icon: HardHat,
    image: obraImg,
    path: '/obras',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
  },
  {
    id: 'preventivos',
    title: 'Preventivos',
    icon: Shield,
    image: preventivosImg,
    path: '/preventivos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    id: 'ar_condicionado',
    title: 'Ar Condicionado',
    icon: Wind,
    image: arCondicionadoImg,
    path: '#',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
  },
  {
    id: 'projetos',
    title: 'Projetos',
    icon: FolderKanban,
    image: projetosImg,
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
                  <Card className="h-64 transition-all duration-200 cursor-pointer overflow-hidden">
                    <div 
                      className="relative h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-200"
                      style={{ backgroundImage: `url(${block.image})` }}
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-200" />
                      <CardContent className="relative flex flex-col items-center justify-center h-full p-6 text-white">
                        <div className="mb-4 group-hover:scale-110 transition-transform duration-200">
                          <IconComponent className="h-16 w-16 text-white drop-shadow-lg" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-white drop-shadow-lg">
                          {block.title}
                        </h3>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              );
            } else {
              return (
                <Card key={block.id} className="h-64 transition-all duration-200 opacity-60 overflow-hidden">
                  <div 
                    className="relative h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${block.image})` }}
                  >
                    <div className="absolute inset-0 bg-black/60" />
                    <CardContent className="relative flex flex-col items-center justify-center h-full p-6 text-white">
                      <div className="mb-4">
                        <IconComponent className="h-16 w-16 text-white drop-shadow-lg" />
                      </div>
                      <h3 className="text-xl font-bold text-center text-white drop-shadow-lg">
                        {block.title}
                      </h3>
                      <p className="text-sm text-white/80 mt-2 drop-shadow">Em desenvolvimento</p>
                    </CardContent>
                  </div>
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