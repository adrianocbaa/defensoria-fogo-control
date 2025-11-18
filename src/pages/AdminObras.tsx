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
  const userRole = useUserRole();
  const navigate = useNavigate();

  const calcularValorObra = async (obraId: string, obraData: any): Promise<number> => {
    try {
      // Verifica se existe planilha orçamentária (orcamento_items_hierarquia)
      const { data: orcamentoItems, error: orcError } = await supabase
        .from('orcamento_items_hierarquia')
        .select('obra_id, valor_total, is_macro, origem')
        .eq('obra_id', obraId)
        .or('is_macro.is.null,is_macro.eq.false')
        .neq('origem', 'extracontratual');

      if (orcError) throw orcError;

      if (orcamentoItems && orcamentoItems.length > 0) {
        // Tem planilha: calcular valor inicial + aditivos bloqueados
        const valorInicial = orcamentoItems.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);

        // Buscar aditivos bloqueados
        const { data: aditivoSessions, error: adtError } = await supabase
          .from('aditivo_sessions')
          .select('id')
          .eq('obra_id', obraId)
          .eq('status', 'bloqueada');

        if (adtError) throw adtError;

        let aditivos = 0;
        if (aditivoSessions && aditivoSessions.length > 0) {
          const sessionIds = aditivoSessions.map(s => s.id);
          const { data: aditivoItems, error: adtItemsError } = await supabase
            .from('aditivo_items')
            .select('total')
            .in('aditivo_id', sessionIds);

          if (adtItemsError) throw adtItemsError;

          aditivos = aditivoItems?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
        }

        return valorInicial + aditivos;
      } else {
        // Não tem planilha: usar valor_total + valor_aditivado da obra
        return Number(obraData.valor_total || 0) + Number(obraData.valor_aditivado || 0);
      }
    } catch (error) {
      console.error('Erro ao calcular valor da obra:', error);
      // Fallback: usar valores da obra
      return Number(obraData.valor_total || 0) + Number(obraData.valor_aditivado || 0);
    }
  };

  const calcularProgressoObra = async (obraId: string, obraData: any): Promise<number> => {
    try {
      // Verifica se existe planilha orçamentária
      const { data: orcamentoItems, error: orcError } = await supabase
        .from('orcamento_items_hierarquia')
        .select('obra_id, valor_total, is_macro, origem')
        .eq('obra_id', obraId)
        .or('is_macro.is.null,is_macro.eq.false')
        .neq('origem', 'extracontratual');

      if (orcError) throw orcError;

      if (orcamentoItems && orcamentoItems.length > 0) {
        // Tem planilha: calcular Valor Acumulado / Valor Contrato Pós Aditivo
        const valorInicial = orcamentoItems.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);

        // Buscar aditivos bloqueados
        const { data: aditivoSessions, error: adtError } = await supabase
          .from('aditivo_sessions')
          .select('id')
          .eq('obra_id', obraId)
          .eq('status', 'bloqueada');

        if (adtError) throw adtError;

        let aditivos = 0;
        if (aditivoSessions && aditivoSessions.length > 0) {
          const sessionIds = aditivoSessions.map(s => s.id);
          const { data: aditivoItems, error: adtItemsError } = await supabase
            .from('aditivo_items')
            .select('total')
            .in('aditivo_id', sessionIds);

          if (adtItemsError) throw adtItemsError;

          aditivos = aditivoItems?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
        }

        const valorContratoAditivo = valorInicial + aditivos;

        // Buscar Valor Acumulado (soma de total de medicao_items)
        // Primeiro buscar as sessões de medição da obra
        const { data: medicaoSessions, error: sessionsError } = await supabase
          .from('medicao_sessions')
          .select('id')
          .eq('obra_id', obraId);

        if (sessionsError) throw sessionsError;

        let valorAcumulado = 0;
        if (medicaoSessions && medicaoSessions.length > 0) {
          const sessionIds = medicaoSessions.map(s => s.id);
          const { data: medicaoItems, error: medicaoError } = await supabase
            .from('medicao_items')
            .select('total')
            .in('medicao_id', sessionIds);

          if (medicaoError) throw medicaoError;

          valorAcumulado = medicaoItems?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
        }

        return valorContratoAditivo > 0 ? (valorAcumulado / valorContratoAditivo) * 100 : 0;
      } else {
        // Não tem planilha: calcular Valor Executado / Valor Final
        const valorFinal = Number(obraData.valor_total || 0) + Number(obraData.valor_aditivado || 0);
        const valorExecutado = Number(obraData.valor_executado || 0);

        return valorFinal > 0 ? (valorExecutado / valorFinal) * 100 : 0;
      }
    } catch (error) {
      console.error('Erro ao calcular progresso da obra:', error);
      // Fallback: usar porcentagem_execucao da obra
      return Number(obraData.porcentagem_execucao || 0);
    }
  };

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

      // Calcular valores para cada obra
      const valores: Record<string, number> = {};
      const progressos: Record<string, number> = {};
      for (const obra of sortedObras) {
        valores[obra.id] = await calcularValorObra(obra.id, obra);
        progressos[obra.id] = await calcularProgressoObra(obra.id, obra);
      }
      setObraValores(valores);
      setObraProgressos(progressos);
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
