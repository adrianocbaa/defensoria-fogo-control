import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfDay, isAfter, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, PenLine, AlertTriangle, Ban } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { RdoCalendarDay, useLastFilledRdo } from '@/hooks/useRdoData';
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
  const { isContratada } = useUserRole();
  const today = startOfDay(new Date());
  const obraStart = obraStartDate ? parseISO(obraStartDate) : null;
  
  // Buscar o último RDO preenchido globalmente
  const { data: lastFilledRdoGlobal } = useLastFilledRdo(obraId);
  const lastFilledDate = lastFilledRdoGlobal?.data ? parseISO(lastFilledRdoGlobal.data) : null;
  
  // Calcular dias sem RDO para alerta
  const referenceDate = lastFilledDate || obraStart;
  const daysWithoutRdo = referenceDate ? differenceInDays(today, startOfDay(referenceDate)) : 0;
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
    
    // Verificar restrição para contratada
    if (!existingRdo && isContratada && obraStart) {
      const dayStart = startOfDay(date);
      const refDateForCheck = lastFilledDate || obraStart;
      const daysFromRef = differenceInDays(dayStart, startOfDay(refDateForCheck));
      
      if (daysFromRef > MAX_DIAS_SEM_RDO) {
        toast.error(`Não é possível criar RDO: limite de ${MAX_DIAS_SEM_RDO} dias consecutivos sem preenchimento excedido.`);
        return;
      }
    }
    
    if (existingRdo) {
      navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}&id=${existingRdo.report_id}`);
    } else {
      navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}`);
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
                
                // Verificar se é dia sem RDO após início da obra
                const isAfterObraStart = obraStart && !isBefore(dayStart, startOfDay(obraStart));
                const isWorkingDay = isAfterObraStart && !isAfter(dayStart, today);
                const isMissingRdo = isWorkingDay && !rdo;
                
                // Verificar se a contratada pode criar RDO neste dia
                const refDateForRestriction = lastFilledDate || obraStart;
                const daysSinceRef = refDateForRestriction ? differenceInDays(dayStart, startOfDay(refDateForRestriction)) : 0;
                const isBlockedForContratada = isContratada && isWorkingDay && daysSinceRef > MAX_DIAS_SEM_RDO;

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "relative aspect-square border rounded-lg p-2 transition-colors",
                      isToday && "ring-2 ring-primary",
                      isMissingRdo && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200",
                      isBlockedForContratada && "bg-red-50/50 dark:bg-red-950/20 border-red-200",
                      !isBlockedForContratada && "hover:bg-accent/50"
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
                    ) : isBlockedForContratada ? (
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
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-6 w-6 hover:bg-green-100"
                        onClick={() => handleCreateRdo(day)}
                      >
                        <Plus className="h-3 w-3 text-green-600" />
                      </Button>
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