import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, FileSpreadsheet, Trash2, Eye, Edit, Users } from 'lucide-react';
import { useOrcamentos, useDeleteOrcamento } from '@/hooks/useOrcamentos';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  nao_iniciado: { label: 'Não iniciado', variant: 'secondary' },
  em_andamento: { label: 'Em andamento', variant: 'default' },
  concluido: { label: 'Concluído', variant: 'outline' },
  arquivado: { label: 'Arquivado', variant: 'destructive' },
};

export function OrcamentosList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: orcamentos, isLoading } = useOrcamentos();
  const deleteOrcamento = useDeleteOrcamento();
  
  const filteredOrcamentos = orcamentos?.filter(orc => 
    orc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    orc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    orc.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOrcamento.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!orcamentos || orcamentos.length === 0) {
    return (
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
          <Button className="gap-2" onClick={() => navigate('/orcamento/novo')}>
            <Plus className="h-4 w-4" />
            Criar Primeiro Orçamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2" onClick={() => navigate('/orcamento/novo')}>
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrcamentos.map((orc) => (
                <TableRow key={orc.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    <span className="text-primary font-medium">{orc.codigo}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{orc.nome}</div>
                    {orc.categoria && (
                      <div className="text-sm text-muted-foreground">{orc.categoria}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(orc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{orc.cliente || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(orc.valor_total)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusConfig[orc.status]?.variant || 'secondary'}>
                      {statusConfig[orc.status]?.label || orc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/orcamento/${orc.id}`)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/orcamento/${orc.id}/editar`)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(orc.id)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os itens do orçamento serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
