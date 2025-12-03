import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay, format, getDay, isBefore, isAfter } from 'date-fns';

const MAX_DIAS_SEM_RDO = 7;

interface RdoRestriction {
  canCreateRdo: boolean;
  daysWithoutRdo: number;
  lastRdoDate: string | null;
  obraStartDate: string | null;
  message: string | null;
}

export function useRdoRestrictions(obraId: string, isContratada: boolean) {
  return useQuery({
    queryKey: ['rdo-restrictions', obraId, isContratada],
    queryFn: async (): Promise<RdoRestriction> => {
      // Buscar data de início da obra
      const { data: obra, error: obraError } = await supabase
        .from('obras')
        .select('data_inicio')
        .eq('id', obraId)
        .single();

      if (obraError || !obra?.data_inicio) {
        return {
          canCreateRdo: true,
          daysWithoutRdo: 0,
          lastRdoDate: null,
          obraStartDate: null,
          message: null,
        };
      }

      // Buscar último RDO com preenchimento (atividades ou status diferente de rascunho)
      const { data: lastRdo, error: rdoError } = await supabase
        .from('rdo_reports')
        .select('data, status')
        .eq('obra_id', obraId)
        .or('status.neq.rascunho')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar dias sem expediente
      const { data: diasSemExpediente } = await supabase
        .from('rdo_dias_sem_expediente')
        .select('data')
        .eq('obra_id', obraId);

      const diasSemExpedienteSet = new Set(diasSemExpediente?.map(d => d.data) || []);

      const today = startOfDay(new Date());
      const obraStartDate = parseISO(obra.data_inicio);
      
      // Se a obra não iniciou ainda, pode criar RDO
      if (obraStartDate > today) {
        return {
          canCreateRdo: true,
          daysWithoutRdo: 0,
          lastRdoDate: null,
          obraStartDate: obra.data_inicio,
          message: null,
        };
      }

      // Calcular último dia de referência (último RDO ou início da obra)
      const lastReferenceDate = lastRdo?.data 
        ? parseISO(lastRdo.data) 
        : obraStartDate;

      // Calcular dias sem RDO excluindo fins de semana marcados como sem expediente
      const countWorkingDaysWithoutRdo = (): number => {
        let count = 0;
        let current = startOfDay(lastReferenceDate);
        while (isBefore(current, today)) {
          current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
          const dateStr = format(current, 'yyyy-MM-dd');
          const dayOfWeek = getDay(current);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isMarkedOff = diasSemExpedienteSet.has(dateStr);
          
          // Não contar fins de semana que foram marcados como sem expediente
          if (!isWeekend || (isWeekend && !isMarkedOff)) {
            if (!isAfter(current, today)) {
              count++;
            }
          }
        }
        return count;
      };

      const daysWithoutRdo = countWorkingDaysWithoutRdo();

      // Se for contratada, aplicar restrição de 7 dias
      if (isContratada && daysWithoutRdo > MAX_DIAS_SEM_RDO) {
        return {
          canCreateRdo: false,
          daysWithoutRdo,
          lastRdoDate: lastRdo?.data || null,
          obraStartDate: obra.data_inicio,
          message: `Limite de ${MAX_DIAS_SEM_RDO} dias sem preenchimento excedido. Último preenchimento: ${lastRdo?.data ? new Date(lastRdo.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data de início da obra'}. Contate o fiscal para regularizar.`,
        };
      }

      return {
        canCreateRdo: true,
        daysWithoutRdo,
        lastRdoDate: lastRdo?.data || null,
        obraStartDate: obra.data_inicio,
        message: daysWithoutRdo > 3 
          ? `Atenção: ${daysWithoutRdo} dias sem preenchimento de RDO`
          : null,
      };
    },
    enabled: !!obraId,
    staleTime: 30000,
  });
}

// Função para verificar se uma data específica pode ter RDO criado
export function canCreateRdoForDate(
  targetDate: Date,
  obraStartDate: Date | null,
  lastFilledRdoDate: Date | null,
  isContratada: boolean
): { allowed: boolean; reason?: string } {
  if (!obraStartDate) {
    return { allowed: true };
  }

  const today = startOfDay(new Date());
  const target = startOfDay(targetDate);
  
  // Não pode criar RDO para datas futuras
  if (target > today) {
    return { allowed: false, reason: 'Não é possível criar RDO para datas futuras' };
  }

  // Não pode criar RDO antes do início da obra
  if (target < startOfDay(obraStartDate)) {
    return { allowed: false, reason: 'Data anterior ao início da obra' };
  }

  // Para contratada, verificar limite de 7 dias
  if (isContratada) {
    const referenceDate = lastFilledRdoDate 
      ? startOfDay(lastFilledRdoDate)
      : startOfDay(obraStartDate);
    
    const daysSinceReference = differenceInDays(target, referenceDate);
    
    if (daysSinceReference > MAX_DIAS_SEM_RDO) {
      return { 
        allowed: false, 
        reason: `Limite de ${MAX_DIAS_SEM_RDO} dias consecutivos sem preenchimento excedido` 
      };
    }
  }

  return { allowed: true };
}
