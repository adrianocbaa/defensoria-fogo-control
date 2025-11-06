import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Calendar, Building2 } from 'lucide-react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

        // Filtrar obras: aquelas com checklist OU dentro do prazo (15 dias antes até 90 dias depois)
        const obrasEmChecklist = obras.filter(obra => {
          if (!obra.previsaoTermino) return false;
          
          // Se já tem checklist, sempre mostrar
          if (obrasIdsComChecklist.has(obra.id)) {
            return true;
          }
          
          // Senão, verificar se está dentro dos 15 dias antes do término OU até 90 dias depois
          const diasRestantes = calcularDiasRestantes(obra.previsaoTermino);
          return diasRestantes <= 15 && diasRestantes >= -90;
        });

        // Para cada obra, buscar o checklist e calcular progresso
        const obrasComProgresso = await Promise.all(
          obrasEmChecklist.map(async (obra) => {
            const diasRestantes = calcularDiasRestantes(obra.previsaoTermino!);
            
            // Buscar itens do checklist
            const { data: checklistItems, error } = await (supabase as any)
              .from('obra_checklist_items')
              .select('*')
              .eq('obra_id', obra.id)
              .order('ordem', { ascending: true });

            if (error) {
              console.error('Erro ao buscar checklist:', error);
            }

            // Se não existir checklist E está dentro do período (15 dias antes até 90 dias depois), criar automaticamente
            if ((!checklistItems || checklistItems.length === 0) && diasRestantes <= 15 && diasRestantes >= -90) {
              await criarChecklistPadrao(obra.id);
              const { data: novoChecklist } = await (supabase as any)
                .from('obra_checklist_items')
                .select('*')
                .eq('obra_id', obra.id);
              
              return {
                ...obra,
                diasRestantes,
                checklistProgress: 0,
                data_prevista_inauguracao: (obra as any).data_prevista_inauguracao,
                status_inauguracao: (obra as any).status_inauguracao || 'aguardando'
              };
            }

            // Calcular progresso (excluindo itens "não se aplica")
            const itensAplicaveis = (checklistItems as any[]).filter((item: any) => item.situacao !== 'nao_se_aplica');
            const totalItens = itensAplicaveis.length;
            const concluidos = itensAplicaveis.filter((item: any) => item.situacao === 'concluido').length;
            const checklistProgress = totalItens > 0 ? (concluidos / totalItens) * 100 : 0;

            return {
              ...obra,
              diasRestantes,
              checklistProgress,
              data_prevista_inauguracao: (obra as any).data_prevista_inauguracao,
              status_inauguracao: (obra as any).status_inauguracao || 'aguardando'
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
          {/* Contador de obras */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {loadingChecklist ? 'Carregando...' : `${obrasChecklist.length} obra${obrasChecklist.length !== 1 ? 's' : ''} em fase de checklist`}
            </h2>
          </div>

          {/* Lista de obras */}
          {loadingChecklist ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : obrasChecklist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma obra em fase de checklist</p>
                <p className="text-sm text-muted-foreground">
                  As obras aparecerão aqui quando faltarem 15 dias ou menos para o término do contrato.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {obrasChecklist.map(obra => (
                <Card 
                  key={obra.id} 
                  className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                  style={{ borderLeftColor: `hsl(var(--${obra.diasRestantes <= 5 ? 'destructive' : obra.diasRestantes <= 10 ? 'orange' : 'warning'}))` }}
                  onClick={() => navigate(`/admin/obras/checklist/${obra.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg line-clamp-2">{obra.nome}</CardTitle>
                      <Badge className={`${getStatusColor(obra.diasRestantes)} text-white shrink-0 ml-2`}>
                        {obra.diasRestantes < 0 
                          ? `${Math.abs(obra.diasRestantes)} dias atrás` 
                          : `${obra.diasRestantes} dias`}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {obra.municipio}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Data de término */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Término:</span>
                      <span className="font-medium">{formatDate(obra.previsaoTermino!)}</span>
                    </div>

                    {/* Data prevista inauguração */}
                    {obra.data_prevista_inauguracao && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">Inauguração:</span>
                        <span className="font-medium">{formatDate(obra.data_prevista_inauguracao)}</span>
                      </div>
                    )}

                    {/* Status inauguração */}
                    {obra.status_inauguracao && obra.status_inauguracao !== 'aguardando' && (
                      <Badge variant={obra.status_inauguracao === 'inaugurada' ? 'default' : 'secondary'}>
                        {obra.status_inauguracao === 'inaugurada' ? 'Inaugurada' : 'Sem Previsão'}
                      </Badge>
                    )}

                    {/* Progresso do checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso do Checklist:</span>
                        <span className={`font-semibold ${getProgressColor(obra.checklistProgress)}`}>
                          {obra.checklistProgress.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={obra.checklistProgress} className="h-2" />
                    </div>

                    {/* Contrato */}
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Contrato: {(obra as any).n_contrato || 'Não informado'}
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