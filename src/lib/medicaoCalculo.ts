/**
 * Utilitário centralizado de cálculo financeiro de medições.
 * Fonte única de verdade para: valor acumulado, total do contrato, marcos e progresso.
 * Usado por: useMedicoesFinanceiro, AdminObras, ObraDetails e qualquer outro consumidor.
 */

export interface OrcamentoItemFinanceiro {
  item: string;
  total_contrato: number;
  origem?: string;
}

export interface MedicaoItemCalculo {
  item_code: string;
  pct: number;
  total: number;
  medicao_id: string;
}

export interface AditivoItemCalculo {
  total: number;
}

export interface MedicaoSessionCalculo {
  id: string;
  sequencia: number;
}

export interface MarcoCalculado {
  sequencia: number;
  valorAcumulado: number;
  valorMedicao: number;
  percentualAcumulado: number;
}

export interface ResultadoCalculoFinanceiro {
  totalContratoOrcamento: number;  // soma dos itens folha do orçamento
  totalAditivo: number;            // soma dos aditivos bloqueados
  totalContrato: number;           // totalContratoOrcamento + totalAditivo
  valorAcumulado: number;          // soma das medições com lógica pct × total_contrato
  percentualExecutado: number;     // valorAcumulado / totalContrato × 100
  marcos: MarcoCalculado[];
}

/** Verifica se um item do orçamento é folha (não tem filhos) */
export function ehItemFolha(itemCode: string, todosItems: OrcamentoItemFinanceiro[]): boolean {
  const prefix = itemCode + '.';
  return !todosItems.some(other => other.item.startsWith(prefix));
}

/** Monta mapa item_code → total_contrato apenas para itens folha com valor > 0 */
export function buildTotalContratoPorItem(
  orcItems: OrcamentoItemFinanceiro[]
): Map<string, number> {
  const map = new Map<string, number>();
  orcItems.forEach(oi => {
    if (ehItemFolha(oi.item, orcItems) && Number(oi.total_contrato || 0) > 0) {
      map.set(oi.item, Number(oi.total_contrato));
    }
  });
  return map;
}

/**
 * Calcula o valor financeiro de um item de medição.
 * - Itens contratuais (com total_contrato > 0): pct × total_contrato
 * - Itens extracontratuais (sem total_contrato): usa o campo total diretamente
 */
export function calcularValorItemMedicao(
  item: { item_code: string; pct: number; total: number },
  totalContratoPorItem: Map<string, number>
): number {
  const totalContrato = totalContratoPorItem.get(item.item_code);
  if (totalContrato !== undefined && totalContrato > 0) {
    return Math.round((item.pct / 100) * totalContrato * 100) / 100;
  }
  return Math.round((item.total || 0) * 100) / 100;
}

/** Cálculo completo do financeiro de medições de uma obra */
export function calcularFinanceiroMedicao(
  orcItems: OrcamentoItemFinanceiro[],
  aditivoItems: AditivoItemCalculo[],
  sessions: MedicaoSessionCalculo[],
  medicaoItems: MedicaoItemCalculo[],
  obraValorTotal: number,
  obraValorAditivado: number
): ResultadoCalculoFinanceiro {
  // Total do orçamento (itens folha)
  const totalContratoOrcamento = orcItems.reduce((sum, item) => {
    if (ehItemFolha(item.item, orcItems)) {
      return sum + Number(item.total_contrato || 0);
    }
    return sum;
  }, 0);

  const temPlanilha = totalContratoOrcamento > 0;

  // Total de aditivos bloqueados
  const totalAditivo = aditivoItems.reduce((sum, item) => sum + Number(item.total || 0), 0);

  // Total do contrato
  const totalContrato = temPlanilha
    ? totalContratoOrcamento + totalAditivo
    : obraValorTotal + obraValorAditivado;

  // Mapa para cálculo dos itens
  const totalContratoPorItem = buildTotalContratoPorItem(orcItems);

  // Agrupa pct acumulado por item_code (soma dos pcts de todas as medições, limitado a 100%)
  // e valor total para itens extracontratuais
  const pctAcumuladoPorItem = new Map<string, number>();
  const totalExtracontratualPorItem = new Map<string, number>();
  medicaoItems.forEach(item => {
    const totalContrato = totalContratoPorItem.get(item.item_code);
    if (totalContrato !== undefined && totalContrato > 0) {
      // Item contratual: acumula pct
      pctAcumuladoPorItem.set(item.item_code, (pctAcumuladoPorItem.get(item.item_code) || 0) + Number(item.pct));
    } else {
      // Item extracontratual: acumula total diretamente
      totalExtracontratualPorItem.set(item.item_code, (totalExtracontratualPorItem.get(item.item_code) || 0) + Math.round(Number(item.total || 0) * 100) / 100);
    }
  });

  // Valor acumulado global: soma de cada item com cap de 100% para contratuais
  let valorAcumulado = 0;
  pctAcumuladoPorItem.forEach((pctTotal, itemCode) => {
    const totalContrato = totalContratoPorItem.get(itemCode)!;
    const pctCapped = Math.min(pctTotal, 100);
    valorAcumulado += Math.round((pctCapped / 100) * totalContrato * 100) / 100;
  });
  totalExtracontratualPorItem.forEach(total => {
    valorAcumulado += total;
  });

  // Marcos por sessão: incremento de cada medição individualmente (sem cap por item para mostrar o incremento real)
  const valorPorSessao: Record<string, number> = {};
  medicaoItems.forEach(item => {
    valorPorSessao[item.medicao_id] =
      (valorPorSessao[item.medicao_id] || 0) + calcularValorItemMedicao(item, totalContratoPorItem);
  });

  const sessionsSorted = [...sessions].sort((a, b) => a.sequencia - b.sequencia);
  let acumulado = 0;
  const marcos: MarcoCalculado[] = sessionsSorted.map(session => {
    const valorMedicao = valorPorSessao[session.id] || 0;
    acumulado += valorMedicao;
    return {
      sequencia: session.sequencia,
      valorMedicao,
      valorAcumulado: acumulado,
      percentualAcumulado: totalContrato > 0 ? Math.min((acumulado / totalContrato) * 100, 100) : 0,
    };
  });

  const percentualExecutado = totalContrato > 0
    ? Math.min((valorAcumulado / totalContrato) * 100, 100)
    : 0;

  return {
    totalContratoOrcamento: temPlanilha ? totalContratoOrcamento : obraValorTotal,
    totalAditivo: temPlanilha ? totalAditivo : obraValorAditivado,
    totalContrato,
    valorAcumulado,
    percentualExecutado,
    marcos,
  };
}
