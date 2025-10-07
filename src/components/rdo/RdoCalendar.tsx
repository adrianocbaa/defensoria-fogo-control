import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { RdoCalendarDay } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  preenchendo: { label: 'Preenchendo', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800 border-green-200' },
  aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800 border-red-200' },
};

interface RdoCalendarProps {
  obraId: string;
  rdoData: RdoCalendarDay[];
  isLoading: boolean;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function RdoCalendar({ obraId, rdoData, isLoading, currentMonth, onMonthChange }: RdoCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();

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
                const isToday = isSameDay(day, today);
                const statusConfig = rdo ? STATUS_CONFIG[rdo.status as keyof typeof STATUS_CONFIG] : null;

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "relative aspect-square border rounded-lg p-2 hover:bg-accent/50 transition-colors",
                      isToday && "ring-2 ring-primary"
                    )}
                  >
                    {/* Número do dia */}
                    <div className="text-xs font-medium mb-1">
                      {format(day, 'd')}
                    </div>

                    {/* Conteúdo do RDO */}
                    {rdo ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleCreateRdo(day)}
                          className="w-full text-left"
                        >
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1 py-0 h-auto", statusConfig?.color)}
                          >
                            #{rdo.numero_seq}
                          </Badge>
                        </button>
                        
                        {/* Indicadores */}
                        <div className="flex gap-0.5 flex-wrap">
                          {rdo.activity_count > 0 && (
                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded">
                              {rdo.activity_count} ativ
                            </span>
                          )}
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
                        </div>
                      </div>
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
    </Card>
  );
}