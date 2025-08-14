import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Building, BarChart3, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Projetos',
    description: 'Gerencie projetos de avaliação',
    icon: Calculator,
    path: '/avaliacao-imoveis/projects',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    title: 'Imóveis',
    description: 'Cadastro e gestão de imóveis',
    icon: Building,
    path: '/avaliacao-imoveis/properties',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  {
    title: 'Amostras de Mercado',
    description: 'Comparáveis e dados de mercado',
    icon: BarChart3,
    path: '/avaliacao-imoveis/market',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
  },
  {
    title: 'Relatórios',
    description: 'Laudos e documentação',
    icon: FileText,
    path: '/avaliacao-imoveis/reports',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  }
];

export function AppraisalDashboard() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Avaliação de Imóveis"
          subtitle="Sistema completo para avaliação e gestão de imóveis"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} to={module.path}>
                <Card className={`border-2 transition-all duration-200 ${module.bgColor}`}>
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 w-12 h-12 flex items-center justify-center">
                      <Icon className={`h-8 w-8 ${module.color}`} />
                    </div>
                    <CardTitle className={`text-lg ${module.color}`}>
                      {module.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pt-0">
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Projetos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Avaliação Residencial - Centro</p>
                    <p className="text-sm text-muted-foreground">Criado em 15/01/2024</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Em Andamento
                  </span>
                </div>
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3">Nenhum projeto encontrado</p>
                  <Button asChild>
                    <Link to="/avaliacao-imoveis/projects">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Projeto
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-muted-foreground">Projetos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-sm text-muted-foreground">Imóveis</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">0</p>
                  <p className="text-sm text-muted-foreground">Amostras</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">0</p>
                  <p className="text-sm text-muted-foreground">Relatórios</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleHeader>
  );
}

export default AppraisalDashboard;