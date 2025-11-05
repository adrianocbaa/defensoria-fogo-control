import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileText, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function MedicaoComModal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6" />
                Opção 4: Modal para Análises
              </CardTitle>
              <p className="text-muted-foreground">Protótipo - Análises em modal/dialog</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/medicao/273f6921-56e7-48fb-ace3-cc05c7e04de7')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Barra Superior: Cards Compactos + Ações */}
      <div className="mb-6 space-y-4">
        {/* Cards Financeiros em Linha */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Valor Inicial</div>
              <div className="text-xl font-bold">R$ 1.5M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Aditivo</div>
              <div className="text-xl font-bold text-purple-700">R$ 200K</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Pós-Aditivo</div>
              <div className="text-xl font-bold text-green-700">R$ 1.7M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Executado</div>
              <div className="text-xl font-bold text-orange-700">R$ 350K</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Acumulado</div>
              <div className="text-xl font-bold text-cyan-700">R$ 850K</div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Ações Rápidas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Seleção de Medição */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Medição:</span>
                <Button variant="outline" size="sm">🔒 1ª</Button>
                <Button variant="outline" size="sm">🔒 2ª</Button>
                <Button variant="secondary" size="sm">✏️ 3ª Medição</Button>
                <Button size="sm">+ Nova</Button>
              </div>

              {/* Botão para Análises - Abre Modal */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
                    <BarChart3 className="h-4 w-4" />
                    📊 Ver Análises Completas
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análises Financeiras Detalhadas
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Resumo do Contrato */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Resumo do Contrato
                      </h3>
                      <div className="border rounded-lg p-6 bg-blue-50 min-h-[200px] flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <p className="font-semibold">Análise Detalhada</p>
                          <p className="text-sm">Serviços acrescidos, suprimidos, percentuais</p>
                        </div>
                      </div>
                    </div>

                    {/* Cronograma Comparativo */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Cronograma Físico-Financeiro
                      </h3>
                      <div className="border rounded-lg p-6 bg-green-50 min-h-[300px] flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold">Gráfico: Previsto vs Executado</p>
                          <p className="text-sm">Análise temporal por medição</p>
                        </div>
                      </div>
                    </div>

                    {/* Análise por MACROs */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Análise por MACROs
                      </h3>
                      <div className="border rounded-lg p-6 bg-purple-50 min-h-[300px] flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold">Execução por MACRO</p>
                          <p className="text-sm">Distribuição e progresso</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Aditivos */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Aditivos:</span>
                <Button variant="outline" size="sm">ADITIVO 1 ✓</Button>
                <Button variant="outline" size="sm">ADITIVO 2</Button>
                <Button size="sm">+ Novo</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal - Sempre Visível e Dominante */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Planilha Orçamentária - 3ª Medição</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">📥 Importar</Button>
              <Button variant="outline" size="sm">📤 Exportar</Button>
              <Button variant="outline" size="sm">+ Item</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-12 bg-muted/50 min-h-[600px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-20 w-20 mx-auto mb-6 opacity-50" />
              <p className="font-semibold text-2xl mb-2">Tabela Orçamentária Completa</p>
              <p className="text-base mb-6">Foco total na área de trabalho</p>
              
              <div className="space-y-3 text-sm max-w-md mx-auto">
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-left">✅ Tabela domina a tela - máximo espaço de trabalho</p>
                </div>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-left">✅ Cards compactos no topo - info sempre visível</p>
                </div>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-left">✅ Análises em modal - não poluem a tela</p>
                </div>
                <div className="flex items-center gap-2 bg-background p-3 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="text-left">✅ Ações rápidas sempre acessíveis</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vantagens */}
      <Card className="mt-6 border-primary">
        <CardHeader>
          <CardTitle className="text-sm">✅ Vantagens desta abordagem</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• Máximo espaço para a tabela (foco 100% no trabalho)</p>
          <p>• Gráficos e análises não ocupam espaço - apenas quando solicitados</p>
          <p>• Interface limpa e organizada</p>
          <p>• Cards informativos sempre visíveis no topo</p>
          <p>• Ideal para quem trabalha principalmente na planilha</p>
        </CardContent>
      </Card>
    </div>
  );
}
