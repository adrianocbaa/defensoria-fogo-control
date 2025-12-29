import { Card, CardContent } from '@/components/ui/card';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { useUserSectors } from '@/hooks/useUserSectors';
import { useAvailableSectors } from '@/hooks/useAvailableSectors';

interface SectorBlock {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  bgColor: string;
}

// Mapeamento de rotas para cada módulo
const sectorPaths: Record<string, string> = {
  'preventivos': '/preventivos',
  'manutencao': '/maintenance',
  'ar_condicionado': '#',
  'obra': '/obras',
  'projetos': '#',
  'almoxarifado': '/inventory',
  'nucleos': '/nucleos',
  'nucleos_central': '/nucleos-central',
  'orcamento': '/orcamento',
};

// Mapeamento de cores para cada módulo
const sectorColors: Record<string, { text: string; bg: string }> = {
  'preventivos': { text: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  'manutencao': { text: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  'ar_condicionado': { text: 'text-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
  'obra': { text: 'text-yellow-600', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' },
  'projetos': { text: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  'almoxarifado': { text: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100 border-green-200' },
  'nucleos': { text: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  'nucleos_central': { text: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  'orcamento': { text: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
};

export default function Dashboard() {
  const { sectors, loading } = useUserSectors();
  const { sectors: allSectors, loading: sectorsLoading } = useAvailableSectors();

  // Debug: Log para verificar os setores
  console.log('User sectors:', sectors);
  console.log('All available sectors:', allSectors);

  // Construir blocos de setores baseado nos setores do usuário
  const availableBlocks: SectorBlock[] = allSectors
    .filter(sector => {
      const hasAccess = sectors.includes(sector.id);
      console.log(`Sector ${sector.id} (${sector.label}): ${hasAccess ? 'ALLOWED' : 'BLOCKED'}`);
      return hasAccess;
    })
    .map(sector => ({
      id: sector.id,
      title: sector.label,
      icon: sector.icon,
      path: sectorPaths[sector.id] || '#',
      color: sectorColors[sector.id]?.text || 'text-gray-600',
      bgColor: sectorColors[sector.id]?.bg || 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    }));

  console.log('Available blocks:', availableBlocks);

  if (loading || sectorsLoading) {
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