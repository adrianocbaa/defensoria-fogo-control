import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Trash2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useCronogramaFinanceiro, CronogramaFinanceiro } from '@/hooks/useCronogramaFinanceiro';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CronogramaComparativo } from './CronogramaComparativo';

interface CronogramaViewProps {
  obraId: string;
  canEdit?: boolean;
}

export function CronogramaView({ obraId, canEdit = true }: CronogramaViewProps) {
  const [cronograma, setCronograma] = useState<CronogramaFinanceiro | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { fetchCronograma, deleteCronograma, loading } = useCronogramaFinanceiro();

  useEffect(() => {
    loadCronograma();
  }, [obraId]);

  const loadCronograma = async () => {
    const data = await fetchCronograma(obraId);
    setCronograma(data);
  };

  const handleDelete = async () => {
    if (!cronograma?.id) return;
    
    const success = await deleteCronograma(cronograma.id);
    if (success) {
      setCronograma(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calcularTotaisPorPeriodo = () => {
    if (!cronograma) return [];
    
    const periodosMap = new Map<number, { valor: number; percentual: number }>();
    
    cronograma.items.forEach(item => {
      item.periodos.forEach(periodo => {
        const current = periodosMap.get(periodo.periodo) || { valor: 0, percentual: 0 };
        periodosMap.set(periodo.periodo, {
          valor: current.valor + periodo.valor,
          percentual: current.percentual + periodo.percentual,
        });
      });
    });
    
    return Array.from(periodosMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([periodo, totais]) => ({
        periodo,
        ...totais,
      }));
  };

  const calcularValorTotal = () => {
    if (!cronograma) return 0;
    return cronograma.items.reduce((sum, item) => sum + item.total_etapa, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Carregando cronograma...</p>
        </CardContent>
      </Card>
    );
  }

  if (!cronograma) {
    return null;
  }

  const totaisPorPeriodo = calcularTotaisPorPeriodo();
  const valorTotal = calcularValorTotal();

  return (
    <>
      {/* Gráfico Comparativo Previsto x Executado */}
      <CronogramaComparativo obraId={obraId} cronograma={cronograma} />

      {/* Cronograma Financeiro (Collapsible) */}
      <Card className="mb-6">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Cronograma Financeiro
                  </CardTitle>
                  {isExpanded ? 
                    <ChevronUp className="h-5 w-5" /> : 
                    <ChevronDown className="h-5 w-5" />
                  }
                </div>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground mr-4">
                  Importado em: {new Date(cronograma.created_at!).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {canEdit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o cronograma financeiro? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="space-y-6">
        {/* Resumo do Cronograma */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Previsto</div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(valorTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Itens MACRO</div>
              <div className="text-2xl font-bold">{cronograma.items.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Períodos</div>
              <div className="text-2xl font-bold">{totaisPorPeriodo.length}</div>
            </CardContent>
          </Card>
        </div>


        {/* Tabela de Itens MACRO */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Cronograma Financeiro - Distribuição por Período
          </h3>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16 font-semibold">Item</TableHead>
                  <TableHead className="font-semibold min-w-[200px]">Descrição</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap">Total Por Etapa</TableHead>
                  {totaisPorPeriodo.map(item => (
                    <TableHead key={item.periodo} className="text-right whitespace-nowrap font-semibold">
                      {item.periodo} DIAS
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Items MACRO */}
                {cronograma.items.map((item) => (
                  <TableRow key={item.item_numero} className="bg-blue-50/50 dark:bg-blue-950/20">
                    <TableCell className="font-semibold">{item.item_numero}</TableCell>
                    <TableCell className="font-semibold">{item.descricao}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(item.total_etapa)}
                    </TableCell>
                    {totaisPorPeriodo.map(periodoItem => {
                      const periodoData = item.periodos.find(p => p.periodo === periodoItem.periodo);
                      return (
                        <TableCell key={periodoItem.periodo} className="text-right font-mono">
                          {periodoData ? formatCurrency(periodoData.valor) : '-'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                
                {/* Linha de Porcentagem */}
                <TableRow className="border-t-2">
                  <TableCell colSpan={2} className="font-semibold">Porcentagem</TableCell>
                  <TableCell></TableCell>
                  {totaisPorPeriodo.map(periodoItem => {
                    const percentual = (periodoItem.valor / valorTotal) * 100;
                    return (
                      <TableCell key={periodoItem.periodo} className="text-right font-mono font-semibold">
                        {percentual.toFixed(2)}%
                      </TableCell>
                    );
                  })}
                </TableRow>
                
                {/* Linha de Custo */}
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">Custo</TableCell>
                  <TableCell></TableCell>
                  {totaisPorPeriodo.map(periodoItem => (
                    <TableCell key={periodoItem.periodo} className="text-right font-mono">
                      {formatCurrency(periodoItem.valor)}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* Linha de Porcentagem Acumulado */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="font-semibold">Porcentagem Acumulado</TableCell>
                  <TableCell></TableCell>
                  {totaisPorPeriodo.map((periodoItem, index) => {
                    const acumulado = totaisPorPeriodo
                      .slice(0, index + 1)
                      .reduce((sum, p) => sum + p.valor, 0);
                    const percentualAcumulado = (acumulado / valorTotal) * 100;
                    return (
                      <TableCell key={periodoItem.periodo} className="text-right font-mono font-semibold">
                        {percentualAcumulado.toFixed(2)}%
                      </TableCell>
                    );
                  })}
                </TableRow>
                
                {/* Linha de Custo Acumulado */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="font-semibold">Custo Acumulado</TableCell>
                  <TableCell></TableCell>
                  {totaisPorPeriodo.map((periodoItem, index) => {
                    const acumulado = totaisPorPeriodo
                      .slice(0, index + 1)
                      .reduce((sum, p) => sum + p.valor, 0);
                    return (
                      <TableCell key={periodoItem.periodo} className="text-right font-mono font-semibold">
                        {formatCurrency(acumulado)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </>
  );
}
