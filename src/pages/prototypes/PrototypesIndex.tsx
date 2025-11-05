import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Columns, LayoutGrid, ChevronsDownUp, Square, ArrowLeft } from 'lucide-react';

export function PrototypesIndex() {
  const navigate = useNavigate();

  const prototypes = [
    {
      id: 'abas',
      title: 'Opção 1: Sistema de Abas',
      description: 'Separação em 3 abas: Medição Atual, Análise Financeira e Gestão',
      icon: Columns,
      color: 'blue',
      pros: ['Separação clara de contextos', 'Foco na tarefa atual', 'Interface familiar'],
      path: '/prototypes/abas'
    },
    {
      id: 'sidebar',
      title: 'Opção 2: Sidebar + Área Principal',
      description: 'Sidebar lateral com controles, tabela sempre visível, gráficos colapsáveis',
      icon: LayoutGrid,
      color: 'green',
      pros: ['Tabela sempre visível', 'Controles rápidos', 'Eficiente para telas grandes'],
      path: '/prototypes/sidebar'
    },
    {
      id: 'accordion',
      title: 'Opção 3: Cards Colapsáveis',
      description: 'Seções expandem/colapsam, tabela sempre visível abaixo',
      icon: ChevronsDownUp,
      color: 'purple',
      pros: ['Tudo em uma página', 'Expandir o que precisa', 'Simples e intuitivo'],
      path: '/prototypes/accordion'
    },
    {
      id: 'modal',
      title: 'Opção 4: Modal para Análises',
      description: 'Tabela domina a tela, análises em modal separado',
      icon: Square,
      color: 'orange',
      pros: ['Máximo espaço para tabela', 'Interface limpa', 'Análises sob demanda'],
      path: '/prototypes/modal'
    }
  ];

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200'
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">Protótipos de Organização</CardTitle>
                <CardDescription className="text-base">
                  Visualize cada opção de layout para a página de medição. Clique em cada card para ver o protótipo interativo.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/medicao/273f6921-56e7-48fb-ace3-cc05c7e04de7')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à Medição
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Grid de Protótipos */}
        <div className="grid md:grid-cols-2 gap-6">
          {prototypes.map((prototype) => {
            const Icon = prototype.icon;
            return (
              <Card
                key={prototype.id}
                className={`bg-gradient-to-br ${colorClasses[prototype.color]} border-2 hover:shadow-lg transition-all cursor-pointer group`}
                onClick={() => navigate(prototype.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {prototype.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {prototype.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-semibold">Principais vantagens:</p>
                    {prototype.pros.map((pro, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full group-hover:scale-105 transition-transform">
                    Ver Protótipo Interativo
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informações Adicionais */}
        <Card className="mt-8 border-primary">
          <CardHeader>
            <CardTitle className="text-lg">ℹ️ Como usar os protótipos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Clique em cada card acima para ver o protótipo completo</p>
            <p>• Os protótipos são <strong>interativos</strong> - você pode expandir/colapsar seções, trocar abas, etc.</p>
            <p>• Observe como cada layout organiza: cards de resumo, gráficos, medições, aditivos e a tabela</p>
            <p>• Escolha a opção que melhor se adequa ao seu fluxo de trabalho</p>
            <p>• Use o botão "Voltar" em cada protótipo para retornar a esta página</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
