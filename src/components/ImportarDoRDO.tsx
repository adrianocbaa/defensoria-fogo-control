import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportarDoRDOProps {
  obraId: string;
  medicaoId: string;
  onImportar: (dados: { [itemCode: string]: number }) => void;
  onFechar: () => void;
}

interface PeriodoImportado {
  id: string;
  data_inicio: string;
  data_fim: string;
}

export function ImportarDoRDO({ obraId, medicaoId, onImportar, onFechar }: ImportarDoRDOProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [periodosImportados, setPeriodosImportados] = useState<PeriodoImportado[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [deletingPeriodo, setDeletingPeriodo] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodoToDelete, setPeriodoToDelete] = useState<PeriodoImportado | null>(null);

  // Buscar períodos já importados para esta obra
  const fetchPeriodosImportados = useCallback(async () => {
    try {
      setLoadingPeriodos(true);
      const { data, error } = await supabase
        .from('medicao_rdo_imports')
        .select('id, data_inicio, data_fim')
        .eq('obra_id', obraId)
        .order('data_inicio', { ascending: true });

      if (error) throw error;
      setPeriodosImportados(data || []);
    } catch (err) {
      console.error('Erro ao buscar períodos importados:', err);
    } finally {
      setLoadingPeriodos(false);
    }
  }, [obraId]);

  useEffect(() => {
    fetchPeriodosImportados();
  }, [fetchPeriodosImportados]);

  // Excluir período importado
  const handleDeletePeriodo = async () => {
    if (!periodoToDelete) return;

    try {
      setDeletingPeriodo(periodoToDelete.id);
      
      const { error } = await supabase
        .from('medicao_rdo_imports')
        .delete()
        .eq('id', periodoToDelete.id);

      if (error) throw error;

      toast.success('Período de importação excluído. Você pode reimportar os dados deste período.');
      await fetchPeriodosImportados();
    } catch (err) {
      console.error('Erro ao excluir período:', err);
      toast.error('Erro ao excluir período de importação');
    } finally {
      setDeletingPeriodo(null);
      setDeleteDialogOpen(false);
      setPeriodoToDelete(null);
    }
  };

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
    <>
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
          <div className="space-y-2">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Já existem {periodosImportados.length} período(s) importado(s) para esta obra. 
                As datas com fundo destacado no calendário não podem ser selecionadas novamente.
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">Períodos importados:</p>
              {periodosImportados.map((periodo) => (
                <div 
                  key={periodo.id} 
                  className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                >
                  <span>
                    {format(parseISO(periodo.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseISO(periodo.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setPeriodoToDelete(periodo);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={deletingPeriodo === periodo.id}
                  >
                    {deletingPeriodo === periodo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Exclua um período para permitir reimportação após correção do RDO.
              </p>
            </div>
          </div>
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Período de Importação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o período de importação 
            {periodoToDelete && (
              <strong>
                {" "}{format(parseISO(periodoToDelete.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseISO(periodoToDelete.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
              </strong>
            )}
            ? Isso permitirá reimportar os dados desse período após correção do RDO.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePeriodo}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
