import { Link } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { FiscalSubstitutosManager } from '@/components/FiscalSubstitutosManager';
import { useFiscalObras } from '@/hooks/useFiscalObras';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Building2, MapPin, ArrowLeft } from 'lucide-react';

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  paralisada: 'Paralisada',
};

const statusColors: Record<string, string> = {
  planejamento: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida: 'bg-green-100 text-green-800',
  paralisada: 'bg-red-100 text-red-800',
};

export default function GerenciarObras() {
  const { obras, loading, error } = useFiscalObras();

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Gerenciar Obras"
          subtitle="Gerencie os fiscais substitutos das obras sob sua responsabilidade"
          actions={
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
          }
        />

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {obras.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma obra encontrada</h3>
              <p className="text-muted-foreground">
                Você não é fiscal (titular ou substituto) de nenhuma obra ativa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {obras.map(obra => (
              <AccordionItem
                key={obra.id}
                value={obra.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-4 text-left">
                    <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{obra.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{obra.municipio}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={obra.role === 'titular' ? 'default' : 'secondary'}
                        className={obra.role === 'titular' ? 'bg-primary' : ''}
                      >
                        {obra.role === 'titular' ? 'Titular' : 'Substituto'}
                      </Badge>
                      <Badge className={statusColors[obra.status] || 'bg-gray-100 text-gray-800'}>
                        {statusLabels[obra.status] || obra.status}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <FiscalSubstitutosManager 
                    obraId={obra.id} 
                    obraNome={obra.nome} 
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </SimpleHeader>
  );
}
