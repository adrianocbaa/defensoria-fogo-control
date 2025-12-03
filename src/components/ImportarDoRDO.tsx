import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface ImportarDoRDOProps {
  obraId: string;
  medicaoId: string;
  onImportar: (dados: { [itemCode: string]: number }) => void;
  onFechar: () => void;
}

interface PeriodoImportado {
  data_inicio: string;
  data_fim: string;
}

export function ImportarDoRDO({ obraId, medicaoId, onImportar, onFechar }: ImportarDoRDOProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [periodosImportados, setPeriodosImportados] = useState<PeriodoImportado[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);

  // Buscar períodos já importados para esta obra
  useEffect(() => {
    const fetchPeriodosImportados = async () => {
      try {
        const { data, error } = await supabase
          .from('medicao_rdo_imports')
          .select('data_inicio, data_fim')
          .eq('obra_id', obraId);

        if (error) throw error;
        setPeriodosImportados(data || []);
      } catch (err) {
        console.error('Erro ao buscar períodos importados:', err);
      } finally {
        setLoadingPeriodos(false);
      }
    };

    fetchPeriodosImportados();
  }, [obraId]);

  // Gerar lista de datas já importadas para destacar no calendário
  const datasJaImportadas = React.useMemo(() => {
    const datas: Date[] = [];
    periodosImportados.forEach(periodo => {
      const inicio = parseISO(periodo.data_inicio);
      const fim = parseISO(periodo.data_fim);
      const diasNoPeriodo = eachDayOfInterval({ start: inicio, end: fim });
      datas.push(...diasNoPeriodo);
    });
    return datas;
  }, [periodosImportados]);

  // Verificar se uma data está em algum período já importado
  const isDataImportada = (date: Date): boolean => {
    return periodosImportados.some(periodo => {
      const inicio = parseISO(periodo.data_inicio);
      const fim = parseISO(periodo.data_fim);
      return isWithinInterval(date, { start: inicio, end: fim });
    });
  };

  // Verificar se o range selecionado sobrepõe com períodos já importados
  const verificarSobreposicao = (): string | null => {
    if (!dateRange?.from || !dateRange?.to) return null;

    for (const periodo of periodosImportados) {
      const inicioExistente = parseISO(periodo.data_inicio);
      const fimExistente = parseISO(periodo.data_fim);

      // Verifica se há sobreposição
      const sobrepoe = (
        isWithinInterval(dateRange.from, { start: inicioExistente, end: fimExistente }) ||
        isWithinInterval(dateRange.to, { start: inicioExistente, end: fimExistente }) ||
        isWithinInterval(inicioExistente, { start: dateRange.from, end: dateRange.to }) ||
        isWithinInterval(fimExistente, { start: dateRange.from, end: dateRange.to })
      );

      if (sobrepoe) {
        return `O período selecionado sobrepõe com uma importação anterior (${format(inicioExistente, 'dd/MM/yyyy', { locale: ptBR })} - ${format(fimExistente, 'dd/MM/yyyy', { locale: ptBR })})`;
      }
    }

    return null;
  };

  const handleImportar = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setErro('Por favor, selecione um período válido');
      return;
    }

    // Verificar sobreposição
    const erroSobreposicao = verificarSobreposicao();
    if (erroSobreposicao) {
      setErro(erroSobreposicao);
      return;
    }

    try {
      setCarregando(true);
      setErro('');

      const dataInicio = format(dateRange.from, 'yyyy-MM-dd');
      const dataFim = format(dateRange.to, 'yyyy-MM-dd');

      // Buscar todos os RDOs aprovados no período selecionado
      const { data: rdoReports, error: rdoError } = await supabase
        .from('rdo_reports')
        .select('id')
        .eq('obra_id', obraId)
        .eq('status', 'aprovado')
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (rdoError) throw rdoError;

      if (!rdoReports || rdoReports.length === 0) {
        setErro('Nenhum RDO aprovado encontrado no período selecionado');
        return;
      }

      const reportIds = rdoReports.map(r => r.id);

      // Buscar todas as atividades do tipo 'planilha' desses RDOs
      const { data: activities, error: activitiesError } = await supabase
        .from('rdo_activities')
        .select('item_code, executado_dia, orcamento_item_id')
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .in('report_id', reportIds)
        .not('orcamento_item_id', 'is', null);

      if (activitiesError) throw activitiesError;

      if (!activities || activities.length === 0) {
        setErro('Nenhuma atividade encontrada nos RDOs do período selecionado');
        return;
      }

      // Agregar executado_dia por item_code
      const agregado = new Map<string, number>();
      
      activities.forEach((activity) => {
        const itemCode = activity.item_code?.trim();
        const executado = Number(activity.executado_dia || 0);
        
        if (itemCode && executado > 0) {
          const atual = agregado.get(itemCode) || 0;
          agregado.set(itemCode, atual + executado);
        }
      });

      if (agregado.size === 0) {
        setErro('Nenhum valor executado encontrado no período selecionado');
        return;
      }

      // Registrar o período importado
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from('medicao_rdo_imports')
        .insert({
          obra_id: obraId,
          medicao_id: medicaoId,
          data_inicio: dataInicio,
          data_fim: dataFim,
          user_id: user?.id
        });

      if (insertError) {
        console.error('Erro ao registrar período importado:', insertError);
        // Não bloquear a importação se falhar o registro
      }

      // Converter para objeto
      const dadosImportados: { [itemCode: string]: number } = {};
      agregado.forEach((valor, codigo) => {
        dadosImportados[codigo] = valor;
      });

      toast.success(
        `${agregado.size} itens importados do RDO (${rdoReports.length} relatórios no período)`
      );
      
      onImportar(dadosImportados);
      onFechar();
    } catch (error) {
      console.error('Erro ao importar do RDO:', error);
      setErro('Erro ao importar dados do RDO. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const sobreposicaoAtual = verificarSobreposicao();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Importar Dados do RDO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {sobreposicaoAtual && !erro && (
          <Alert variant="destructive">
            <AlertDescription>{sobreposicaoAtual}</AlertDescription>
          </Alert>
        )}

        {periodosImportados.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Já existem {periodosImportados.length} período(s) importado(s) para esta obra. 
              As datas com fundo destacado no calendário não podem ser selecionadas novamente.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Selecione o período dos RDOs
          </label>
          
          <div className={cn("grid gap-2")}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                  disabled={loadingPeriodos}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {loadingPeriodos ? (
                    <span>Carregando...</span>
                  ) : dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                  modifiers={{
                    imported: datasJaImportadas
                  }}
                  modifiersStyles={{
                    imported: {
                      backgroundColor: 'hsl(var(--destructive) / 0.2)',
                      color: 'hsl(var(--destructive))',
                      fontWeight: 'bold'
                    }
                  }}
                  disabled={(date) => {
                    // Desabilitar datas futuras
                    if (date > new Date()) return true;
                    // Desabilitar datas já importadas
                    return isDataImportada(date);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <p className="text-xs text-muted-foreground">
            O sistema irá somar os valores executados de todos os RDOs aprovados no período selecionado.
            <br />
            <span className="text-destructive font-medium">Datas já importadas estão destacadas e bloqueadas.</span>
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onFechar}
            disabled={carregando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={carregando || !dateRange?.from || !dateRange?.to || !!sobreposicaoAtual}
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar do RDO'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
