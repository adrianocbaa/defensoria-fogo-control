import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchItemExecutionDetails, ItemExecutionDetail } from '@/hooks/useItemExecutionDetails';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ItemExecutionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId: string;
  orcamentoItemId: string;
  itemDescricao: string;
  itemCode?: string;
  quantidadeContratada: number;
  unidade?: string;
}

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  preenchendo: { label: 'Preenchendo', variant: 'secondary' },
  concluido: { label: 'Concluído', variant: 'default' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  reprovado: { label: 'Reprovado', variant: 'destructive' },
};

export function ItemExecutionDetailsDialog({
  open,
  onOpenChange,
  obraId,
  orcamentoItemId,
  itemDescricao,
  itemCode,
  quantidadeContratada,
  unidade,
}: ItemExecutionDetailsDialogProps) {
  const [details, setDetails] = useState<ItemExecutionDetail[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchItemExecutionDetails(obraId, orcamentoItemId)
      .then(setDetails)
      .finally(() => setLoading(false));
  }, [open, obraId, orcamentoItemId]);

  const total = (details || []).reduce((acc, d) => acc + d.executado_dia, 0);
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhamento do saldo executado</DialogTitle>
          <DialogDescription>
            {itemCode ? <span className="font-mono mr-2">{itemCode}</span> : null}
            {itemDescricao}
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">
          Quantidade contratada: <strong>{fmt(quantidadeContratada)} {unidade || ''}</strong> ·
          {' '}Total executado: <strong>{fmt(total)} {unidade || ''}</strong>
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (details && details.length > 0) ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RDO Nº</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Quantidade lançada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.map((d) => {
                const s = statusLabel[d.status] || { label: d.status, variant: 'outline' as const };
                return (
                  <TableRow key={d.report_id}>
                    <TableCell>#{d.numero_seq ?? '—'}</TableCell>
                    <TableCell>
                      {d.data ? format(new Date(d.data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmt(d.executado_dia)} {unidade || ''}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum lançamento encontrado.
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Lançamentos em RDOs com status <strong>rascunho</strong> ou <strong>preenchendo</strong> também consomem saldo.
          Para liberar o item, conclua/aprove ou exclua esses RDOs.
        </p>
      </DialogContent>
    </Dialog>
  );
}
