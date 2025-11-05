import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileText, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MedicaoComAbas() {
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
                Opção 1: Sistema de Abas
              </CardTitle>
              <p className="text-muted-foreground">Protótipo - Organização por abas</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/medicao/273f6921-56e7-48fb-ace3-cc05c7e04de7')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs System */}
      <Tabs defaultValue="medicao" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="medicao" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Medição Atual
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Análise Financeira
          </TabsTrigger>
          <TabsTrigger value="gestao" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Gestão
          </TabsTrigger>
        </TabsList>

        {/* Aba: Medição Atual */}
        <TabsContent value="medicao" className="space-y-6">
          {/* Cards Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Valor Inicial</div>
                <div className="text-2xl font-bold">R$ 1.500.000,00</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Valor Acumulado</div>
                <div className="text-2xl font-bold text-cyan-600">R$ 850.000,00</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">% Execução</div>
                <div className="text-2xl font-bold text-green-600">56.7%</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Orçamentária - Sempre Visível */}
          <Card>
            <CardHeader>
              <CardTitle>Planilha Orçamentária - 3ª Medição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/50 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">Tabela Orçamentária Completa</p>
                  <p className="text-sm">Com todos os itens, quantidades e valores</p>
                  <p className="text-xs mt-2">✅ Foco total no trabalho de medição</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Análise Financeira */}
        <TabsContent value="analise" className="space-y-6">
          {/* Resumo do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-blue-50 min-h-[200px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">Análise Detalhada</p>
                  <p className="text-sm">Serviços acrescidos, suprimidos, valores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma e Gráficos */}
          <Card>
            <CardHeader>
              <CardTitle>Cronograma Físico-Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-green-50 min-h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">Gráficos e Análises</p>
                  <p className="text-sm">Previsto vs Executado, Por MACROs, etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Gestão */}
        <TabsContent value="gestao" className="space-y-6">
          {/* Medições */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Gerenciar Medições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="secondary" size="sm">🔒 1ª Medição</Button>
                <Button variant="secondary" size="sm">🔒 2ª Medição</Button>
                <Button variant="outline" size="sm">✏️ 3ª Medição</Button>
              </div>
              <Button className="w-full">+ Nova Medição</Button>
            </CardContent>
          </Card>

          {/* Aditivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gerenciar Aditivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm">ADITIVO 1 - Publicado</Button>
                <Button variant="outline" size="sm">ADITIVO 2 - Rascunho</Button>
              </div>
              <Button className="w-full">+ Novo Aditivo</Button>
            </CardContent>
          </Card>

          {/* Importações */}
          <Card>
            <CardHeader>
              <CardTitle>Ferramentas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">📥 Importar Planilha</Button>
              <Button variant="outline" className="w-full justify-start">📥 Importar do RDO</Button>
              <Button variant="outline" className="w-full justify-start">📥 Importar Cronograma</Button>
              <Button variant="outline" className="w-full justify-start">📤 Exportar XLS/PDF</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vantagens */}
      <Card className="mt-6 border-primary">
        <CardHeader>
          <CardTitle className="text-sm">✅ Vantagens desta abordagem</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• Separação clara entre trabalho (medição), análise e configuração</p>
          <p>• Foco total na tabela quando está na aba "Medição Atual"</p>
          <p>• Gráficos e análises em aba separada, sem poluir tela principal</p>
          <p>• Familiar para usuários (padrão em muitos sistemas)</p>
        </CardContent>
      </Card>
    </div>
  );
}
