import { supabase } from '@/integrations/supabase/client';

/** Limite máximo de dias de deslocamento por servidor por mês. */
export const TRAVEL_DAYS_LIMIT_PER_MONTH = 10;

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

/** Retorna mapa `monthKey -> nº dias` para o intervalo [ida, volta] inclusivo. */
export function daysPerMonthInInterval(dataIda: string, dataVolta: string): Record<string, number> {
  const start = parseYMD(dataIda);
  const end = parseYMD(dataVolta);
  if (end < start) return {};
  const out: Record<string, number> = {};
  const cur = new Date(start);
  while (cur <= end) {
    const k = monthKey(cur);
    out[k] = (out[k] ?? 0) + 1;
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export interface TravelRow {
  id: string;
  data_ida: string | null;
  data_volta: string | null;
  manager_ids?: string[] | null;
}

/** Soma dias já utilizados por servidor por mês, considerando todas viagens
 *  com datas definidas. Ignora `excludeTravelId` (útil ao editar). */
export function computeUsageByManagerMonth(
  travels: TravelRow[],
  excludeTravelId?: string
): Record<string /*managerId*/, Record<string /*monthKey*/, number>> {
  const usage: Record<string, Record<string, number>> = {};
  for (const t of travels) {
    if (!t.data_ida || !t.data_volta) continue;
    if (excludeTravelId && t.id === excludeTravelId) continue;
    const ids = t.manager_ids ?? [];
    if (ids.length === 0) continue;
    const perMonth = daysPerMonthInInterval(t.data_ida, t.data_volta);
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

/** Busca todas as viagens no(s) mês(es) do intervalo informado e retorna
 *  as violações (>10 dias) que ocorreriam ao inserir/atualizar a viagem. */
export async function checkTravelLimit(params: {
  managerIds: string[];
  managers: { id: string; nome: string }[];
  dataIda: string;
  dataVolta: string;
  excludeTravelId?: string;
}): Promise<LimitViolation[]> {
  const { managerIds, managers, dataIda, dataVolta, excludeTravelId } = params;
  if (managerIds.length === 0 || !dataIda || !dataVolta) return [];

  const added = daysPerMonthInInterval(dataIda, dataVolta);
  const monthsInvolved = Object.keys(added);
  if (monthsInvolved.length === 0) return [];

  // Janela de busca cobre o primeiro dia do mês mais antigo até o último do mais recente.
  const sortedMonths = [...monthsInvolved].sort();
  const [fy, fm] = sortedMonths[0].split('-').map(Number);
  const [ly, lm] = sortedMonths[sortedMonths.length - 1].split('-').map(Number);
  const rangeStart = toYMD(new Date(fy, fm - 1, 1));
  const rangeEnd = toYMD(new Date(ly, lm, 0)); // último dia do mês final

  // Busca viagens que se sobrepõem à janela e que envolvem algum dos servidores.
  const { data, error } = await supabase
    .from('travels')
    .select('id, data_ida, data_volta, manager_ids')
    .overlaps('manager_ids', managerIds)
    .not('data_ida', 'is', null)
    .not('data_volta', 'is', null)
    .lte('data_ida', rangeEnd)
    .gte('data_volta', rangeStart)
    .limit(10000);

  if (error) {
    console.error('Erro ao checar limite de viagens:', error);
    return [];
  }

  const usage = computeUsageByManagerMonth((data ?? []) as TravelRow[], excludeTravelId);
  const violations: LimitViolation[] = [];
  for (const managerId of managerIds) {
    const mgrUsage = usage[managerId] ?? {};
    for (const [k, addDays] of Object.entries(added)) {
      const usedBefore = mgrUsage[k] ?? 0;
      const totalAfter = usedBefore + addDays;
      if (totalAfter > TRAVEL_DAYS_LIMIT_PER_MONTH) {
        violations.push({
          managerId,
          managerName: managers.find((m) => m.id === managerId)?.nome ?? 'Servidor',
          monthKey: k,
          monthLabel: monthLabel(k),
          usedBefore,
          added: addDays,
          totalAfter,
          limit: TRAVEL_DAYS_LIMIT_PER_MONTH,
        });
      }
    }
  }
  return violations;
}
