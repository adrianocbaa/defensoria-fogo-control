import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Waves } from 'lucide-react';

export default function DimensionamentoCalhas() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Dimensionamento de Calhas"
          subtitle="Cálculo conforme NBR 10844 (ABNT)"
        />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-rose-600" />
              Em construção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estrutura do submódulo pronta. Aguardando os próximos passos para
              implementar as variáveis de entrada, fórmulas da NBR 10844, saídas
              (vazão de projeto, seção recomendada, condutores verticais) e o
              relatório PDF. O histórico dos cálculos já está preparado para ser
              salvo na tabela <code>dimensionamento_calhas</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
