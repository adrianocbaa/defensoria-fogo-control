import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Play, CheckCircle } from 'lucide-react';
import { seedTestComparables, createTestProject } from '@/utils/testData';
import { toast } from '@/hooks/use-toast';

export function TestDataSeeder() {
  const [loading, setLoading] = React.useState(false);
  const [created, setCreated] = React.useState(false);

  const seedData = async () => {
    setLoading(true);
    try {
      // Create test comparables
      const comparableResults = await seedTestComparables();
      
      // Create test project
      const projectId = await createTestProject();
      
      setCreated(true);
      toast({
        title: 'Dados de teste criados!',
        description: `${comparableResults.success} comparáveis e 1 projeto criados com sucesso`,
      });
      
      // Auto-refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar dados de teste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Dados de Teste - Sprint 5a
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Para testar a funcionalidade OLS, precisamos criar:
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">12 Comparáveis urbanos</span>
            <Badge variant="outline">target=price_unit</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Features: land_area, built_area, age, quality</span>
            <Badge variant="outline">VIF validation</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">1 Projeto de teste</span>
            <Badge variant="outline">OLS ready</Badge>
          </div>
        </div>

        {!created ? (
          <Button 
            onClick={seedData} 
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {loading ? 'Criando dados...' : 'Criar Dados de Teste'}
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Dados criados! Redirecionando...</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>Teste planejado:</strong><br/>
          • Variables: land_area, built_area, age, quality_dummy<br/>
          • Validação VIF &lt; 10<br/>
          • Gráficos e Storage URLs<br/>
          • Elasticidades e coerência
        </div>
      </CardContent>
    </Card>
  );
}