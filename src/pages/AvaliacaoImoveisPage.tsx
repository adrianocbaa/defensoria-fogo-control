import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

export function AvaliacaoImoveisPage() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Avaliação de Imóveis"
          subtitle="Sistema de avaliação e gestão de imóveis"
        />

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Calculator className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">
              Avaliação de Imóveis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg text-muted-foreground mb-4">
              Este módulo está em desenvolvimento
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve você poderá acessar todas as funcionalidades para avaliação e gestão de imóveis.
            </p>
            <div className="mt-8 p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Funcionalidades planejadas:</h3>
              <ul className="text-left text-sm text-muted-foreground space-y-1">
                <li>• Cadastro e avaliação de imóveis</li>
                <li>• Relatórios de avaliação</li>
                <li>• Histórico de valores</li>
                <li>• Comparação de mercado</li>
                <li>• Documentação técnica</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}

export default AvaliacaoImoveisPage;