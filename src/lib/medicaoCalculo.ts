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
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  data_vistoria?: string | null;
  data_relatorio?: string | null;
}

export interface MarcoCalculado {
  sequencia: number;
  valorAcumulado: number;
  valorMedicao: number;
  percentualAcumulado: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  data_vistoria?: string | null;
  data_relatorio?: string | null;
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

  // Conjunto de itens FOLHA do orçamento (MICROs).
  // IMPORTANTE: a tela de Medição considera apenas itens folha que existem
  // na planilha da obra. Códigos avulsos gravados em `medicao_items` que não
  // existem em `orcamento_items` devem ser ignorados aqui também, para manter
  // paridade com a tela e evitar percentuais acima do real.
  const folhasSet = new Set<string>();
  orcItems.forEach(oi => {
    if (ehItemFolha(oi.item, orcItems)) folhasSet.add(oi.item);
  });
  const ehItemFolhaDaObra = (itemCode: string) => folhasSet.has(itemCode);

  // Valor acumulado global: soma apenas dos itens folha existentes na obra.
  // Cada item é arredondado individualmente antes de somar, para evitar acúmulo de erro de ponto flutuante.
  const valorAcumuladoRaw = medicaoItems.reduce(
    (sum, item) => ehItemFolhaDaObra(item.item_code)
      ? sum + Math.round(Number(item.total || 0) * 100) / 100
      : sum,
    0
  );
  const valorAcumulado = Math.round(valorAcumuladoRaw * 100) / 100;

  // Marcos por sessão: usa total acumulado (igual à lógica da página de medição)
  const sessionsSorted = [...sessions].sort((a, b) => a.sequencia - b.sequencia);

  const marcos: MarcoCalculado[] = sessionsSorted.map((session, idx) => {
    const sessionIdsAteAgora = new Set(sessionsSorted.slice(0, idx + 1).map(s => s.id));

    // valorMedicao: soma apenas itens folha existentes na obra (igual a "Serviços Executados")
    const itemsDaSessao = medicaoItems.filter(i => i.medicao_id === session.id && ehItemFolhaDaObra(i.item_code));
    const valorMedicao = Math.round(
      itemsDaSessao.reduce((sum, item) => sum + Math.round(Number(item.total || 0) * 100) / 100, 0) * 100
    ) / 100;

    // Acumulado até esta sessão: soma apenas itens folha existentes na obra
    const acumuladoAteAgora = Math.round(
      medicaoItems
        .filter(i => sessionIdsAteAgora.has(i.medicao_id) && ehItemFolhaDaObra(i.item_code))
        .reduce((sum, item) => sum + Math.round(Number(item.total || 0) * 100) / 100, 0) * 100
    ) / 100;

    return {
      sequencia: session.sequencia,
      valorMedicao,
      valorAcumulado: acumuladoAteAgora,
      percentualAcumulado: totalContrato > 0 ? (acumuladoAteAgora / totalContrato) * 100 : 0,
    };
  });

  const percentualExecutado = totalContrato > 0
    ? (valorAcumulado / totalContrato) * 100
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
