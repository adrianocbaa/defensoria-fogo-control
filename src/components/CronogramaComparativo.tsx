import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CronogramaFinanceiro } from '@/hooks/useCronogramaFinanceiro';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

  useEffect(() => {
    carregarDadosExecutados();
  }, [obraId, cronograma]);

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

  return (
    <div className="space-y-6 mb-6">
      {medicoesComparativo.map((medicaoComp) => {
        const macrosExecutados = medicaoComp.macros;

        // Preparar dados para o gráfico (em porcentagem)
        const chartData = {
          labels: macrosExecutados.map(m => `${m.itemNumero} - ${m.descricao}`),
          datasets: [
            {
              label: 'Previsto (%)',
              data: macrosExecutados.map(m => 100), // Previsto é sempre 100%
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
            },
            {
              label: 'Executado (%)',
              data: macrosExecutados.map(m => m.totalPrevisto > 0 ? (m.totalExecutado / m.totalPrevisto) * 100 : 0),
              backgroundColor: 'rgba(34, 197, 94, 0.7)',
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 1,
            },
          ],
        };

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
                label: function(context: any) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += context.parsed.y.toFixed(2) + '%';
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 120, // Limite de 120% para visualizar melhor
              ticks: {
                callback: function(value: any) {
                  return value + '%';
                }
              }
            }
          }
        };

        return (
          <Card key={medicaoComp.sequencia}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Medição {medicaoComp.sequencia} - Comparativo Previsto x Executado
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Análise por MACRO do período {medicaoComp.sequencia} do cronograma financeiro
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gráfico */}
              <div className="h-[400px]">
                <Bar data={chartData} options={chartOptions} />
              </div>

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
                        <th className="text-right p-3 font-semibold">Previsto</th>
                        <th className="text-right p-3 font-semibold">Executado</th>
                        <th className="text-right p-3 font-semibold">Desvio (R$)</th>
                        <th className="text-right p-3 font-semibold">Desvio (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {macrosExecutados.map((macro) => (
                        <tr key={macro.itemNumero} className="hover:bg-muted/50">
                          <td className="p-3 font-medium">{macro.itemNumero}</td>
                          <td className="p-3">{macro.descricao}</td>
                          <td className="p-3 text-right font-mono text-blue-600">
                            {formatCurrency(macro.totalPrevisto)}
                          </td>
                          <td className="p-3 text-right font-mono text-green-600">
                            {formatCurrency(macro.totalExecutado)}
                          </td>
                          <td className={`p-3 text-right font-mono font-semibold ${
                            macro.desvio > 0 ? 'text-red-600' : macro.desvio < 0 ? 'text-green-600' : 'text-muted-foreground'
                          }`}>
                            {macro.desvio > 0 ? '+' : ''}{formatCurrency(macro.desvio)}
                          </td>
                          <td className={`p-3 text-right font-mono font-semibold ${
                            macro.desvioPercentual > 0 ? 'text-red-600' : macro.desvioPercentual < 0 ? 'text-green-600' : 'text-muted-foreground'
                          }`}>
                            {macro.desvioPercentual > 0 ? '+' : ''}{macro.desvioPercentual.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
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
      })}
    </div>
  );
}
