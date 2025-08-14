import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CSVImporter from '@/components/appraisal/CSVImporter';
import { useState } from 'react';

export function MarketPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Amostras de Mercado"
          subtitle="Dados comparáveis para análise de mercado imobiliário"
        />

        <Tabs defaultValue="import" className="w-full">
          <TabsList>
            <TabsTrigger value="import">Importar CSV</TabsTrigger>
            <TabsTrigger value="list">Listagem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-6">
            <CSVImporter onSuccess={handleImportSuccess} />
          </TabsContent>
          
          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Amostras Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Use a aba "Importar CSV" para adicionar amostras de mercado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SimpleHeader>
  );
}

export default MarketPage;