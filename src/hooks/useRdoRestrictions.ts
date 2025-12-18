import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay, getDay, isBefore, isAfter, format } from 'date-fns';

const MAX_DIAS_SEM_RDO = 7;

interface RdoRestriction {
  canCreateRdo: boolean;
  daysWithoutRdo: number;
  lastRdoDate: string | null;
  obraStartDate: string | null;
  message: string | null;
  rdoHabilitado: boolean;
}

export function useRdoRestrictions(obraId: string, isContratada: boolean) {
  return useQuery({
    queryKey: ['rdo-restrictions', obraId, isContratada],
    queryFn: async (): Promise<RdoRestriction> => {
      // Buscar data de início da obra e flag rdo_habilitado
      const { data: obra, error: obraError } = await supabase
        .from('obras')
        .select('data_inicio, rdo_habilitado')
        .eq('id', obraId)
        .single();

      if (obraError || !obra?.data_inicio) {
        return {
          canCreateRdo: true,
          daysWithoutRdo: 0,
          lastRdoDate: null,
          obraStartDate: null,
          message: null,
          rdoHabilitado: obra?.rdo_habilitado ?? true,
        };
      }

      // Se RDO não está habilitado, não contabiliza atraso
      if (!obra.rdo_habilitado) {
        return {
          canCreateRdo: true,
          daysWithoutRdo: 0,
          lastRdoDate: null,
          obraStartDate: obra.data_inicio,
          message: null,
          rdoHabilitado: false,
        };
      }

      // Buscar TODOS os RDOs da obra para encontrar o primeiro gap
      const { data: allRdos, error: rdoError } = await supabase
        .from('rdo_reports')
        .select('data')
        .eq('obra_id', obraId)
        .order('data', { ascending: true });

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
          rdoHabilitado: true,
        };
      }

      // Criar set de datas com RDO para busca rápida
      const rdoDates = new Set<string>();
      if (allRdos) {
        allRdos.forEach(rdo => rdoDates.add(rdo.data));
      }

      // Encontrar o PRIMEIRO dia útil sem RDO na sequência (a partir do início da obra)
      const findFirstMissingWorkday = (): Date | null => {
        let current = startOfDay(obraStartDate);
        
        while (!isAfter(current, today)) {
          const dayOfWeek = getDay(current);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          // Usar format para evitar problema de timezone com toISOString
          const dateStr = format(current, 'yyyy-MM-dd');
          
          // Se é dia útil e não tem RDO, encontramos o primeiro gap
          if (!isWeekend && !rdoDates.has(dateStr)) {
            return current;
          }
          
          current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        }
        
        return null; // Todos os dias úteis têm RDO
      };

      const firstMissingDay = findFirstMissingWorkday();
      
      // Se não há gap, está tudo preenchido
      if (!firstMissingDay) {
        return {
          canCreateRdo: true,
          daysWithoutRdo: 0,
          lastRdoDate: allRdos && allRdos.length > 0 ? allRdos[allRdos.length - 1].data : null,
          obraStartDate: obra.data_inicio,
          message: null,
          rdoHabilitado: true,
        };
      }

      // Calcular dias úteis desde o primeiro dia sem RDO até hoje
      const countWorkingDaysSince = (fromDate: Date): number => {
        let count = 0;
        let current = startOfDay(fromDate);
        
        while (!isAfter(current, today)) {
          const dayOfWeek = getDay(current);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (!isWeekend) {
            count++;
          }
          
          current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
        }
        
        return count;
      };

      const daysWithoutRdo = countWorkingDaysSince(firstMissingDay);

      const firstMissingDateStr = format(firstMissingDay, 'yyyy-MM-dd');

      // Se for contratada, aplicar restrição de 7 dias
      if (isContratada && daysWithoutRdo > MAX_DIAS_SEM_RDO) {
        return {
          canCreateRdo: false,
          daysWithoutRdo,
          lastRdoDate: firstMissingDateStr,
          obraStartDate: obra.data_inicio,
          message: `Limite de ${MAX_DIAS_SEM_RDO} dias sem preenchimento excedido. Primeiro dia sem RDO: ${new Date(firstMissingDateStr + 'T12:00:00').toLocaleDateString('pt-BR')}. Contate o fiscal para regularizar.`,
          rdoHabilitado: true,
        };
      }

      return {
        canCreateRdo: true,
        daysWithoutRdo,
        lastRdoDate: allRdos && allRdos.length > 0 ? allRdos[allRdos.length - 1].data : null,
        obraStartDate: obra.data_inicio,
        message: daysWithoutRdo > 3 
          ? `Atenção: ${daysWithoutRdo} dias sem preenchimento de RDO (desde ${new Date(firstMissingDateStr + 'T12:00:00').toLocaleDateString('pt-BR')})`
          : null,
        rdoHabilitado: true,
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
