import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileSpreadsheet, Download } from 'lucide-react';
import { useOrcamento } from '@/hooks/useOrcamentos';
import { useOrcamentoItens } from '@/hooks/useOrcamentoItens';
import { formatCurrency } from '@/lib/formatters';
import type { CurvaABCItem } from '@/types/orcamento';
import { cn } from '@/lib/utils';

export function CurvaABC() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: orcamento, isLoading: loadingOrcamento } = useOrcamento(id);
  const { data: itens, isLoading: loadingItens } = useOrcamentoItens(id);

  const curvaABC = useMemo((): CurvaABCItem[] => {
    if (!itens || !orcamento) return [];

    // Filter only leaf items (services/inputs with values)
    const leafItems = itens.filter(i => 
      i.tipo !== 'etapa' && i.quantidade > 0 && i.preco_unitario_base > 0
    );

    // Calculate totals
    const bdiGlobal = orcamento.bdi_percentual || 27.54;
    const itemsWithTotal = leafItems.map(item => {
      const bdi = item.bdi_personalizado ?? bdiGlobal;
      const valorTotal = item.quantidade * item.preco_unitario_base * (1 + bdi / 100);
      return {
        codigo: item.codigo || item.codigo_base || '-',
        descricao: item.descricao,
        unidade: item.unidade || '-',
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario_base * (1 + bdi / 100),
        valor_total: valorTotal,
        percentual: 0,
        percentual_acumulado: 0,
        classificacao: 'C' as const,
      };
    });

    // Sort by value descending
    itemsWithTotal.sort((a, b) => b.valor_total - a.valor_total);

    // Calculate percentages
    const total = itemsWithTotal.reduce((sum, item) => sum + item.valor_total, 0);
    let acumulado = 0;

    return itemsWithTotal.map(item => {
      const percentual = total > 0 ? (item.valor_total / total) * 100 : 0;
      acumulado += percentual;

      let classificacao: 'A' | 'B' | 'C' = 'C';
      if (acumulado <= 80) classificacao = 'A';
      else if (acumulado <= 95) classificacao = 'B';

      return {
        ...item,
        percentual,
        percentual_acumulado: acumulado,
        classificacao,
      };
    });
  }, [itens, orcamento]);

  const summary = useMemo(() => {
    const aItems = curvaABC.filter(i => i.classificacao === 'A');
    const bItems = curvaABC.filter(i => i.classificacao === 'B');
    const cItems = curvaABC.filter(i => i.classificacao === 'C');

    const aTotal = aItems.reduce((sum, i) => sum + i.valor_total, 0);
    const bTotal = bItems.reduce((sum, i) => sum + i.valor_total, 0);
    const cTotal = cItems.reduce((sum, i) => sum + i.valor_total, 0);
    const total = aTotal + bTotal + cTotal;

    return {
      a: { count: aItems.length, total: aTotal, percent: total > 0 ? (aTotal / total) * 100 : 0 },
      b: { count: bItems.length, total: bTotal, percent: total > 0 ? (bTotal / total) * 100 : 0 },
      c: { count: cItems.length, total: cTotal, percent: total > 0 ? (cTotal / total) * 100 : 0 },
      total,
    };
  }, [curvaABC]);

  if (loadingOrcamento || loadingItens) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!orcamento) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Orçamento não encontrado</p>
          <Button variant="link" onClick={() => navigate('/orcamento')}>
            Voltar para lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  const classConfig = {
    A: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Classe A (0-80%)' },
    B: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Classe B (80-95%)' },
    C: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Classe C (95-100%)' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/orcamento/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Curva ABC - Análise de Pareto</h1>
              <p className="text-muted-foreground">{orcamento.nome}</p>
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Classe A (0-80%)</div>
            <div className="text-2xl font-bold text-green-600">{summary.a.count} itens</div>
            <div className="text-sm">
              {formatCurrency(summary.a.total)} ({summary.a.percent.toFixed(1)}%)
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Classe B (80-95%)</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.b.count} itens</div>
            <div className="text-sm">
              {formatCurrency(summary.b.total)} ({summary.b.percent.toFixed(1)}%)
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Classe C (95-100%)</div>
            <div className="text-2xl font-bold text-red-600">{summary.c.count} itens</div>
            <div className="text-sm">
              {formatCurrency(summary.c.total)} ({summary.c.percent.toFixed(1)}%)
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold text-primary">{curvaABC.length} itens</div>
            <div className="text-sm">{formatCurrency(summary.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Itens ordenados por impacto no custo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">% Acum.</TableHead>
                <TableHead className="text-center">Classe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curvaABC.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    Nenhum item para análise. Adicione itens ao orçamento primeiro.
                  </TableCell>
                </TableRow>
              ) : (
                curvaABC.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell className="text-right">
                      {item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                    <TableCell className="text-right">{item.percentual.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{item.percentual_acumulado.toFixed(2)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("border", classConfig[item.classificacao].color)}>
                        {item.classificacao}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
