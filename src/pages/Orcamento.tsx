import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function Orcamento() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Orçamento"
          subtitle="Crie e gerencie orçamentos para obras"
        />

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar orçamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-emerald-100 p-4 mb-4">
              <FileSpreadsheet className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento cadastrado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Crie seu primeiro orçamento para começar. Os orçamentos seguem o mesmo formato 
              da planilha orçamentária e podem ser convertidos em obras posteriormente.
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Orçamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
