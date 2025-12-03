import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfDay, isAfter, isBefore, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, PenLine, AlertTriangle, Ban, Coffee, FileX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { RdoCalendarDay, useLastFilledRdo, useFirstMissingRdoDate } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/useUserRole';
import { useDiasSemExpediente } from '@/hooks/useDiasSemExpediente';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  preenchendo: { label: 'Preenchendo', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800 border-green-200' },
  aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800 border-red-200' },
};

const MAX_DIAS_SEM_RDO = 7;

interface RdoCalendarProps {
  obraId: string;
  rdoData: RdoCalendarDay[];
  isLoading: boolean;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  obraStartDate?: string | null;
}

export function RdoCalendar({ obraId, rdoData, isLoading, currentMonth, onMonthChange, obraStartDate }: RdoCalendarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isContratada, isAdmin } = useUserRole();
  const today = startOfDay(new Date());
  const obraStart = obraStartDate ? parseISO(obraStartDate) : null;
  
  // Hook para dias sem expediente
  const { diasSemExpediente, isDiaSemExpediente, toggleDiaSemExpediente, isToggling } = useDiasSemExpediente(obraId);
  
  // Buscar o último RDO preenchido globalmente
  const { data: lastFilledRdoGlobal } = useLastFilledRdo(obraId);
  const lastFilledDate = lastFilledRdoGlobal?.data ? parseISO(lastFilledRdoGlobal.data) : null;
  
  // Buscar o PRIMEIRO dia sem RDO na sequência (para bloqueio correto)
  const { data: firstMissingData } = useFirstMissingRdoDate(obraId, obraStartDate || null);
  const firstMissingDate = firstMissingData?.firstMissingDate ? parseISO(firstMissingData.firstMissingDate) : null;
  
  // A referência para bloqueio é o primeiro dia sem RDO (não o último RDO preenchido)
  // Se não há gap, usar o início da obra
  const referenceDate = firstMissingDate || obraStart;
  
  // Função para contar dias úteis entre duas datas (excluindo TODOS os fins de semana)
  const countWorkingDaysBetween = (fromDate: Date, toDate: Date): number => {
    let count = 0;
    let current = startOfDay(fromDate);
    while (isBefore(current, toDate)) {
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      const dayOfWeek = getDay(current);
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      // Contar apenas dias úteis (seg-sex), excluindo todos os fins de semana
      if (!isWeekendDay && !isAfter(current, toDate)) {
        count++;
      }
    }
    return count;
  };
  
  const countWorkingDaysWithoutRdo = () => {
    // Se não há dia faltando na sequência, retorna 0
    if (!firstMissingDate) return 0;
    return countWorkingDaysBetween(firstMissingDate, today);
  };
  
  const daysWithoutRdo = countWorkingDaysWithoutRdo();
  const showRestrictionAlert = isContratada && daysWithoutRdo > MAX_DIAS_SEM_RDO;
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reportId: string | null; date: string | null }>({
    open: false,
    reportId: null,
    date: null,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular dias vazios no início
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);
  
  // Helper para verificar se é fim de semana
  const isWeekend = (date: Date): boolean => {
    const day = getDay(date);
    return day === 0 || day === 6;
  };

  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  const handleCreateRdo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingRdo = rdoData.find(r => r.data === dateStr);
    
    // Verificar restrição para contratada (baseado no primeiro dia sem RDO)
    if (!existingRdo && isContratada && obraStart && firstMissingDate) {
      const dayStart = startOfDay(date);
      // Calcular dias úteis desde o primeiro dia sem RDO até a data alvo
      const workingDaysFromFirstMissing = countWorkingDaysBetween(startOfDay(firstMissingDate), dayStart);
      
      if (workingDaysFromFirstMissing > MAX_DIAS_SEM_RDO) {
        toast.error(`Não é possível criar RDO: limite de ${MAX_DIAS_SEM_RDO} dias úteis sem preenchimento excedido. Preencha primeiro o dia ${format(firstMissingDate, 'dd/MM/yyyy')}.`);
        return;
      }
    }
    
    if (existingRdo) {
      navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}&id=${existingRdo.report_id}`);
    } else {
      navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}`);
    }
  };

  // Criar RDO sem atividade e ir direto para assinaturas
  const handleCreateEmptyRdo = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Verificar restrição para contratada (baseado no primeiro dia sem RDO)
    if (isContratada && obraStart && firstMissingDate) {
      const dayStart = startOfDay(date);
      // Calcular dias úteis desde o primeiro dia sem RDO até a data alvo
      const workingDaysFromFirstMissing = countWorkingDaysBetween(startOfDay(firstMissingDate), dayStart);
      
      if (workingDaysFromFirstMissing > MAX_DIAS_SEM_RDO) {
        toast.error(`Não é possível criar RDO: limite de ${MAX_DIAS_SEM_RDO} dias úteis sem preenchimento excedido. Preencha primeiro o dia ${format(firstMissingDate, 'dd/MM/yyyy')}.`);
        return;
      }
    }
    
    try {
      // Buscar próximo número sequencial
      const { data: maxSeq } = await supabase
        .from('rdo_reports')
        .select('numero_seq')
        .eq('obra_id', obraId)
        .order('numero_seq', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const nextSeq = (maxSeq?.numero_seq || 0) + 1;
      
      // Criar RDO vazio
      const { data: newRdo, error } = await supabase
        .from('rdo_reports')
        .insert({
          obra_id: obraId,
          data: dateStr,
          numero_seq: nextSeq,
          status: 'preenchendo',
          observacoes: 'Sem atividade no dia'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['rdo-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['last-filled-rdo', obraId] });
      queryClient.invalidateQueries({ queryKey: ['first-missing-rdo', obraId] });
      
      toast.success('RDO sem atividade criado');
      
      // Navegar direto para assinaturas (step 7 = índice do último step)
      navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}&id=${newRdo.id}&step=7`);
    } catch (error) {
      console.error('Erro ao criar RDO sem atividade:', error);
      toast.error('Erro ao criar RDO');
    }
  };

  const getRdoForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return rdoData.find(r => r.data === dateStr);
  };

  const handleDeleteRdo = async () => {
    if (!deleteDialog.reportId) return;

    try {
      // Deletar atividades
      await supabase
        .from('rdo_activities')
        .delete()
        .eq('report_id', deleteDialog.reportId);

      // Deletar notas de atividades
      await supabase
        .from('rdo_activity_notes')
        .delete()
        .eq('report_id', deleteDialog.reportId);

      // Deletar audit logs
      await supabase
        .from('rdo_audit_log')
        .delete()
        .eq('report_id', deleteDialog.reportId);

      // Deletar o RDO
      const { error: deleteError } = await supabase
        .from('rdo_reports')
        .delete()
        .eq('id', deleteDialog.reportId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['rdo-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rdo-report'] });
      queryClient.invalidateQueries({ queryKey: ['last-filled-rdo', obraId] });
      queryClient.invalidateQueries({ queryKey: ['first-missing-rdo', obraId] });
      toast.success('RDO excluído com sucesso');
      setDeleteDialog({ open: false, reportId: null, date: null });
    } catch (error) {
      console.error('Erro ao excluir RDO:', error);
      toast.error('Erro ao excluir RDO');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-xl">Calendário de RDOs</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Alerta de restrição para Contratada */}
        {showRestrictionAlert && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Limite de {MAX_DIAS_SEM_RDO} dias excedido!</strong> São {daysWithoutRdo} dias sem preenchimento de RDO. 
              A criação de novos RDOs está bloqueada. Entre em contato com o Fiscal para regularizar a situação.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Alerta de atenção para dias sem RDO */}
        {!showRestrictionAlert && daysWithoutRdo > 3 && obraStart && (
          <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>Atenção:</strong> {daysWithoutRdo} dias sem preenchimento de RDO. 
              {isContratada && ` Restam ${MAX_DIAS_SEM_RDO - daysWithoutRdo} dias antes do bloqueio.`}
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <div className="w-full">
            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7 gap-1">
              {/* Dias vazios no início */}
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Dias do mês */}
              {daysInMonth.map((day) => {
                const rdo = getRdoForDay(day);
                const dayStart = startOfDay(day);
                const isToday = isSameDay(day, today);
                const statusConfig = rdo ? STATUS_CONFIG[rdo.status as keyof typeof STATUS_CONFIG] : null;
                const dateStr = format(day, 'yyyy-MM-dd');
                const isDayWeekend = isWeekend(day);
                const isDayMarkedOff = isDiaSemExpediente(dateStr);
                
                // Verificar se é dia sem RDO após início da obra
                const isAfterObraStart = obraStart && !isBefore(dayStart, startOfDay(obraStart));
                const isWorkingDay = isAfterObraStart && !isAfter(dayStart, today);
                // Se é fim de semana marcado como sem expediente, não é "missing"
                const isMissingRdo = isWorkingDay && !rdo && !(isDayWeekend && isDayMarkedOff);
                
                // Verificar se a contratada pode criar RDO neste dia (baseado no PRIMEIRO dia sem RDO)
                // A referência é o primeiro gap na sequência de RDOs, não o último RDO preenchido
                const workingDaysSinceFirstMissing = firstMissingDate ? countWorkingDaysBetween(startOfDay(firstMissingDate), dayStart) : 0;
                const isBlockedForContratada = isContratada && isWorkingDay && firstMissingDate && workingDaysSinceFirstMissing > MAX_DIAS_SEM_RDO && !(isDayWeekend && isDayMarkedOff);
                const isApproved = rdo?.status === 'aprovado';

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "relative aspect-square border rounded-lg p-2 transition-colors",
                      isToday && "ring-2 ring-primary",
                      isDayMarkedOff && "bg-slate-100 dark:bg-slate-800/50 border-slate-300",
                      isApproved && !isDayMarkedOff && "bg-green-100 dark:bg-green-950/30 border-green-300",
                      !isApproved && !isDayMarkedOff && isMissingRdo && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200",
                      !isApproved && !isDayMarkedOff && isBlockedForContratada && "bg-red-50/50 dark:bg-red-950/20 border-red-200",
                      !isApproved && !isDayMarkedOff && !isBlockedForContratada && "hover:bg-accent/50"
                    )}
                  >
                    {/* Número do dia + indicador de alerta */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{format(day, 'd')}</span>
                      {isMissingRdo && !rdo && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">RDO não preenchido</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Conteúdo do RDO */}
                    {rdo ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleCreateRdo(day)}
                            className="flex-1 text-left"
                          >
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1 py-0 h-auto", statusConfig?.color)}
                            >
                              #{rdo.numero_seq}
                            </Badge>
                          </button>
                          {/* Botão excluir: RDOs aprovados só podem ser excluídos por admin */}
                          {(rdo.status !== 'aprovado' || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-red-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, reportId: rdo.report_id, date: rdo.data });
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Indicadores */}
                        <div className="flex gap-0.5 flex-wrap items-center">
                          {rdo.photo_count > 0 && (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded">
                              {rdo.photo_count} fotos
                            </span>
                          )}
                          {rdo.occurrence_count > 0 && (
                            <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded">
                              {rdo.occurrence_count} ocor
                            </span>
                          )}
                          {/* Indicador de pendência de assinatura */}
                          {((rdo.assinatura_fiscal_validado_em && !rdo.assinatura_contratada_validado_em) || 
                            (!rdo.assinatura_fiscal_validado_em && rdo.assinatura_contratada_validado_em)) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center">
                                    <PenLine className="h-3 w-3 text-amber-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {rdo.assinatura_contratada_validado_em && !rdo.assinatura_fiscal_validado_em 
                                      ? 'Aguardando assinatura do Fiscal'
                                      : 'Aguardando assinatura da Contratada'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    ) : isBlockedForContratada && !isDayWeekend ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute bottom-1 right-1">
                              <Ban className="h-4 w-4 text-red-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Bloqueado: limite de {MAX_DIAS_SEM_RDO} dias excedido</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : isDayMarkedOff ? (
                      // Dia marcado como sem expediente
                      <div className="flex flex-col items-center justify-center h-full">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-1">
                                <Coffee className="h-4 w-4 text-slate-500" />
                                <span className="text-[8px] text-slate-500 font-medium">Sem Expediente</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Sem expediente na obra</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isContratada && !isAfter(dayStart, today) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5 hover:bg-red-100"
                            onClick={() => toggleDiaSemExpediente(dateStr)}
                            disabled={isToggling}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end justify-end h-full gap-1">
                        {/* Botão "Sem Expediente" para fins de semana (apenas Contratada) */}
                        {isDayWeekend && isContratada && !isAfter(dayStart, today) && isAfterObraStart && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 hover:bg-slate-200"
                                  onClick={() => toggleDiaSemExpediente(dateStr)}
                                  disabled={isToggling}
                                >
                                  <Coffee className="h-3 w-3 text-slate-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Marcar como sem expediente</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Não mostrar botões de criar RDO se estiver bloqueado */}
                        {!isBlockedForContratada && isAfterObraStart && !isAfter(dayStart, today) && (
                          <div className="flex gap-0.5">
                            {/* Botão RDO Sem Atividade */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-amber-100"
                                    onClick={() => handleCreateEmptyRdo(day)}
                                  >
                                    <FileX className="h-3 w-3 text-amber-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">RDO sem atividade (ir para assinaturas)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {/* Botão criar RDO normal */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-green-100"
                                    onClick={() => handleCreateRdo(day)}
                                  >
                                    <Plus className="h-3 w-3 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Criar RDO completo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este RDO? Esta ação não pode ser desfeita e todas as informações cadastradas no RDO serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRdo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}