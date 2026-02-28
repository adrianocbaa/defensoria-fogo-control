import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PageHeader } from '@/components/PageHeader';
import { useUserRole } from '@/hooks/useUserRole';
import { useObraActionPermissions } from '@/hooks/useObraActionPermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressBarWithMarkers } from '@/components/ProgressBarWithMarkers';
import { calcularFinanceiroMedicao, MarcoCalculado } from '@/lib/medicaoCalculo';
import * as LoadingStates from '@/components/LoadingStates';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Edit, Search, Trash2, Ruler, ClipboardList, BarChart3, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  status: string;
  tipo: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado?: number;
  porcentagem_execucao: number;
  created_at: string;
  previsao_termino?: string;
  valor_calculado?: number;
  rdo_habilitado?: boolean;
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
  const [obraValores, setObraValores] = useState<Record<string, number>>({});
  const [obraProgressos, setObraProgressos] = useState<Record<string, number>>({});
  const [obraRdoProgressos, setObraRdoProgressos] = useState<Record<string, number | null>>({});
  const [obraMarcos, setObraMarcos] = useState<Record<string, MarcoCalculado[]>>({});
  const userRole = useUserRole();
  const navigate = useNavigate();

  // Pegar IDs das obras para verificar permissões
  const obraIds = useMemo(() => obras.map(o => o.id), [obras]);
  const { getPermission, loading: permissionsLoading } = useObraActionPermissions(obraIds);

  const fetchObras = async () => {
    try {
      setLoading(true);
      
      // Buscar obras baseado no perfil do usuário
      let query = supabase.from('obras').select('*');
      
      // Se for contratada, filtrar apenas obras com acesso
      if (userRole.isContratada && !userRole.canEdit) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setObras([]);
          setFilteredObras([]);
          setLoading(false);
          return;
        }
        
        const { data: accessData, error: accessError } = await supabase
          .from('user_obra_access')
          .select('obra_id')
          .eq('user_id', user.id);
        
        if (accessError) throw accessError;
        
        const obraIds = accessData?.map(a => a.obra_id) || [];
        if (obraIds.length === 0) {
          // Usuário não tem acesso a nenhuma obra
          setObras([]);
          setFilteredObras([]);
          setLoading(false);
          return;
        }
        
        query = query.in('id', obraIds);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Calcular porcentagem de execução baseada nos dados do banco
      const obrasWithCalculatedExecution = (data || []).map((obra: any) => {
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

      // Calcular valores e progressos em paralelo para TODAS as obras de uma vez
      const obraIds = sortedObras.map(o => o.id);
      
      // Buscar dados financeiros e progresso RDO via RPC em paralelo
      const [rdoProgressData, aditivoData, medicaoData, orcamentoFinanceiroData] = await Promise.all([
        // Calcular progresso RDO via função do banco (evita limite de 1000 linhas)
        supabase.rpc('get_rdo_progress_batch', { p_obra_ids: obraIds }),
        
        // Buscar aditivo_sessions bloqueadas de todas as obras
        supabase
          .from('aditivo_sessions')
          .select('id, obra_id')
          .in('obra_id', obraIds)
          .eq('status', 'bloqueada'),
        
        // Buscar medicao_sessions de todas as obras
        supabase
          .from('medicao_sessions')
          .select('id, obra_id, sequencia')
          .in('obra_id', obraIds),
        
        // Buscar orcamento_items para cálculo financeiro (com total_contrato e item para filtro de folha)
        supabase
          .from('orcamento_items')
          .select('obra_id, total_contrato, item')
          .in('obra_id', obraIds)
          .limit(10000)
      ]);

      // Buscar aditivo_items e medicao_items se houver sessões
      let aditivoItemsData: any = { data: [], error: null };
      let medicaoItemsData: any = { data: [], error: null };
      
      if (aditivoData.data && aditivoData.data.length > 0) {
        const aditivoSessionIds = aditivoData.data.map(s => s.id);
        aditivoItemsData = await supabase
          .from('aditivo_items')
          .select('aditivo_id, total, item_code, qtd')
          .in('aditivo_id', aditivoSessionIds);
      }
      
      if (medicaoData.data && medicaoData.data.length > 0) {
        const medicaoSessionIds = medicaoData.data.map(s => s.id);
        medicaoItemsData = await supabase
          .from('medicao_items')
          .select('medicao_id, total, item_code, pct')
          .in('medicao_id', medicaoSessionIds);
      }

      // Mapear progresso RDO retornado pelo banco
      const rdoProgressMap = new Map<string, number>();
      if (rdoProgressData.data) {
        (rdoProgressData.data as any[]).forEach((row: any) => {
          rdoProgressMap.set(row.obra_id, Number(row.progress));
        });
      }

      // Processar dados para cada obra
      const valores: Record<string, number> = {};
      const progressos: Record<string, number> = {};
      const rdoProgressos: Record<string, number | null> = {};
      const marcos: Record<string, MarcoCalculado[]> = {};
      
      for (const obra of sortedObras) {
        // Andamento da Obra (RDO) - calculado pelo banco via RPC
        const rdoProgress = rdoProgressMap.get(obra.id);
        rdoProgressos[obra.id] = rdoProgress !== undefined ? rdoProgress : null;
        
        // Calcular financeiro usando utilitário centralizado (mesma lógica de useMedicoesFinanceiro)
        const obraOrcamentoFinanceiro = orcamentoFinanceiroData.data?.filter((item: any) => item.obra_id === obra.id) || [];
        const obraAditivoSessions = aditivoData.data?.filter((s: any) => s.obra_id === obra.id) || [];
        const aditivoSessionIds = obraAditivoSessions.map((s: any) => s.id);
        const obraAditivoItems = aditivoItemsData.data?.filter((item: any) =>
          aditivoSessionIds.includes(item.aditivo_id)
        ) || [];
        const obraMedicaoSessions = (medicaoData.data?.filter((s: any) => s.obra_id === obra.id) || [])
          .sort((a: any, b: any) => a.sequencia - b.sequencia);
        const medicaoSessionIds = obraMedicaoSessions.map((s: any) => s.id);
        const obraMedicaoItems = medicaoItemsData.data?.filter((item: any) =>
          medicaoSessionIds.includes(item.medicao_id)
        ) || [];

        const resultado = calcularFinanceiroMedicao(
          obraOrcamentoFinanceiro,
          obraAditivoItems,
          obraMedicaoSessions,
          obraMedicaoItems,
          Number(obra.valor_total || 0),
          Number(obra.valor_aditivado || 0),
        );

        valores[obra.id] = resultado.totalContrato;
        progressos[obra.id] = resultado.percentualExecutado;
        marcos[obra.id] = resultado.marcos;
      }
      
      setObraValores(valores);
      setObraProgressos(progressos);
      setObraRdoProgressos(rdoProgressos);
      setObraMarcos(marcos);
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
    const statusOrder = { em_andamento: 1, planejamento: 2, paralisada: 3, concluida: 4 };
    
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
    <SimpleHeader>
      <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gerenciar Obras"
        subtitle="Visualize e gerencie todas as obras públicas"
        actions={
          <>
            {!userRole.isContratada && (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Estatísticas
                </Button>
              </Link>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/obras">
                <MapIcon className="h-4 w-4 mr-2" />
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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Progresso</TableHead>
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
                    <TableCell className="text-right font-medium">
                      {obraValores[obra.id] !== undefined
                        ? formatCurrency(obraValores[obra.id])
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 min-w-[160px]">
                        {/* Andamento da Obra (RDO) - só mostra se RDO habilitado e tiver dados */}
                        {obra.rdo_habilitado && obraRdoProgressos[obra.id] !== null && obraRdoProgressos[obra.id] !== undefined && (
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={obraRdoProgressos[obra.id] || 0} 
                              className="w-[100px] h-2"
                              color="blue"
                            />
                            <span className="text-sm font-medium whitespace-nowrap">
                              {obraRdoProgressos[obra.id]?.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {/* Valor Pago (Medição) com marcadores */}
                        {obraMarcos[obra.id] && obraMarcos[obra.id].length > 0 && (
                          <div className="flex items-center gap-2">
                            <ProgressBarWithMarkers
                              value={obraProgressos[obra.id] !== undefined ? obraProgressos[obra.id] : 0}
                              marcos={obraMarcos[obra.id]}
                              className="w-[100px]"
                              variant="subtle"
                              color="green"
                            />
                            <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                              {obraProgressos[obra.id] !== undefined 
                                ? `${obraProgressos[obra.id].toFixed(1)}%` 
                                : '-'}
                            </span>
                          </div>
                        )}
                        {/* Fallback: se não tiver nem RDO nem Medição, usar valor_executado */}
                        {(obraRdoProgressos[obra.id] === null || obraRdoProgressos[obra.id] === undefined) && 
                         (!obraMarcos[obra.id] || obraMarcos[obra.id].length === 0) && (
                          obraProgressos[obra.id] !== undefined && obraProgressos[obra.id] > 0 ? (
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={obraProgressos[obra.id]} 
                                className="w-[100px] h-2"
                              />
                              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                                {obraProgressos[obra.id].toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )
                        )}
                      </div>
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
                        {obra.rdo_habilitado !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/obras/${obra.id}/rdo/resumo`)}
                            title="RDO - Relatório Diário de Obra"
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Botão Editar - verifica permissão granular */}
                        {(() => {
                          const perm = getPermission(obra.id, obra.status);
                          return perm.canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/obras/${obra.id}/editar`)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : null;
                        })()}
                        
                        {/* Botão Excluir - verifica permissão granular */}
                        {(() => {
                          const perm = getPermission(obra.id, obra.status);
                          return perm.canDelete ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(obra.id, obra.nome)}
                              className="text-destructive hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null;
                        })()}
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
          <strong>Informação:</strong> Você tem permissão de visualização
          {userRole.isContratada && ' das obras atribuídas a você'}. 
          Para criar, editar ou excluir obras, é necessário ter permissão de Editor ou Administrador.
        </div>
      </PermissionGuard>
      </div>
    </SimpleHeader>
  );
}
