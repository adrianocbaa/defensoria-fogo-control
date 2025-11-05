import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { useCronogramaFinanceiro, CronogramaFinanceiro } from '@/hooks/useCronogramaFinanceiro';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CronogramaViewProps {
  obraId: string;
}

export function CronogramaView({ obraId }: CronogramaViewProps) {
  const [cronograma, setCronograma] = useState<CronogramaFinanceiro | null>(null);
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
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma Financeiro
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Importado em: {new Date(cronograma.created_at!).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </CardHeader>
      
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

        {/* Tabela de Distribuição por Período */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Distribuição por Período
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período (Dias)</TableHead>
                  <TableHead className="text-right">Valor Previsto</TableHead>
                  <TableHead className="text-right">Percentual</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totaisPorPeriodo.map((item, index) => {
                  const valorAcumulado = totaisPorPeriodo
                    .slice(0, index + 1)
                    .reduce((sum, p) => sum + p.valor, 0);
                  const percentualAcumulado = (valorAcumulado / valorTotal) * 100;
                  
                  return (
                    <TableRow key={item.periodo}>
                      <TableCell className="font-medium">{item.periodo} dias</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.percentual.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(valorAcumulado)} ({percentualAcumulado.toFixed(2)}%)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Tabela de Itens MACRO */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Itens MACRO do Cronograma
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronograma.items.map((item) => (
                  <TableRow key={item.item_numero}>
                    <TableCell className="font-medium">{item.item_numero}</TableCell>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.total_etapa)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {((item.total_etapa / valorTotal) * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Nota sobre comparações futuras */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">📊 Comparativos Previsto x Executado</p>
          <p className="text-xs text-muted-foreground">
            Em breve: Gráficos comparativos entre o cronograma previsto e os valores executados nas medições mensais.
            O sistema calculará automaticamente os desvios e permitirá análise de desempenho da obra.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
