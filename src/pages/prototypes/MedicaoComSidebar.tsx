import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileText, ChevronRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export function MedicaoComSidebar() {
  const navigate = useNavigate();
  const [graficosAberto, setGraficosAberto] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <div className="border-b bg-card p-4">
        <div className="flex justify-between items-center max-w-[1800px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Opção 2: Sidebar + Área Principal
            </h1>
            <p className="text-muted-foreground text-sm">Protótipo - Sidebar lateral</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/medicao/273f6921-56e7-48fb-ace3-cc05c7e04de7')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      <div className="flex max-w-[1800px] mx-auto">
        {/* Sidebar Esquerda - Fixa */}
        <aside className="w-80 border-r bg-card p-4 space-y-4 h-[calc(100vh-80px)] overflow-y-auto sticky top-0">
          {/* Cards Resumo Compactos */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Resumo Financeiro</h3>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Valor Inicial</div>
                <div className="text-lg font-bold">R$ 1.5M</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Acumulado</div>
                <div className="text-lg font-bold text-cyan-600">R$ 850K</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">% Execução</div>
                <div className="text-lg font-bold text-green-600">56.7%</div>
              </CardContent>
            </Card>
          </div>

          {/* Seletor de Medições */}
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Medições
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                🔒 1ª Medição
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                🔒 2ª Medição
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start">
                ✏️ 3ª Medição (Ativa)
              </Button>
              <Button size="sm" className="w-full">+ Nova</Button>
            </CardContent>
          </Card>

          {/* Aditivos */}
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Aditivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                ADITIVO 1 ✓
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                ADITIVO 2 (Rascunho)
              </Button>
              <Button size="sm" className="w-full">+ Novo</Button>
            </CardContent>
          </Card>

          {/* Ferramentas */}
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-sm">Ferramentas</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                📥 Importar
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                📤 Exportar
              </Button>
            </CardContent>
          </Card>
        </aside>

        {/* Área Principal - Scrollável */}
        <main className="flex-1 p-6 space-y-4">
          {/* Seção Colapsável: Gráficos e Análises */}
          <Collapsible open={graficosAberto} onOpenChange={setGraficosAberto}>
            <Card className="border-2 border-dashed">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análises e Gráficos
                    </CardTitle>
                    <ChevronRight className={`h-5 w-5 transition-transform ${graficosAberto ? 'rotate-90' : ''}`} />
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {graficosAberto ? 'Clique para ocultar' : 'Clique para expandir análises detalhadas'}
                  </p>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50 min-h-[200px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p className="font-semibold">Resumo do Contrato</p>
                      <p className="text-sm">Análise detalhada de valores</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 bg-green-50 min-h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p className="font-semibold">Gráficos Comparativos</p>
                      <p className="text-sm">Previsto vs Executado</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Tabela Principal - Sempre Visível */}
          <Card>
            <CardHeader>
              <CardTitle>Planilha Orçamentária - 3ª Medição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-muted/50 min-h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-lg">Tabela Orçamentária Completa</p>
                  <p className="text-sm">Sempre visível e acessível</p>
                  <p className="text-sm mt-4">✅ Foco na área de trabalho</p>
                  <p className="text-sm">✅ Controles na sidebar</p>
                  <p className="text-sm">✅ Análises expandem quando necessário</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Vantagens */}
      <div className="max-w-[1800px] mx-auto p-6 pt-0">
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm">✅ Vantagens desta abordagem</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>• Tabela sempre visível - foco no trabalho</p>
            <p>• Controles rápidos na sidebar (medições, aditivos)</p>
            <p>• Gráficos colapsáveis - aparecem só quando necessário</p>
            <p>• Eficiente para telas grandes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
