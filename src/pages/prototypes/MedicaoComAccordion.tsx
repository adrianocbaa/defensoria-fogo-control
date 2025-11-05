import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileText, TrendingUp, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function MedicaoComAccordion() {
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
                Opção 3: Cards Colapsáveis (Accordion)
              </CardTitle>
              <p className="text-muted-foreground">Protótipo - Organização com acordeões</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/medicao/273f6921-56e7-48fb-ace3-cc05c7e04de7')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Accordion com seções colapsáveis */}
      <Accordion type="multiple" defaultValue={[]} className="space-y-4 mb-6">
        {/* Resumo Financeiro - Colapsável */}
        <AccordionItem value="resumo" className="border rounded-lg">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Calculator className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">📊 Resumo Financeiro</h3>
                  <p className="text-sm text-muted-foreground">Cards de valores e resumo do contrato</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Valor Inicial</div>
                      <div className="text-lg font-bold">R$ 1.5M</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Aditivo</div>
                      <div className="text-lg font-bold text-blue-600">R$ 200K</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Total Pós-Aditivo</div>
                      <div className="text-lg font-bold text-green-600">R$ 1.7M</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Executado</div>
                      <div className="text-lg font-bold text-orange-600">R$ 350K</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Acumulado</div>
                      <div className="text-lg font-bold text-cyan-600">R$ 850K</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumo do Contrato */}
                <div className="border rounded-lg p-4 bg-blue-50 min-h-[150px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="font-semibold">Resumo Detalhado do Contrato</p>
                    <p className="text-sm">Serviços acrescidos, suprimidos, percentuais</p>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Análise Temporal - Colapsável */}
        <AccordionItem value="analise" className="border rounded-lg">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">📈 Análise Temporal</h3>
                  <p className="text-sm text-muted-foreground">Cronograma e gráficos comparativos</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="border rounded-lg p-6 bg-green-50 min-h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">Cronograma Físico-Financeiro</p>
                    <p className="text-sm">Gráficos: Previsto vs Executado, Por MACROs</p>
                    <p className="text-sm">Seletor de medições, análise de desvios</p>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Gestão - Colapsável */}
        <AccordionItem value="gestao" className="border rounded-lg">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">⚙️ Gestão</h3>
                  <p className="text-sm text-muted-foreground">Medições, aditivos e ferramentas</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Medições */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Medições
                    </h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        🔒 1ª Medição
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        🔒 2ª Medição
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full justify-start">
                        ✏️ 3ª Medição
                      </Button>
                      <Button size="sm" className="w-full">+ Nova Medição</Button>
                    </div>
                  </div>

                  {/* Aditivos */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Aditivos
                    </h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        ADITIVO 1 ✓
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        ADITIVO 2 (Rascunho)
                      </Button>
                      <Button size="sm" className="w-full">+ Novo Aditivo</Button>
                    </div>
                  </div>
                </div>

                {/* Ferramentas */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-3">Ferramentas de Importação/Exportação</h4>
                  <div className="grid md:grid-cols-4 gap-2">
                    <Button variant="outline" size="sm">📥 Importar Planilha</Button>
                    <Button variant="outline" size="sm">📥 Importar RDO</Button>
                    <Button variant="outline" size="sm">📥 Importar Cronograma</Button>
                    <Button variant="outline" size="sm">📤 Exportar XLS/PDF</Button>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Tabela Principal - Sempre Visível */}
      <Card>
        <CardHeader>
          <CardTitle>Planilha Orçamentária - 3ª Medição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-8 bg-muted/50 min-h-[500px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="font-semibold text-lg">Tabela Orçamentária Completa</p>
              <p className="text-sm">Sempre visível abaixo dos cards colapsáveis</p>
              <p className="text-sm mt-4">✅ Foco na tabela</p>
              <p className="text-sm">✅ Análises colapsam quando não necessárias</p>
              <p className="text-sm">✅ Tudo em uma única página (sem navegação)</p>
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
          <p>• Tudo em uma única página, sem precisar navegar entre abas</p>
          <p>• Seções expandem/colapsam conforme necessidade</p>
          <p>• Tabela sempre visível abaixo (rolagem natural)</p>
          <p>• Simples e intuitivo - clique para expandir o que precisa</p>
        </CardContent>
      </Card>
    </div>
  );
}
