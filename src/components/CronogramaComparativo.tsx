import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CronogramaFinanceiro } from '@/hooks/useCronogramaFinanceiro';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Button } from '@/components/ui/button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface CronogramaComparativoProps {
  obraId: string;
  cronograma: CronogramaFinanceiro;
}

interface MacroExecutado {
  itemNumero: number;
  descricao: string;
  totalExecutado: number;
  totalPrevisto: number;
  desvio: number;
  desvioPercentual: number;
}

interface MedicaoComparativo {
  sequencia: number;
  macros: MacroExecutado[];
}

export function CronogramaComparativo({ obraId, cronograma }: CronogramaComparativoProps) {
  const [medicoesComparativo, setMedicoesComparativo] = useState<MedicaoComparativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'macros' | 'acumulado'>('macros');
  const [medicaoSelecionada, setMedicaoSelecionada] = useState<number>(1);

  useEffect(() => {
    carregarDadosExecutados();
  }, [obraId, cronograma]);

  // Atualizar medição selecionada quando os dados forem carregados
  useEffect(() => {
    if (medicoesComparativo.length > 0 && !medicoesComparativo.find(m => m.sequencia === medicaoSelecionada)) {
      setMedicaoSelecionada(medicoesComparativo[0].sequencia);
    }
  }, [medicoesComparativo, medicaoSelecionada]);

  const carregarDadosExecutados = async () => {
    setLoading(true);
    try {
      // Buscar todas as medições da obra (status = bloqueada), ordenadas por sequência
      const { data: medicaoSessions, error: sessionsError } = await supabase
        .from('medicao_sessions')
        .select('id, sequencia')
        .eq('obra_id', obraId)
        .eq('status', 'bloqueada')
        .order('sequencia', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (!medicaoSessions || medicaoSessions.length === 0) {
        setMedicoesComparativo([]);
        setLoading(false);
        return;
      }

      // Buscar itens do orçamento para mapear códigos para MACROs
      const { data: orcamentoItems, error: orcError } = await supabase
        .from('orcamento_items')
        .select('codigo, item, descricao')
        .eq('obra_id', obraId);

      if (orcError) throw orcError;

      // Criar mapa de código para MACRO
      const codigoParaMacro = new Map<string, { macro: string; descricao: string }>();
      orcamentoItems?.forEach(item => {
        // Extrair o primeiro dígito do código do item (MACRO)
        const macro = item.item.split('.')[0];
        if (!codigoParaMacro.has(macro)) {
          // Usar a descrição do item macro (se for um item de primeiro nível)
          const isMacro = item.item.split('.').length === 1;
          if (isMacro) {
            codigoParaMacro.set(macro, { macro, descricao: item.descricao });
          }
        }
        // Mapear também o código completo para o macro
        codigoParaMacro.set(item.codigo, { macro, descricao: item.descricao });
      });

      // Processar cada medição individualmente
      const comparativos: MedicaoComparativo[] = [];

      for (const session of medicaoSessions) {
        // Buscar itens desta medição específica
        const { data: medicaoItems, error: itemsError } = await supabase
          .from('medicao_items')
          .select('item_code, total')
          .eq('medicao_id', session.id);

        if (itemsError) throw itemsError;

        // Agregar valores executados por MACRO para esta medição
        const executadoPorMacro = new Map<number, number>();
        medicaoItems?.forEach(item => {
          const macroInfo = codigoParaMacro.get(item.item_code);
          if (macroInfo) {
            const macroNum = parseInt(macroInfo.macro);
            if (!isNaN(macroNum)) {
              const current = executadoPorMacro.get(macroNum) || 0;
              executadoPorMacro.set(macroNum, current + (item.total || 0));
            }
          }
        });

        // Comparar com o período correspondente do cronograma
        // Medição 1 -> Período 1, Medição 2 -> Período 2, etc.
        const periodoIndex = session.sequencia - 1;

        const comparacoes: MacroExecutado[] = cronograma.items.map(itemCronograma => {
          const executado = executadoPorMacro.get(itemCronograma.item_numero) || 0;
          
          // Calcular os dias do período baseado na sequência da medição
          // Sequência 1 = 30 dias, Sequência 2 = 60 dias, etc.
          const periodoDias = session.sequencia * 30;
          
          // Buscar o período correspondente aos dias calculados
          const periodo = itemCronograma.periodos.find(p => p.periodo === periodoDias);
          const previsto = periodo?.valor || 0;
          
          const desvio = executado - previsto;
          const desvioPercentual = previsto > 0 ? (desvio / previsto) * 100 : 0;

          return {
            itemNumero: itemCronograma.item_numero,
            descricao: itemCronograma.descricao,
            totalExecutado: executado,
            totalPrevisto: previsto,
            desvio,
            desvioPercentual,
          };
        });

        comparativos.push({
          sequencia: session.sequencia,
          macros: comparacoes,
        });
      }

      setMedicoesComparativo(comparativos);
    } catch (error) {
      console.error('Erro ao carregar dados executados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Carregando comparativo...</p>
        </CardContent>
      </Card>
    );
  }

  if (medicoesComparativo.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo Previsto x Executado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma medição bloqueada encontrada. O comparativo será exibido após bloquear a primeira medição.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrar apenas a medição selecionada
  const medicaoComp = medicoesComparativo.find(m => m.sequencia === medicaoSelecionada);

  if (!medicaoComp) {
    return null;
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Seletor de Medição */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Selecionar Medição:</span>
            <div className="flex gap-2 flex-wrap">
              {medicoesComparativo.map((med) => (
                <Button
                  key={med.sequencia}
                  variant={medicaoSelecionada === med.sequencia ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMedicaoSelecionada(med.sequencia)}
                  className="transition-all duration-200"
                >
                  Medição {med.sequencia}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card da Medição Selecionada */}
      {(() => {
        const macrosExecutados = medicaoComp.macros;

        // Calcular o total da obra para cada MACRO
        const totaisPorMacro = new Map<number, number>();
        cronograma.items.forEach(item => {
          totaisPorMacro.set(item.item_numero, item.total_etapa);
        });

        // Calcular o total geral da obra
        const totalObra = cronograma.items.reduce((sum, item) => sum + item.total_etapa, 0);

        // Preparar dados para o gráfico baseado no modo de visualização
        const isAcumulado = viewMode === 'acumulado';
        const chartType = isAcumulado ? 'line' : 'bar'; // Acumulado = Linhas, Macros = Colunas
        
        let chartData;
        
        if (isAcumulado) {
          // Modo Acumulado: mostrar evolução ao longo de todos os períodos do cronograma
          
          // Descobrir todos os períodos do cronograma
          const periodosUnicos = new Set<number>();
          cronograma.items.forEach(item => {
            item.periodos.forEach(p => periodosUnicos.add(p.periodo));
          });
          const todosPeriodos = Array.from(periodosUnicos).sort((a, b) => a - b);
          
          const dadosExecutado: number[] = [0]; // Começar do zero
          const dadosPrevisto: number[] = [0]; // Começar do zero
          const labels: string[] = ['0 dias']; // Ponto inicial
          const pontosComMedicao: boolean[] = [false]; // Rastrear quais pontos têm medição
          const medicoesPorPonto: (MedicaoComparativo | null)[] = [null]; // Dados da medição em cada ponto
          
          // Para cada período do cronograma
          todosPeriodos.forEach((dias) => {
            labels.push(`${dias} dias`);
            
            // Verificar se há medição para este período
            const sequenciaPeriodo = dias / 30;
            const medicaoNoPeriodo = medicoesComparativo.find(m => m.sequencia === sequenciaPeriodo);
            const temMedicao = !!medicaoNoPeriodo;
            
            pontosComMedicao.push(temMedicao);
            medicoesPorPonto.push(medicaoNoPeriodo || null);
            
            if (temMedicao || sequenciaPeriodo < medicaoComp.sequencia) {
              // Se tem medição para este período ou é anterior à medição atual
              const execAcumulado = medicoesComparativo
                .filter(m => m.sequencia <= sequenciaPeriodo)
                .reduce((acc, m) => {
                  return acc + m.macros.reduce((sum, macro) => sum + macro.totalExecutado, 0);
                }, 0);
              
              const prevAcumulado = cronograma.items.reduce((sum, item) => {
                const acumulado = item.periodos
                  .filter(p => p.periodo <= dias)
                  .reduce((s, p) => s + p.valor, 0);
                return sum + acumulado;
              }, 0);
              
              dadosExecutado.push(totalObra > 0 ? (execAcumulado / totalObra) * 100 : 0);
              dadosPrevisto.push(totalObra > 0 ? (prevAcumulado / totalObra) * 100 : 0);
            } else {
              // Período futuro sem medição - não mostrar nada
              dadosExecutado.push(null as any);
              dadosPrevisto.push(null as any);
            }
          });
          
          chartData = {
            labels,
            datasets: [
              {
                label: 'Executado (%)',
                data: dadosExecutado,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                spanGaps: false,
                pointRadius: dadosExecutado.map((_, i) => pontosComMedicao[i] ? 8 : 4),
                pointHoverRadius: dadosExecutado.map((_, i) => pontosComMedicao[i] ? 10 : 6),
                pointBackgroundColor: dadosExecutado.map((_, i) => 
                  pontosComMedicao[i] ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.7)'
                ),
                pointBorderColor: '#fff',
                pointBorderWidth: dadosExecutado.map((_, i) => pontosComMedicao[i] ? 3 : 2),
              },
              {
                label: 'Previsto (%)',
                data: dadosPrevisto,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                spanGaps: false,
                pointRadius: dadosPrevisto.map((_, i) => pontosComMedicao[i] ? 8 : 4),
                pointHoverRadius: dadosPrevisto.map((_, i) => pontosComMedicao[i] ? 10 : 6),
                pointBackgroundColor: dadosPrevisto.map((_, i) => 
                  pontosComMedicao[i] ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.7)'
                ),
                pointBorderColor: '#fff',
                pointBorderWidth: dadosPrevisto.map((_, i) => pontosComMedicao[i] ? 3 : 2),
              },
            ],
            // Armazenar metadata para uso no tooltip
            metadata: {
              pontosComMedicao,
              medicoesPorPonto,
            }
          };
        } else {
          // Modo MACROs: mostrar por MACRO (valores acumulados)
          chartData = {
            labels: macrosExecutados.map(m => `${m.itemNumero} - ${m.descricao}`),
            datasets: [
              {
                label: 'Executado Acumulado (%)',
                data: macrosExecutados.map(m => {
                  // Calcular acumulado até esta medição
                  const acumuladoExecutado = medicoesComparativo
                    .filter(med => med.sequencia <= medicaoComp.sequencia)
                    .reduce((sum, med) => {
                      const macroNaMedicao = med.macros.find(ma => ma.itemNumero === m.itemNumero);
                      return sum + (macroNaMedicao?.totalExecutado || 0);
                    }, 0);
                  
                  const totalMacro = totaisPorMacro.get(m.itemNumero) || 0;
                  return totalMacro > 0 ? (acumuladoExecutado / totalMacro) * 100 : 0;
                }),
                backgroundColor: 'rgba(34, 197, 94, 0.7)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: chartType === 'line' ? 2 : 1,
                fill: chartType === 'line' ? false : true,
                tension: 0.4,
              },
              {
                label: 'Previsto Acumulado (%)',
                data: macrosExecutados.map(m => {
                  // Calcular acumulado até esta medição
                  const acumuladoPrevisto = medicoesComparativo
                    .filter(med => med.sequencia <= medicaoComp.sequencia)
                    .reduce((sum, med) => {
                      const macroNaMedicao = med.macros.find(ma => ma.itemNumero === m.itemNumero);
                      return sum + (macroNaMedicao?.totalPrevisto || 0);
                    }, 0);
                  
                  const totalMacro = totaisPorMacro.get(m.itemNumero) || 0;
                  return totalMacro > 0 ? (acumuladoPrevisto / totalMacro) * 100 : 0;
                }),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: chartType === 'line' ? 2 : 1,
                fill: chartType === 'line' ? false : true,
                tension: 0.4,
              },
            ],
          };
        }

        const chartOptions = {
          responsive: true,
          plugins: {
            legend: {
              position: 'top' as const,
            },
            title: {
              display: false,
            },
            tooltip: {
              callbacks: {
                title: function(context: any) {
                  const index = context[0].dataIndex;
                  const metadata = (chartData as any).metadata;
                  
                  if (metadata && metadata.pontosComMedicao && metadata.pontosComMedicao[index]) {
                    const medicao = metadata.medicoesPorPonto[index];
                    if (medicao) {
                      return [`${context[0].label}`, `Medição ${medicao.sequencia} ✓`];
                    }
                  }
                  return context[0].label;
                },
                label: function(context: any) {
                  const index = context.dataIndex;
                  const metadata = (chartData as any).metadata;
                  let label = context.dataset.label || '';
                  
                  if (label) {
                    label += ': ';
                  }
                  label += context.parsed.y.toFixed(2) + '%';
                  
                  // Se tem medição, adicionar informação extra
                  if (metadata && metadata.pontosComMedicao && metadata.pontosComMedicao[index]) {
                    const medicao = metadata.medicoesPorPonto[index];
                    if (medicao && context.datasetIndex === 0) { // Só mostrar uma vez
                      const totalExec = medicao.macros.reduce((sum, m) => sum + m.totalExecutado, 0);
                      const totalPrev = medicao.macros.reduce((sum, m) => sum + m.totalPrevisto, 0);
                      return [
                        label,
                        `Executado: ${formatCurrency(totalExec)}`,
                        `Previsto: ${formatCurrency(totalPrev)}`
                      ];
                    }
                  }
                  
                  return label;
                },
                afterLabel: function(context: any) {
                  const index = context.dataIndex;
                  const metadata = (chartData as any).metadata;
                  
                  if (metadata && metadata.pontosComMedicao && metadata.pontosComMedicao[index]) {
                    return '📍 Marco de medição';
                  }
                  return '';
                }
              }
            },
            datalabels: {
              display: chartType === 'line',
              align: 'top' as const,
              anchor: 'end' as const,
              backgroundColor: function(context: any) {
                return context.dataset.borderColor;
              },
              borderRadius: 4,
              color: 'white',
              font: {
                weight: 'bold' as const,
                size: 10
              },
              padding: 4,
              formatter: function(value: any) {
                if (value === null || value === undefined || value === 0) return '';
                return value.toFixed(2) + '%';
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value: any) {
                  return value + '%';
                }
              }
            }
          }
        };

        const ChartComponent = chartType === 'bar' ? Bar : Line;

        return (
          <Card key={medicaoComp.sequencia}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Medição {medicaoComp.sequencia} - Comparativo Previsto x Executado
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Análise {viewMode === 'macros' ? 'por MACRO' : 'Acumulada'} do período {medicaoComp.sequencia} do cronograma financeiro
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Controles */}
              <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant={viewMode === 'macros' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('macros')}
                  className="transition-all duration-200"
                >
                  Por MACROs (Colunas)
                </Button>
                <Button
                  variant={viewMode === 'acumulado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('acumulado')}
                  className="transition-all duration-200"
                >
                  Acumulado (Linhas)
                </Button>
              </div>

              {/* Gráfico */}
              <div className="h-[400px]">
                <ChartComponent data={chartData} options={chartOptions} />
              </div>

              {/* Barra de Progresso com Marcos (apenas no modo acumulado) */}
              {isAcumulado && (chartData as any).metadata && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Linha do Tempo - Medições Realizadas
                  </h3>
                  <div className="relative">
                    {/* Barra de progresso */}
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{ 
                          width: `${((medicaoComp.sequencia * 30) / Math.max(...cronograma.items.flatMap(i => i.periodos.map(p => p.periodo)))) * 100}%` 
                        }}
                      />
                    </div>
                    
                    {/* Marcos de medição */}
                    <div className="relative h-16 mt-2">
                      {medicoesComparativo.map((med) => {
                        const dias = med.sequencia * 30;
                        const maxDias = Math.max(...cronograma.items.flatMap(i => i.periodos.map(p => p.periodo)));
                        const posicao = (dias / maxDias) * 100;
                        
                        const totalExec = med.macros.reduce((sum, m) => sum + m.totalExecutado, 0);
                        const percExec = totalObra > 0 ? (totalExec / totalObra) * 100 : 0;
                        
                        return (
                          <div 
                            key={med.sequencia}
                            className="absolute group cursor-pointer"
                            style={{ left: `${posicao}%` }}
                            onClick={() => setMedicaoSelecionada(med.sequencia)}
                          >
                            {/* Marco visual */}
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-1 h-6 transition-all ${
                              medicaoSelecionada === med.sequencia 
                                ? 'bg-primary h-8' 
                                : 'bg-border group-hover:bg-primary/60 group-hover:h-7'
                            }`} />
                            
                            {/* Ponto */}
                            <div className={`absolute -top-9 left-1/2 -translate-x-1/2 transition-all ${
                              medicaoSelecionada === med.sequencia
                                ? 'w-4 h-4 bg-primary ring-4 ring-primary/20'
                                : 'w-3 h-3 bg-border group-hover:bg-primary/60 group-hover:w-4 group-hover:h-4'
                            } rounded-full`} />
                            
                            {/* Label */}
                            <div className={`absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium transition-all ${
                              medicaoSelecionada === med.sequencia
                                ? 'text-primary scale-110'
                                : 'text-muted-foreground group-hover:text-primary group-hover:scale-105'
                            }`}>
                              Med. {med.sequencia}
                            </div>
                            
                            {/* Tooltip no hover */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-xs whitespace-nowrap">
                                <div className="font-semibold mb-1">Medição {med.sequencia}</div>
                                <div className="text-muted-foreground">
                                  {dias} dias • {percExec.toFixed(2)}%
                                </div>
                                <div className="text-muted-foreground">
                                  {formatCurrency(totalExec)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de Desvios */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Análise de Desvios
                </h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-semibold">Item</th>
                        <th className="text-left p-3 font-semibold">Descrição</th>
                        <th className="text-right p-3 font-semibold bg-blue-50 dark:bg-blue-950/20">Previsto</th>
                        <th className="text-right p-3 font-semibold bg-blue-50 dark:bg-blue-950/20">Previsto Acum.</th>
                        <th className="text-right p-3 font-semibold bg-green-50 dark:bg-green-950/20">Executado</th>
                        <th className="text-right p-3 font-semibold bg-green-50 dark:bg-green-950/20">Executado Acum.</th>
                        <th className="text-right p-3 font-semibold">Desvio (%)</th>
                        <th className="text-right p-3 font-semibold">Desvio Acum. (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {macrosExecutados.map((macro) => {
                        // Calcular acumulado até esta medição
                        const acumuladoPrevisto = medicoesComparativo
                          .filter(m => m.sequencia <= medicaoComp.sequencia)
                          .reduce((sum, m) => {
                            const macroNaMedicao = m.macros.find(ma => ma.itemNumero === macro.itemNumero);
                            return sum + (macroNaMedicao?.totalPrevisto || 0);
                          }, 0);
                        
                        const acumuladoExecutado = medicoesComparativo
                          .filter(m => m.sequencia <= medicaoComp.sequencia)
                          .reduce((sum, m) => {
                            const macroNaMedicao = m.macros.find(ma => ma.itemNumero === macro.itemNumero);
                            return sum + (macroNaMedicao?.totalExecutado || 0);
                          }, 0);
                        
                        const desvioAcumulado = acumuladoExecutado - acumuladoPrevisto;
                        const desvioAcumuladoPct = acumuladoPrevisto > 0 ? (desvioAcumulado / acumuladoPrevisto) * 100 : 0;
                        
                        return (
                          <tr key={macro.itemNumero} className="hover:bg-muted/50">
                            <td className="p-3 font-medium">{macro.itemNumero}</td>
                            <td className="p-3">{macro.descricao}</td>
                            <td className="p-3 text-right font-mono text-blue-600 bg-blue-50 dark:bg-blue-950/20">
                              {formatCurrency(macro.totalPrevisto)}
                            </td>
                            <td className="p-3 text-right font-mono text-blue-700 font-semibold bg-blue-50 dark:bg-blue-950/20">
                              {formatCurrency(acumuladoPrevisto)}
                            </td>
                            <td className="p-3 text-right font-mono text-green-600 bg-green-50 dark:bg-green-950/20">
                              {formatCurrency(macro.totalExecutado)}
                            </td>
                            <td className="p-3 text-right font-mono text-green-700 font-semibold bg-green-50 dark:bg-green-950/20">
                              {formatCurrency(acumuladoExecutado)}
                            </td>
                            <td className={`p-3 text-right font-mono font-semibold ${
                              macro.desvioPercentual > 0 ? 'text-red-600' : macro.desvioPercentual < 0 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              {macro.desvioPercentual > 0 ? '+' : ''}{macro.desvioPercentual.toFixed(2)}%
                            </td>
                            <td className={`p-3 text-right font-mono font-semibold ${
                              desvioAcumuladoPct > 0 ? 'text-red-600' : desvioAcumuladoPct < 0 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              {desvioAcumuladoPct > 0 ? '+' : ''}{desvioAcumuladoPct.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legenda */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Legenda:</strong> Valores positivos no desvio indicam que o executado superou o previsto. 
                  Valores negativos indicam que o executado está abaixo do previsto no cronograma financeiro.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
