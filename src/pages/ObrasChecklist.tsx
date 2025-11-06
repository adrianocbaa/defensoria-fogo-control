import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Calendar, Building2, Filter, TrendingUp, CalendarCheck, CalendarX } from 'lucide-react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useObras } from '@/hooks/useObras';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type Obra } from '@/data/mockObras';
import { formatDate } from '@/lib/formatters';

// Atividades padrão do checklist
const ATIVIDADES_PADRAO = [
  'Finalização de todos os serviços do contrato',
  'Instalação dos ares condicionados',
  'Instalação das persianas',
  'Instalação dos móveis',
  'Instalação de eletrodomésticos',
  'Instalação de placas de porta',
  'Instalação da placa de fachada',
  'Verificação da data de inauguração',
  'Instalação da internet',
  'Chegada dos computadores',
  'Instalação das câmeras'
];

interface ObraData {
  id: string;
  data_prevista_inauguracao?: string;
  status_inauguracao?: string;
}

interface ObraComChecklist extends Obra {
  diasRestantes: number;
  checklistProgress: number;
  data_prevista_inauguracao?: string;
  status_inauguracao?: string;
}

export default function ObrasChecklist() {
  const navigate = useNavigate();
  const { obras, loading } = useObras();
  const [obrasChecklist, setObrasChecklist] = useState<ObraComChecklist[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [filtroAnoInauguracao, setFiltroAnoInauguracao] = useState<string>('todos');
  const [filtroAnoInauguracaoDe, setFiltroAnoInauguracaoDe] = useState<string>('none');
  const [filtroAnoInauguracaoAte, setFiltroAnoInauguracaoAte] = useState<string>('none');

  // Calcula dias restantes ou dias passados desde o término
  const calcularDiasRestantes = (dataTermino: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const termino = new Date(dataTermino);
    termino.setHours(0, 0, 0, 0);
    const diffTime = termino.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Buscar obras em fase de checklist e seus respectivos checklists
  useEffect(() => {
    const fetchObrasChecklist = async () => {
      try {
        setLoadingChecklist(true);
        
        // Buscar todas as obras diretamente do Supabase com os campos necessários
        const { data: obrasData, error: obrasError } = await (supabase as any)
          .from('obras')
          .select('id, data_prevista_inauguracao, status_inauguracao');
        
        if (obrasError) {
          console.error('Erro ao buscar dados das obras:', obrasError);
        }

        // Criar mapa de dados adicionais das obras
        const obrasDataMap = new Map<string, ObraData>(
          (obrasData || []).map((o: ObraData) => [o.id, o])
        );

        // Buscar todas as obras que têm checklist criado
        const { data: obrasComChecklist, error: checklistError } = await (supabase as any)
          .from('obra_checklist_items')
          .select('obra_id');
        
        if (checklistError) {
          console.error('Erro ao buscar obras com checklist:', checklistError);
        }

        const obrasIdsComChecklist = new Set(
          (obrasComChecklist || []).map((item: any) => item.obra_id)
        );

        // Filtrar obras: 
        // 1. Obras inauguradas SÃO incluídas (para permitir filtro)
        // 2. Obras com checklist OU dentro do prazo (15 dias antes do término)
        // 3. Obras finalizadas (dias < 0) mas NÃO inauguradas
        const obrasEmChecklist = obras.filter(obra => {
          if (!obra.previsaoTermino) return false;
          
          const obraData = obrasDataMap.get(obra.id);
          
          // Se já foi inaugurada, incluir (o filtro vai decidir se mostra ou não)
          if (obraData?.status_inauguracao === 'inaugurada') {
            return true;
          }
          
          // Se já tem checklist, sempre mostrar
          if (obrasIdsComChecklist.has(obra.id)) {
            return true;
          }
          
          // Senão, verificar se está dentro dos 15 dias antes do término
          const diasRestantes = calcularDiasRestantes(obra.previsaoTermino);
          return diasRestantes <= 15;
        });

        // Para cada obra, buscar o checklist e calcular progresso
        const obrasComProgresso = await Promise.all(
          obrasEmChecklist.map(async (obra) => {
            const diasRestantes = calcularDiasRestantes(obra.previsaoTermino!);
            const obraData = obrasDataMap.get(obra.id);
            
            // Buscar itens do checklist
            const { data: checklistItems, error } = await (supabase as any)
              .from('obra_checklist_items')
              .select('*')
              .eq('obra_id', obra.id)
              .order('ordem', { ascending: true });

            if (error) {
              console.error('Erro ao buscar checklist:', error);
            }

            // Se não existir checklist E está dentro dos 15 dias antes, criar automaticamente
            if ((!checklistItems || checklistItems.length === 0) && diasRestantes <= 15) {
              await criarChecklistPadrao(obra.id);
              const { data: novoChecklist } = await (supabase as any)
                .from('obra_checklist_items')
                .select('*')
                .eq('obra_id', obra.id);
              
              return {
                ...obra,
                diasRestantes,
                checklistProgress: 0,
                data_prevista_inauguracao: obraData?.data_prevista_inauguracao,
                status_inauguracao: obraData?.status_inauguracao || 'aguardando'
              };
            }

            // Calcular progresso (excluindo itens "não se aplica")
            const itensAplicaveis = (checklistItems as any[])?.filter((item: any) => item.situacao !== 'nao_se_aplica') || [];
            const totalItens = itensAplicaveis.length;
            const concluidos = itensAplicaveis.filter((item: any) => item.situacao === 'concluido').length;
            const checklistProgress = totalItens > 0 ? (concluidos / totalItens) * 100 : 0;

            return {
              ...obra,
              diasRestantes,
              checklistProgress,
              data_prevista_inauguracao: obraData?.data_prevista_inauguracao,
              status_inauguracao: obraData?.status_inauguracao || 'aguardando'
            };
          })
        );

        setObrasChecklist(obrasComProgresso);
      } catch (error) {
        console.error('Erro ao buscar obras em checklist:', error);
        toast.error('Erro ao carregar obras em checklist');
      } finally {
        setLoadingChecklist(false);
      }
    };

    if (!loading && obras.length > 0) {
      fetchObrasChecklist();
    } else if (!loading) {
      setLoadingChecklist(false);
    }
  }, [obras, loading]);

  // Criar checklist padrão
  const criarChecklistPadrao = async (obraId: string) => {
    try {
      const itens = ATIVIDADES_PADRAO.map((atividade, index) => ({
        obra_id: obraId,
        descricao_atividade: atividade,
        situacao: 'nao_iniciado',
        ordem: index + 1,
        is_custom: false
      }));

      const { error } = await (supabase as any)
        .from('obra_checklist_items')
        .insert(itens);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar checklist padrão:', error);
    }
  };

  const getStatusColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return 'bg-blue-500'; // Obra já finalizada
    if (diasRestantes <= 5) return 'bg-red-500';
    if (diasRestantes <= 10) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'text-green-600';
    if (progress >= 50) return 'text-blue-600';
    if (progress >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  // Filtrar obras baseado nos filtros aplicados
  const obrasFiltradas = useMemo(() => {
    let resultado = [...obrasChecklist];

    // Filtro por status
    if (filtroStatus === 'inauguradas') {
      resultado = resultado.filter(o => o.status_inauguracao === 'inaugurada');
    } else if (filtroStatus === 'nao_inauguradas') {
      resultado = resultado.filter(o => o.status_inauguracao !== 'inaugurada');
    } else if (filtroStatus === 'com_data_inauguracao') {
      resultado = resultado.filter(o => o.data_prevista_inauguracao && o.data_prevista_inauguracao !== null && o.status_inauguracao !== 'inaugurada');
    } else if (filtroStatus === 'sem_data_inauguracao') {
      resultado = resultado.filter(o => (!o.data_prevista_inauguracao || o.data_prevista_inauguracao === null) && o.status_inauguracao !== 'inaugurada');
    } else if (filtroStatus === 'atrasadas') {
      resultado = resultado.filter(o => o.diasRestantes < 0 && o.status_inauguracao !== 'inaugurada');
    } else if (filtroStatus === 'todas') {
      // Por padrão, não mostrar obras inauguradas
      resultado = resultado.filter(o => o.status_inauguracao !== 'inaugurada');
    }

    // Filtro por ano de inauguração (único)
    if (filtroAnoInauguracao !== 'todos') {
      resultado = resultado.filter(o => {
        if (!o.data_prevista_inauguracao) return false;
        const ano = new Date(o.data_prevista_inauguracao).getFullYear();
        return ano.toString() === filtroAnoInauguracao;
      });
    }

    // Filtro por range de anos (só aplicar se ambos estiverem selecionados)
    if (filtroAnoInauguracaoDe !== 'none' && filtroAnoInauguracaoAte !== 'none') {
      resultado = resultado.filter(o => {
        if (!o.data_prevista_inauguracao) return false;
        const ano = new Date(o.data_prevista_inauguracao).getFullYear();
        return ano >= parseInt(filtroAnoInauguracaoDe) && ano <= parseInt(filtroAnoInauguracaoAte);
      });
    }

    return resultado;
  }, [obrasChecklist, filtroStatus, filtroAnoInauguracao, filtroAnoInauguracaoDe, filtroAnoInauguracaoAte]);

  // Extrair anos disponíveis e municípios
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    obrasChecklist.forEach(obra => {
      if (obra.data_prevista_inauguracao) {
        anos.add(new Date(obra.data_prevista_inauguracao).getFullYear());
      }
    });
    return Array.from(anos).sort();
  }, [obrasChecklist]);

  const limparFiltros = () => {
    setFiltroStatus('todas');
    setFiltroAnoInauguracao('todos');
    setFiltroAnoInauguracaoDe('none');
    setFiltroAnoInauguracaoAte('none');
  };

  // Calcular estatísticas do dashboard
  const stats = useMemo(() => {
    const total = obrasChecklist.length;
    const comDataInauguracao = obrasChecklist.filter(o => o.data_prevista_inauguracao).length;
    const semDataInauguracao = total - comDataInauguracao;
    const inauguradas = obrasChecklist.filter(o => o.status_inauguracao === 'inaugurada').length;
    const atrasadas = obrasChecklist.filter(o => o.diasRestantes < 0 && o.status_inauguracao !== 'inaugurada').length;
    const progressoMedio = total > 0 
      ? obrasChecklist.reduce((acc, o) => acc + o.checklistProgress, 0) / total 
      : 0;

    return {
      total,
      comDataInauguracao,
      semDataInauguracao,
      inauguradas,
      atrasadas,
      progressoMedio
    };
  }, [obrasChecklist]);

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Obras em Check-List Final"
          subtitle="Acompanhe as obras que estão próximas do término do contrato"
          actions={
            <Button variant="outline" onClick={() => navigate('/obras')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Mapa
            </Button>
          }
        />

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Dashboard de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Obras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{stats.total}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Com Data de Inauguração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-green-600" />
                  <div className="text-2xl font-bold">{stats.comDataInauguracao}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sem Data de Inauguração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CalendarX className="h-4 w-4 text-orange-600" />
                  <div className="text-2xl font-bold">{stats.semDataInauguracao}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inauguradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <div className="text-2xl font-bold">{stats.inauguradas}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Atrasadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="text-2xl font-bold">{stats.atrasadas}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Progresso Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{stats.progressoMedio.toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Filtros */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Filtros</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro por Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="nao_inauguradas">Não Inauguradas</SelectItem>
                      <SelectItem value="inauguradas">Inauguradas</SelectItem>
                      <SelectItem value="com_data_inauguracao">Com Data de Inauguração</SelectItem>
                      <SelectItem value="sem_data_inauguracao">Sem Data de Inauguração</SelectItem>
                      <SelectItem value="atrasadas">Atrasadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Ano (único) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano de Inauguração</label>
                  <Select value={filtroAnoInauguracao} onValueChange={setFiltroAnoInauguracao}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {anosDisponiveis.map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro De Ano */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">De Ano</label>
                  <Select value={filtroAnoInauguracaoDe} onValueChange={setFiltroAnoInauguracaoDe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {anosDisponiveis.map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro Até Ano */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Até Ano</label>
                  <Select value={filtroAnoInauguracaoAte} onValueChange={setFiltroAnoInauguracaoAte}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {anosDisponiveis.map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contador de obras */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {loadingChecklist ? 'Carregando...' : `${obrasFiltradas.length} obra${obrasFiltradas.length !== 1 ? 's' : ''} em fase de checklist`}
            </h2>
          </div>

          {/* Lista de obras */}
          {loadingChecklist ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-muted rounded" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : obrasFiltradas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma obra encontrada</p>
                <p className="text-sm text-muted-foreground">
                  {obrasChecklist.length === 0 
                    ? 'As obras aparecerão aqui quando faltarem 15 dias ou menos para o término do contrato.'
                    : 'Nenhuma obra corresponde aos filtros selecionados.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {obrasFiltradas.map(obra => (
                <Card 
                  key={obra.id} 
                  className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: `hsl(var(--${obra.diasRestantes <= 5 ? 'destructive' : obra.diasRestantes <= 10 ? 'orange' : 'warning'}))` }}
                  onClick={() => navigate(`/admin/obras/checklist/${obra.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      {/* Indicador visual de progresso */}
                      <div className="relative shrink-0">
                        <div className="h-20 w-20 rounded-full border-8 border-muted flex items-center justify-center"
                             style={{ 
                               borderColor: obra.checklistProgress >= 75 ? 'hsl(var(--green-500))' : 
                                          obra.checklistProgress >= 50 ? 'hsl(var(--blue-500))' : 
                                          obra.checklistProgress >= 25 ? 'hsl(var(--orange-500))' : 
                                          'hsl(var(--destructive))' 
                             }}>
                          <span className="text-2xl font-bold">{obra.checklistProgress.toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Informações principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold mb-1 truncate">{obra.nome}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 shrink-0" />
                              <span>{obra.municipio}</span>
                              <span className="mx-2">•</span>
                              <span>Contrato: {(obra as any).n_contrato || 'Não informado'}</span>
                            </div>
                          </div>
                          
                          <Badge className={`${getStatusColor(obra.diasRestantes)} text-white shrink-0`}>
                            {obra.diasRestantes < 0 
                              ? `${Math.abs(obra.diasRestantes)} dias atrás` 
                              : `${obra.diasRestantes} dias`}
                          </Badge>
                        </div>

                        {/* Datas e status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <span className="text-muted-foreground">Término: </span>
                              <span className="font-medium">{formatDate(obra.previsaoTermino!)}</span>
                            </div>
                          </div>

                          {obra.data_prevista_inauguracao && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                              <div>
                                <span className="text-muted-foreground">Inauguração: </span>
                                <span className="font-medium">{formatDate(obra.data_prevista_inauguracao)}</span>
                              </div>
                            </div>
                          )}

                          {obra.status_inauguracao && obra.status_inauguracao !== 'aguardando' && (
                            <div className="flex items-center gap-2">
                              <Badge variant={obra.status_inauguracao === 'inaugurada' ? 'default' : 'secondary'}>
                                {obra.status_inauguracao === 'inaugurada' ? '✓ Inaugurada' : 'Sem Previsão'}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Barra de progresso */}
                        <div className="mt-4">
                          <Progress value={obra.checklistProgress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SimpleHeader>
  );
}