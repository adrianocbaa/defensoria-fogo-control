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

  // Valor acumulado global: soma direta do campo `total` de cada item de medição
  // (igual à lógica da página de medição — usa o valor em R$ já gravado com desconto)
  // Agrupa por item_code para evitar dupla contagem e aplica cap pelo total_contrato
  const totalAcumuladoPorItem = new Map<string, number>();
  medicaoItems.forEach(item => {
    totalAcumuladoPorItem.set(
      item.item_code,
      (totalAcumuladoPorItem.get(item.item_code) || 0) + Math.round(Number(item.total || 0) * 100) / 100
    );
  });

  let valorAcumulado = 0;
  totalAcumuladoPorItem.forEach((totalAcum, itemCode) => {
    const totalContrato = totalContratoPorItem.get(itemCode);
    // Cap pelo total_contrato para itens contratuais (evita ultrapassar 100%)
    const valorFinal = totalContrato !== undefined && totalContrato > 0
      ? Math.min(totalAcum, totalContrato)
      : totalAcum;
    valorAcumulado += Math.round(valorFinal * 100) / 100;
  });

  // Marcos por sessão: usa total acumulado (igual à lógica da página de medição)
  const sessionsSorted = [...sessions].sort((a, b) => a.sequencia - b.sequencia);

  const marcos: MarcoCalculado[] = sessionsSorted.map((session, idx) => {
    const sessionIdsAteAgora = new Set(sessionsSorted.slice(0, idx + 1).map(s => s.id));
    const sessionIdsAntes = new Set(sessionsSorted.slice(0, idx).map(s => s.id));

    const calcAcumulado = (ids: Set<string>) => {
      const totaisPorItem = new Map<string, number>();
      medicaoItems.filter(i => ids.has(i.medicao_id)).forEach(item => {
        totaisPorItem.set(item.item_code, (totaisPorItem.get(item.item_code) || 0) + Math.round(Number(item.total || 0) * 100) / 100);
      });
      let acum = 0;
      totaisPorItem.forEach((totalAcum, itemCode) => {
        const tc = totalContratoPorItem.get(itemCode);
        acum += Math.round((tc !== undefined && tc > 0 ? Math.min(totalAcum, tc) : totalAcum) * 100) / 100;
      });
      return acum;
    };

    const acumuladoAteAgora = calcAcumulado(sessionIdsAteAgora);
    const acumuladoAntes = calcAcumulado(sessionIdsAntes);
    const valorMedicao = Math.round((acumuladoAteAgora - acumuladoAntes) * 100) / 100;

    return {
      sequencia: session.sequencia,
      valorMedicao,
      valorAcumulado: acumuladoAteAgora,
      percentualAcumulado: totalContrato > 0 ? Math.min((acumuladoAteAgora / totalContrato) * 100, 100) : 0,
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
