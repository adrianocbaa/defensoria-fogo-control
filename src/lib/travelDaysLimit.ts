import { supabase } from '@/integrations/supabase/client';

/** Limite máximo de **diárias** por servidor por mês. */
export const TRAVEL_DAYS_LIMIT_PER_MONTH = 10;

/** Opções permitidas de diárias no formulário (0.5 em 0.5, até 20). */
export const DIARIAS_OPTIONS: number[] = Array.from({ length: 40 }, (_, i) => (i + 1) * 0.5);

/** Parse manual de YYYY-MM-DD para evitar problemas de timezone (UTC). */
function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[(m ?? 1) - 1]}/${y}`;
}

/** Converte a qtd. de diárias no nº de dias a somar à data de ida para
 *  obter a data de volta.
 *  Regra: 0,5 → mesmo dia (0); 1,0 → +1; 1,5 → +1; 2,0 → +2; 2,5 → +2; ... */
export function diariasToReturnOffsetDays(diarias: number): number {
  if (!diarias || diarias < 0.5) return 0;
  return Math.ceil(diarias - 0.5);
}

/** Retorna a data de volta (YYYY-MM-DD) calculada a partir da ida + diárias. */
export function computeReturnDate(dataIda: string, diarias: number): string {
  const start = parseYMD(dataIda);
  const off = diariasToReturnOffsetDays(diarias);
  const end = new Date(start);
  end.setDate(end.getDate() + off);
  return toYMD(end);
}

/** Texto de apoio para o formulário (regra de horário de retorno). */
export function diariasHint(diarias: number): string {
  if (!diarias || diarias < 0.5) return '';
  const isMeia = Math.abs(diarias - Math.floor(diarias) - 0.5) < 1e-6;
  const returnDayOffset = diariasToReturnOffsetDays(diarias);
  const dia = returnDayOffset === 0 ? 'no mesmo dia' : returnDayOffset === 1 ? 'no dia seguinte' : `${returnDayOffset} dias após a ida`;
  const hora = isMeia ? 'até 18:00' : 'até 12:00';
  return `Retorno ${dia} ${hora}.`;
}

/** Rateia as diárias por mês proporcionalmente aos dias do intervalo ida→volta.
 *  Se a viagem ocorre em um único mês (caso comum), o valor cai inteiro nesse mês.
 *  Para viagens que cruzam o mês, distribui na proporção de dias em cada mês. */
export function diariasPerMonthInInterval(dataIda: string, diarias: number): Record<string, number> {
  if (!diarias || diarias < 0.5) return {};
  const start = parseYMD(dataIda);
  const off = diariasToReturnOffsetDays(diarias);
  const end = new Date(start);
  end.setDate(end.getDate() + off);
  const daysByMonth: Record<string, number> = {};
  const cur = new Date(start);
  let totalDays = 0;
  while (cur <= end) {
    const k = monthKey(cur);
    daysByMonth[k] = (daysByMonth[k] ?? 0) + 1;
    totalDays++;
    cur.setDate(cur.getDate() + 1);
  }
  const out: Record<string, number> = {};
  const keys = Object.keys(daysByMonth);
  if (keys.length === 1) {
    out[keys[0]] = diarias;
    return out;
  }
  // Rateio proporcional (arredondado em 0.5) — mantém o total.
  let accumulated = 0;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = Math.round((diarias - accumulated) * 2) / 2;
    } else {
      const v = Math.round(((diarias * daysByMonth[k]) / totalDays) * 2) / 2;
      out[k] = v;
      accumulated += v;
    }
  });
  return out;
}

export interface TravelRow {
  id: string;
  data_ida: string | null;
  data_volta: string | null;
  manager_ids?: string[] | null;
  diarias?: number | null;
}

/** Soma diárias já utilizadas por servidor por mês. Quando a viagem tem
 *  `diarias` preenchido usa esse valor; senão, cai no antigo conta-dias. */
export function computeUsageByManagerMonth(
  travels: TravelRow[],
  excludeTravelId?: string
): Record<string /*managerId*/, Record<string /*monthKey*/, number>> {
  const usage: Record<string, Record<string, number>> = {};
  for (const t of travels) {
    if (excludeTravelId && t.id === excludeTravelId) continue;
    const ids = t.manager_ids ?? [];
    if (ids.length === 0) continue;
    let perMonth: Record<string, number> = {};
    if (t.diarias && t.data_ida) {
      perMonth = diariasPerMonthInInterval(t.data_ida, Number(t.diarias));
    } else if (t.data_ida && t.data_volta) {
      // Legado: conta 1 diária por dia corrido (aproximação para não perder histórico).
      const start = parseYMD(t.data_ida);
      const end = parseYMD(t.data_volta);
      const cur = new Date(start);
      while (cur <= end) {
        const k = monthKey(cur);
        perMonth[k] = (perMonth[k] ?? 0) + 1;
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      continue;
    }
    for (const managerId of ids) {
      if (!usage[managerId]) usage[managerId] = {};
      for (const [k, n] of Object.entries(perMonth)) {
        usage[managerId][k] = (usage[managerId][k] ?? 0) + n;
      }
    }
  }
  return usage;
}

export interface LimitViolation {
  managerId: string;
  managerName: string;
  monthKey: string;
  monthLabel: string;
  usedBefore: number;
  added: number;
  totalAfter: number;
  limit: number;
}

/** Verifica se a nova viagem faria algum servidor ultrapassar o limite mensal
 *  de diárias. Aceita `diarias` (novo) OU `dataVolta` (legado). */
export async function checkTravelLimit(params: {
  managerIds: string[];
  managers: { id: string; nome: string }[];
  dataIda: string;
  /** Nova entrada: qtd de diárias solicitadas. */
  diarias?: number;
  /** Compat: caminho antigo (calcula dias corridos entre ida e volta). */
  dataVolta?: string;
  excludeTravelId?: string;
}): Promise<LimitViolation[]> {
  const { managerIds, managers, dataIda, diarias, dataVolta, excludeTravelId } = params;
  if (managerIds.length === 0 || !dataIda) return [];

  let added: Record<string, number> = {};
  if (diarias && diarias > 0) {
    added = diariasPerMonthInInterval(dataIda, diarias);
  } else if (dataVolta) {
    // Fallback legado: 1 por dia corrido.
    const start = parseYMD(dataIda);
    const end = parseYMD(dataVolta);
    const cur = new Date(start);
    while (cur <= end) {
      const k = monthKey(cur);
      added[k] = (added[k] ?? 0) + 1;
      cur.setDate(cur.getDate() + 1);
    }
  }
  const monthsInvolved = Object.keys(added);
  if (monthsInvolved.length === 0) return [];

  const sortedMonths = [...monthsInvolved].sort();
  const [fy, fm] = sortedMonths[0].split('-').map(Number);
  const [ly, lm] = sortedMonths[sortedMonths.length - 1].split('-').map(Number);
  const rangeStart = toYMD(new Date(fy, fm - 1, 1));
  const rangeEnd = toYMD(new Date(ly, lm, 0));

  const { data, error } = await supabase
    .from('travels')
    .select('id, data_ida, data_volta, manager_ids, diarias')
    .overlaps('manager_ids', managerIds)
    .not('data_ida', 'is', null)
    .lte('data_ida', rangeEnd)
    .gte('data_ida', rangeStart)
    .limit(10000);

  if (error) {
    console.error('Erro ao checar limite de viagens:', error);
    return [];
  }

  const usage = computeUsageByManagerMonth((data ?? []) as TravelRow[], excludeTravelId);
  const violations: LimitViolation[] = [];
  for (const managerId of managerIds) {
    const mgrUsage = usage[managerId] ?? {};
    for (const [k, addQty] of Object.entries(added)) {
      const usedBefore = mgrUsage[k] ?? 0;
      const totalAfter = Math.round((usedBefore + addQty) * 10) / 10;
      if (totalAfter > TRAVEL_DAYS_LIMIT_PER_MONTH) {
        violations.push({
          managerId,
          managerName: managers.find((m) => m.id === managerId)?.nome ?? 'Servidor',
          monthKey: k,
          monthLabel: monthLabel(k),
          usedBefore,
          added: addQty,
          totalAfter,
          limit: TRAVEL_DAYS_LIMIT_PER_MONTH,
        });
      }
    }
  }
  return violations;
}
