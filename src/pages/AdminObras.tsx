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
import { ProgressBarWithMarkers } from '@/components/ProgressBarWithMarkers';
import { MedicaoMarco } from '@/hooks/useMedicoesFinanceiro';
import * as LoadingStates from '@/components/LoadingStates';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Edit, Search, Trash2, Ruler, Map, ClipboardList, BarChart3 } from 'lucide-react';
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
  const [obraMarcos, setObraMarcos] = useState<Record<string, MedicaoMarco[]>>({});
  const userRole = useUserRole();
  const navigate = useNavigate();

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
      
      // Buscar todos os dados de uma vez
      const [orcamentoData, aditivoData, medicaoData] = await Promise.all([
        // Buscar orcamento_items de todas as obras
        supabase
          .from('orcamento_items_hierarquia')
          .select('obra_id, valor_total, is_macro, origem')
          .in('obra_id', obraIds)
          .or('is_macro.is.null,is_macro.eq.false')
          .neq('origem', 'extracontratual'),
        
        // Buscar aditivo_sessions bloqueadas de todas as obras
        supabase
          .from('aditivo_sessions')
          .select('id, obra_id')
          .in('obra_id', obraIds)
          .eq('status', 'bloqueada'),
        
        // Buscar medicao_sessions de todas as obras
        supabase
          .from('medicao_sessions')
          .select('id, obra_id')
          .in('obra_id', obraIds)
      ]);

      // Buscar aditivo_items e medicao_items se houver sessões
      let aditivoItemsData = { data: [], error: null };
      let medicaoItemsData = { data: [], error: null };
      
      if (aditivoData.data && aditivoData.data.length > 0) {
        const aditivoSessionIds = aditivoData.data.map(s => s.id);
        aditivoItemsData = await supabase
          .from('aditivo_items')
          .select('aditivo_id, total')
          .in('aditivo_id', aditivoSessionIds);
      }
      
      if (medicaoData.data && medicaoData.data.length > 0) {
        const medicaoSessionIds = medicaoData.data.map(s => s.id);
        medicaoItemsData = await supabase
          .from('medicao_items')
          .select('medicao_id, total')
          .in('medicao_id', medicaoSessionIds);
      }

      // Processar dados para cada obra
      const valores: Record<string, number> = {};
      const progressos: Record<string, number> = {};
      const marcos: Record<string, MedicaoMarco[]> = {};
      
      for (const obra of sortedObras) {
        // Calcular valor da obra
        const obraOrcamento = orcamentoData.data?.filter(item => item.obra_id === obra.id) || [];
        
        if (obraOrcamento.length > 0) {
          const valorInicial = obraOrcamento.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
          
          // Buscar aditivos da obra
          const obraAditivoSessions = aditivoData.data?.filter(s => s.obra_id === obra.id) || [];
          const aditivoSessionIds = obraAditivoSessions.map(s => s.id);
          const obraAditivoItems = aditivoItemsData.data?.filter(item => 
            aditivoSessionIds.includes(item.aditivo_id)
          ) || [];
          const aditivos = obraAditivoItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
          
          valores[obra.id] = valorInicial + aditivos;
          
          // Calcular progresso e marcos
          const obraMedicaoSessions = (medicaoData.data?.filter(s => s.obra_id === obra.id) || [])
            .sort((a: any, b: any) => a.sequencia - b.sequencia);
          const medicaoSessionIds = obraMedicaoSessions.map((s: any) => s.id);
          const obraMedicaoItems = medicaoItemsData.data?.filter((item: any) => 
            medicaoSessionIds.includes(item.medicao_id)
          ) || [];
          const valorAcumulado = obraMedicaoItems.reduce((sum, item: any) => sum + Number(item.total || 0), 0);
          
          progressos[obra.id] = valores[obra.id] > 0 ? (valorAcumulado / valores[obra.id]) * 100 : 0;
          
          // Calcular marcos para cada sessão de medição
          const valorPorSessao: Record<string, number> = {};
          obraMedicaoItems.forEach((item: any) => {
            valorPorSessao[item.medicao_id] = (valorPorSessao[item.medicao_id] || 0) + Number(item.total || 0);
          });
          
          let acumuladoMarco = 0;
          const obraMarcos: MedicaoMarco[] = [];
          for (const session of obraMedicaoSessions) {
            const valorMedicao = valorPorSessao[(session as any).id] || 0;
            acumuladoMarco += valorMedicao;
            obraMarcos.push({
              sequencia: (session as any).sequencia,
              valorAcumulado: acumuladoMarco,
              valorMedicao: valorMedicao,
              percentualAcumulado: valores[obra.id] > 0 ? (acumuladoMarco / valores[obra.id]) * 100 : 0
            });
          }
          marcos[obra.id] = obraMarcos;
        } else {
          // Não tem planilha: usar valores da obra
          valores[obra.id] = Number(obra.valor_total || 0) + Number(obra.valor_aditivado || 0);
          progressos[obra.id] = valores[obra.id] > 0 
            ? (Number(obra.valor_executado || 0) / valores[obra.id]) * 100 
            : 0;
        }
      }
      
      setObraValores(valores);
      setObraProgressos(progressos);
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
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={obraProgressos[obra.id] !== undefined ? obraProgressos[obra.id] : 0} 
                            className="w-[100px]"
                          />
                          <span className="text-sm font-medium whitespace-nowrap">
                            {obraProgressos[obra.id] !== undefined 
                              ? `${obraProgressos[obra.id].toFixed(1)}%` 
                              : '-'}
                          </span>
                        </div>
                        {obraMarcos[obra.id] && obraMarcos[obra.id].length > 0 && (
                          <ProgressBarWithMarkers
                            value={obraProgressos[obra.id] !== undefined ? obraProgressos[obra.id] : 0}
                            marcos={obraMarcos[obra.id]}
                            className="w-[100px]"
                          />
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
          <strong>Informação:</strong> Você tem permissão de visualização
          {userRole.isContratada && ' das obras atribuídas a você'}. 
          Para criar, editar ou excluir obras, é necessário ter permissão de Editor ou Administrador.
        </div>
      </PermissionGuard>
    </div>
  );
}
