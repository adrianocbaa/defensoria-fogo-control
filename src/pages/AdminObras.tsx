import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PageHeader } from '@/components/PageHeader';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as LoadingStates from '@/components/LoadingStates';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Edit, Search, Trash2, Ruler, Map, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useRdoProgressByObra } from '@/hooks/useRdoProgressByObra';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  status: string;
  tipo: string;
  valor_total: number;
  valor_aditivado?: number;
  porcentagem_execucao: number;
  created_at: string;
  previsao_termino?: string;
}

const statusColors: Record<string, string> = {
  planejamento: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida: 'bg-green-100 text-green-800',
  paralisada: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  paralisada: 'Paralisada',
};

export function AdminObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [filteredObras, setFilteredObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const { canEdit } = useUserRole();
  const navigate = useNavigate();
  const [execPercents, setExecPercents] = useState<Record<string, number>>({});
  const [contractTotals, setContractTotals] = useState<Record<string, number>>({});

  const fetchObras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('obras')
        .select('*');

      if (error) throw error;
      
      // Calcular porcentagem de execução corretamente
      const obrasWithCalculatedExecution = (data || []).map(obra => {
        const valorFinal = Number(obra.valor_total) + Number(obra.valor_aditivado || 0);
        const valorPago = Number(obra.valor_executado || 0);
        const porcentagemExecucao = valorFinal > 0 ? (valorPago / valorFinal) * 100 : 0;
        
        return {
          ...obra,
          porcentagem_execucao: Number(porcentagemExecucao.toFixed(2))
        };
      });
      
      // Ordenar obras
      const sortedObras = sortObras(obrasWithCalculatedExecution);
      
      setObras(sortedObras);
      setFilteredObras(sortedObras);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      toast.error('Erro ao carregar obras');
      // Em caso de erro, exibir array vazio
      setObras([]);
      setFilteredObras([]);
    } finally {
      setLoading(false);
    }
  };

  // Função de ordenação customizada
  const sortObras = (obrasList: Obra[]) => {
    const statusOrder = { em_andamento: 1, paralisada: 2, concluida: 3, planejamento: 4 };
    
    return [...obrasList].sort((a, b) => {
      // Primeiro ordena por status
      const statusA = statusOrder[a.status as keyof typeof statusOrder] || 99;
      const statusB = statusOrder[b.status as keyof typeof statusOrder] || 99;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // Depois ordena por data de término (mais próximas primeiro)
      const dateA = a.previsao_termino ? new Date(a.previsao_termino).getTime() : Infinity;
      const dateB = b.previsao_termino ? new Date(b.previsao_termino).getTime() : Infinity;
      
      return dateA - dateB;
    });
  };

  useEffect(() => {
    fetchObras();
  }, []);

  useEffect(() => {
    let filtered = obras;
    
    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(obra =>
        obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(obra => obra.status === statusFilter);
    }
    
    setFilteredObras(filtered);
  }, [searchTerm, statusFilter, obras]);

  // Sincroniza Execução e Total do Contrato com o Sistema de Medição (localStorage)
  useEffect(() => {
    const pctMap: Record<string, number> = {};
    const totalMap: Record<string, number> = {};
    try {
      obras.forEach((o) => {
        const raw = localStorage.getItem(`resumo_financeiro_${o.id}`);
        if (raw) {
          const data = JSON.parse(raw);
          // Usar Valor Contrato Pós Aditivo (valor inicial + aditivos)
          const valorContratoPosAditivo = Number(data?.totalContrato) || 0;
          const valorAcumulado = Number(data?.valorAcumulado) || 0;
          // Cálculo: Valor Acumulado / Valor Contrato Pós Aditivo * 100
          const pct = valorContratoPosAditivo > 0 ? (valorAcumulado / valorContratoPosAditivo) * 100 : 0;
          pctMap[o.id] = pct;
          if (valorContratoPosAditivo > 0) totalMap[o.id] = valorContratoPosAditivo;
        }
      });
    } catch {}
    setExecPercents(pctMap);
    setContractTotals(totalMap);
  }, [obras]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      if (!detail?.obraId) return;
      const valorContratoPosAditivo = Number(detail?.totalContrato) || 0;
      const valorAcumulado = Number(detail?.valorAcumulado) || 0;
      // Cálculo: Valor Acumulado / Valor Contrato Pós Aditivo * 100
      const pct = valorContratoPosAditivo > 0 ? (valorAcumulado / valorContratoPosAditivo) * 100 : 0;
      setExecPercents((prev) => ({ ...prev, [detail.obraId]: pct }));
      if (valorContratoPosAditivo > 0) setContractTotals((prev) => ({ ...prev, [detail.obraId]: valorContratoPosAditivo }));
    };
    window.addEventListener('medicaoAtualizada', handler as EventListener);
    return () => window.removeEventListener('medicaoAtualizada', handler as EventListener);
  }, []);

  const getFormattedTotalContrato = (o: Obra): string => {
    const fromMedicao = contractTotals[o.id];
    const fallback = Number(o.valor_total || 0) + Number((o as any).valor_aditivado || 0);
    const total = typeof fromMedicao === 'number' ? fromMedicao : fallback;
    return formatCurrency(total);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a obra "${nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Obra excluída com sucesso!');
      fetchObras();
    } catch (error) {
      console.error('Erro ao excluir obra:', error);
      toast.error('Erro ao excluir obra');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return <LoadingStates.TableSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gerenciar Obras"
        subtitle="Visualize e gerencie todas as obras públicas"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/obras">
                <Map className="h-4 w-4 mr-2" />
                Mapa de Obras
              </Link>
            </Button>
            <PermissionGuard requiresEdit showMessage={false}>
              <Button asChild>
                <Link to="/admin/obras/nova">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Obra
                </Link>
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Obras</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar por nome, município ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'em_andamento' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('em_andamento')}
                >
                  Em Andamento
                </Button>
                <Button
                  variant={statusFilter === 'paralisada' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('paralisada')}
                >
                  Paralisado
                </Button>
                <Button
                  variant={statusFilter === 'concluida' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('concluida')}
                >
                  Concluído
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredObras.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma obra encontrada com os critérios de busca.' : 'Nenhuma obra cadastrada ainda.'}
              </p>
              <PermissionGuard requiresEdit showMessage={false}>
                <Button asChild className="mt-4">
                  <Link to="/admin/obras/nova">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar primeira obra
                  </Link>
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="min-w-[250px]">Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObras.map((obra) => (
                  <TableRow key={obra.id}>
                    <TableCell className="font-medium">{obra.nome}</TableCell>
                    <TableCell>{obra.municipio}</TableCell>
                    <TableCell>{obra.tipo}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[obra.status]}>
                        {statusLabels[obra.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{getFormattedTotalContrato(obra)}</TableCell>
                    <TableCell>
                      <ProgressCell obraId={obra.id} execPercents={execPercents} obra={obra} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/obras`)}
                          title="Visualizar no mapa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/medicao/${obra.id}`)}
                          title="Medição"
                        >
                          <Ruler className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/obras/${obra.id}/rdo/resumo`)}
                          title="RDO - Relatório Diário de Obra"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        
                        <PermissionGuard requiresEdit showMessage={false}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/obras/${obra.id}/editar`)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(obra.id, obra.nome)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PermissionGuard requiresEdit={false}>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
          <strong>Informação:</strong> Você tem permissão apenas para visualização. 
          Para criar, editar ou excluir obras, é necessário ter permissão de Editor ou Administrador.
        </div>
      </PermissionGuard>
    </div>
  );
}

// Componente separado para renderizar as duas barras de progresso
function ProgressCell({ obraId, execPercents, obra }: { obraId: string; execPercents: Record<string, number>; obra: any }) {
  const { data: rdoProgress = 0 } = useRdoProgressByObra(obraId);
  
  // Valor Pago (Medições)
  const valorPagoPercent = execPercents[obraId] ?? Number(obra.porcentagem_execucao || 0);
  
  return (
    <div className="space-y-3">
      {/* Andamento da Obra (RDO) - Ocultar se 0% */}
      {rdoProgress > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Andamento da Obra:</span>
            <span className="font-medium">{rdoProgress.toFixed(2)}%</span>
          </div>
          <Progress value={Math.min(rdoProgress, 100)} className="h-2" />
        </div>
      )}
      
      {/* Valor Pago (Medições) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Valor Pago:</span>
          <span className="font-medium">{valorPagoPercent.toFixed(2)}%</span>
        </div>
        <Progress value={Math.min(valorPagoPercent, 100)} className="h-2" />
      </div>
    </div>
  );
}
