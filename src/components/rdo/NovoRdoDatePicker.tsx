import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface NovoRdoDatePickerProps {
  obraId: string;
  disabled?: boolean;
  obraStartDate?: string | null;
}

export function NovoRdoDatePicker({ obraId, disabled, obraStartDate }: NovoRdoDatePickerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: existingDates = new Set<string>() } = useQuery({
    queryKey: ['rdo-existing-dates', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_reports')
        .select('data')
        .eq('obra_id', obraId)
        .limit(10000);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.data as string));
    },
    enabled: !!obraId && open,
    staleTime: 10_000,
  });

  const today = startOfDay(new Date());
  const startBoundary = obraStartDate
    ? new Date(obraStartDate + 'T12:00:00')
    : null;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    setOpen(false);
    navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} className="min-h-[40px] gap-2">
          <Plus className="h-4 w-4" />
          Novo RDO
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Selecione a data do RDO</p>
          <p className="text-xs text-muted-foreground">
            Datas futuras e dias que já possuem RDO estão bloqueados.
          </p>
        </div>
        <Calendar
          mode="single"
          locale={ptBR}
          defaultMonth={today}
          onSelect={handleSelect}
          disabled={(date) => {
            const d = startOfDay(date);
            if (isAfter(d, today)) return true;
            if (startBoundary && d < startOfDay(startBoundary)) return true;
            const key = format(d, 'yyyy-MM-dd');
            if (existingDates.has(key)) return true;
            return false;
          }}
          modifiers={{
            today: today,
          }}
          modifiersClassNames={{
            today: 'ring-2 ring-primary rounded-md',
          }}
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
