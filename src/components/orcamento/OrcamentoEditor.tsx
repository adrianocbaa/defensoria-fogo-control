import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileSpreadsheet,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Package,
  Hammer,
  MoreHorizontal,
  Trash2,
  Edit,
  ArrowLeft,
  FileText,
  BarChart3,
} from 'lucide-react';
import { useOrcamento } from '@/hooks/useOrcamentos';
import { useOrcamentoItens, buildItemTree, useDeleteOrcamentoItem, useCreateOrcamentoItem } from '@/hooks/useOrcamentoItens';
import { formatCurrency } from '@/lib/formatters';
import type { OrcamentoItem } from '@/types/orcamento';
import { cn } from '@/lib/utils';
import { AddItemDialog } from './AddItemDialog';

const tipoConfig = {
  etapa: { icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
  servico: { icon: Hammer, color: 'text-orange-600', bg: 'bg-orange-50' },
  composicao: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  insumo: { icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
};

interface TreeRowProps {
  item: OrcamentoItem;
  level: number;
  orcamentoId: string;
  bdiGlobal: number;
}

function TreeRow({ item, level, orcamentoId, bdiGlobal }: TreeRowProps) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const deleteItem = useDeleteOrcamentoItem();
  const hasChildren = item.children && item.children.length > 0;
  const config = tipoConfig[item.tipo] || tipoConfig.insumo;
  const Icon = config.icon;

  const handleDelete = () => {
    deleteItem.mutate({ id: item.id, orcamentoId });
  };

  const calculatedTotal = useMemo(() => {
    if (hasChildren) {
      return item.children!.reduce((sum, child) => {
        const childBdi = child.bdi_personalizado ?? bdiGlobal;
        const childPreco = child.preco_unitario_base * (1 + childBdi / 100);
        return sum + child.quantidade * childPreco;
      }, 0);
    }
    const bdi = item.bdi_personalizado ?? bdiGlobal;
    const precoComBdi = item.preco_unitario_base * (1 + bdi / 100);
    return item.quantidade * precoComBdi;
  }, [item, hasChildren, bdiGlobal]);

  return (
    <>
      <TableRow className="hover:bg-muted/50 group">
        <TableCell className="w-8">
          {hasChildren ? (
            <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-muted rounded">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}
        </TableCell>
        <TableCell style={{ paddingLeft: `${level * 24 + 8}px` }}>
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <span className="font-medium">{item.item_numero}</span>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm">{item.codigo || item.codigo_base || '-'}</TableCell>
        <TableCell>{item.fonte || '-'}</TableCell>
        <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
        <TableCell>{item.unidade || '-'}</TableCell>
        <TableCell className="text-right">
          {item.tipo !== 'etapa' ? item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) : '-'}
        </TableCell>
        <TableCell className="text-right">
          {item.tipo !== 'etapa' ? formatCurrency(item.preco_unitario_base) : '-'}
        </TableCell>
        <TableCell className="text-right">
          {item.tipo !== 'etapa' ? formatCurrency(item.preco_unitario_com_bdi || item.preco_unitario_base * (1 + (item.bdi_personalizado ?? bdiGlobal) / 100)) : '-'}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(calculatedTotal)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {hasChildren && isOpen && (
        <>
          {item.children!.map((child) => (
            <TreeRow 
              key={child.id} 
              item={child} 
              level={level + 1} 
              orcamentoId={orcamentoId}
              bdiGlobal={bdiGlobal}
            />
          ))}
        </>
      )}
    </>
  );
}

export function OrcamentoEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addItemType, setAddItemType] = useState<'etapa' | 'composicao' | 'insumo' | null>(null);

  const { data: orcamento, isLoading: loadingOrcamento } = useOrcamento(id);
  const { data: itens, isLoading: loadingItens } = useOrcamentoItens(id);
  const createItem = useCreateOrcamentoItem();

  const treeItems = useMemo(() => {
    if (!itens) return [];
    return buildItemTree(itens);
  }, [itens]);

  const totals = useMemo(() => {
    if (!orcamento || !itens) return { semBdi: 0, bdi: 0, total: 0 };
    
    const bdiGlobal = orcamento.bdi_percentual || 27.54;
    let semBdi = 0;
    let total = 0;
    
    itens.filter(i => i.tipo !== 'etapa' && !i.parent_id).forEach(item => {
      const itemTotal = item.quantidade * item.preco_unitario_base;
      semBdi += itemTotal;
      const bdi = item.bdi_personalizado ?? bdiGlobal;
      total += item.quantidade * item.preco_unitario_base * (1 + bdi / 100);
    });
    
    return { semBdi, bdi: total - semBdi, total };
  }, [orcamento, itens]);

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

  const bdiGlobal = orcamento.bdi_percentual || 27.54;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orcamento')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Orçamento</h1>
                <Badge variant="secondary">{orcamento.status === 'nao_iniciado' ? 'Não iniciado' : orcamento.status}</Badge>
              </div>
              <p className="text-muted-foreground">{orcamento.nome}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/orcamento/${id}/curva-abc`)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Curva ABC
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Add Item Buttons & Summary */}
      <div className="flex items-stretch gap-4">
        <Card className="flex-1 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setAddItemType('etapa')}>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Layers className="h-12 w-12 text-blue-600 mb-2" />
            <span className="font-medium">Adicionar</span>
            <span className="text-lg font-semibold">Etapa</span>
          </CardContent>
        </Card>
        <Card className="flex-1 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setAddItemType('composicao')}>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-purple-600 mb-2" />
            <span className="font-medium">Adicionar</span>
            <span className="text-lg font-semibold">Composição</span>
          </CardContent>
        </Card>
        <Card className="flex-1 border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setAddItemType('insumo')}>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Hammer className="h-12 w-12 text-orange-600 mb-2" />
            <span className="font-medium">Adicionar</span>
            <span className="text-lg font-semibold">Insumo</span>
          </CardContent>
        </Card>

        <Card className="w-72">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Bancos</span>
              <span className="text-primary font-medium">
                {orcamento.bases_referencia?.length > 0 
                  ? (orcamento.bases_referencia as any[]).map((b: any) => `${b.nome} - ${b.versao}`).join(', ')
                  : 'Nenhuma base selecionada'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>BDI</span>
              <span className="text-primary font-medium">{bdiGlobal.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>ITEM</TableHead>
                <TableHead>CÓDIGO</TableHead>
                <TableHead>BASE</TableHead>
                <TableHead>DESCRIÇÃO</TableHead>
                <TableHead>UND</TableHead>
                <TableHead className="text-right">QUANT.</TableHead>
                <TableHead className="text-right">VALOR UNIT</TableHead>
                <TableHead className="text-right">VALOR COM BDI</TableHead>
                <TableHead className="text-right">TOTAL</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {treeItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    Nenhum item adicionado. Clique em "Adicionar Etapa" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                treeItems.map((item) => (
                  <TreeRow key={item.id} item={item} level={0} orcamentoId={id!} bdiGlobal={bdiGlobal} />
                ))
              )}
            </TableBody>
          </Table>

          {/* Totals Footer */}
          <div className="border-t p-4 space-y-2 bg-muted/30">
            <div className="flex justify-end gap-8">
              <div className="text-right">
                <span className="text-muted-foreground">Total sem BDI</span>
                <div className="font-medium">{formatCurrency(totals.semBdi)}</div>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total do BDI</span>
                <div className="font-medium">{formatCurrency(totals.bdi)}</div>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-lg">TOTAL</span>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={!!addItemType}
        onOpenChange={(open) => !open && setAddItemType(null)}
        tipo={addItemType || 'etapa'}
        orcamentoId={id!}
        existingItems={itens || []}
      />
    </div>
  );
}
