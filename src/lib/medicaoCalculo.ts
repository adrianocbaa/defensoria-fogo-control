/**
 * Utilitário centralizado de cálculo financeiro de medições.
 * Fonte única de verdade para: valor acumulado, total do contrato, marcos e progresso.
 * Usado por: useMedicoesFinanceiro, AdminObras, ObraDetails e qualquer outro consumidor.
 */

export interface OrcamentoItemFinanceiro {
  item: string;
  total_contrato: number;
  origem?: string;
  eh_administracao_local?: boolean | null;
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
  status?: string | null;
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
  const folhasAdminLocalSet = new Set<string>();
  orcItems.forEach(oi => {
    if (ehItemFolha(oi.item, orcItems)) {
      folhasSet.add(oi.item);
      if (oi.eh_administracao_local) folhasAdminLocalSet.add(oi.item);
    }
  });
  const ehItemFolhaDaObra = (itemCode: string) => folhasSet.has(itemCode);
  const ehFolhaAL = (itemCode: string) => folhasAdminLocalSet.has(itemCode);
  const ehFolhaNonAL = (itemCode: string) => folhasSet.has(itemCode) && !folhasAdminLocalSet.has(itemCode);

  // Total contratado de Administração Local (folhas marcadas como AL)
  const totalContratoAL = orcItems.reduce((sum, oi) => {
    return ehFolhaAL(oi.item) ? sum + Number(oi.total_contrato || 0) : sum;
  }, 0);
  // Base não-AL do contrato para distribuir a AL proporcionalmente
  const totalContratoNonAL = Math.max(0, totalContratoOrcamento - totalContratoAL);

  // Soma serviços executados (não-AL) por sessão — usados como base do %
  const sessionsSorted = [...sessions].sort((a, b) => a.sequencia - b.sequencia);

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Tolerância de fechamento GLOBAL: quando o valor executado total já está
  // praticamente igual ao contrato pós-aditivo (>= 99.9%), encosta no
  // contrato para eliminar sobras de centavos por arredondamento de
  // quantidade/preço unitário lançados pelo usuário. Aplicada por sessão.
  const PCT_FECHAMENTO_TOLERANCIA = 0.999;

  // Soma não-AL acumulada usando o valor REAL registrado em medicao_items.total
  // (fonte da verdade — calculado a partir de qtd × preço unitário vigente
  // naquela medição). NÃO recalculamos a partir de pct, porque o pct é
  // relativo à quantidade vigente na época da medição: quando um item
  // recebe aditivo, o pct deixa de bater com o total_contrato atual.
  // Para extracontratuais (sem item no orçamento), também usa mi.total.
  const sumNonALAteSessions = (sessionIds: Set<string>) => {
    let soma = 0;
    medicaoItems.forEach(i => {
      if (!sessionIds.has(i.medicao_id)) return;
      if (ehFolhaNonAL(i.item_code) || !totalContratoPorItem.has(i.item_code)) {
        // ehFolhaNonAL cobre itens da planilha não-AL;
        // a 2ª condição garante inclusão de extracontratuais (que não estão
        // em folhasSet) — mas estes não devem ser AL nem ter contrato.
        if (ehFolhaNonAL(i.item_code) || (!folhasSet.has(i.item_code))) {
          soma += Number(i.total || 0);
        }
      }
    });
    return soma;
  };

  // Soma TOTAL (todos os itens, AL + não-AL + extracontratuais) de uma sessão.
  // Usado para medições BLOQUEADAS: o valor já está congelado em medicao_items
  // (qtd/pct/total_congelado) e representa exatamente o que foi pago — não pode
  // ser recalculado quando aditivos futuros alteram a base do contrato.
  const sumTotalSessao = (sessionId: string) => {
    let soma = 0;
    medicaoItems.forEach(i => {
      if (i.medicao_id === sessionId) soma += Number(i.total || 0);
    });
    return soma;
  };

  // Soma acumulada congelada das sessões bloqueadas até (e incluindo) idx.
  const sumCongeladoAteIdx = (idx: number) => {
    let soma = 0;
    for (let k = 0; k <= idx; k++) {
      const s = sessionsSorted[k];
      if (s.status === 'bloqueada') soma += sumTotalSessao(s.id);
    }
    return soma;
  };

  // Total não-AL já consumido por sessões bloqueadas (não entra na distribuição
  // dinâmica de AL das sessões abertas — essas sessões trabalham apenas com o
  // saldo remanescente do contrato).
  const blockedSessionIds = new Set(sessionsSorted.filter(s => s.status === 'bloqueada').map(s => s.id));
  const nonALBlockedConsumido = (() => {
    let soma = 0;
    medicaoItems.forEach(i => {
      if (!blockedSessionIds.has(i.medicao_id)) return;
      if (ehFolhaNonAL(i.item_code) || !folhasSet.has(i.item_code)) {
        soma += Number(i.total || 0);
      }
    });
    return soma;
  })();
  const totalContratoNonALRemanescente = Math.max(0, totalContratoNonAL - nonALBlockedConsumido);
  const totalCongeladoBlocked = sessionsSorted
    .filter(s => s.status === 'bloqueada')
    .reduce((acc, s) => acc + sumTotalSessao(s.id), 0);
  const totalContratoALRemanescente = Math.max(0, totalContratoAL - Math.max(0, totalCongeladoBlocked - nonALBlockedConsumido));

  let acumuladoAnterior = 0;
  const marcos: MarcoCalculado[] = sessionsSorted.map((session, idx) => {
    let acumuladoAteAgora: number;

    if (session.status === 'bloqueada') {
      // Medição já fechada/paga: usa o congelado direto (imune a aditivos futuros).
      acumuladoAteAgora = round2(sumCongeladoAteIdx(idx));
    } else {
      // Medição aberta: distribui AL proporcionalmente sobre o saldo remanescente
      // do contrato (descontando o que já foi pago em medições bloqueadas).
      const openSessionIdsAteAgora = new Set(
        sessionsSorted.slice(0, idx + 1).filter(s => s.status !== 'bloqueada').map(s => s.id)
      );
      let nonALOpenAcum = 0;
      medicaoItems.forEach(i => {
        if (!openSessionIdsAteAgora.has(i.medicao_id)) return;
        if (ehFolhaNonAL(i.item_code) || !folhasSet.has(i.item_code)) {
          nonALOpenAcum += Number(i.total || 0);
        }
      });
      const pctOpen = totalContratoNonALRemanescente > 0
        ? Math.min(nonALOpenAcum / totalContratoNonALRemanescente, 1)
        : 0;
      const alOpenAcum = pctOpen >= 1 ? totalContratoALRemanescente : pctOpen * totalContratoALRemanescente;
      let acumuladoBruto = totalCongeladoBlocked + nonALOpenAcum + alOpenAcum;
      if (totalContrato > 0 && acumuladoBruto >= totalContrato * PCT_FECHAMENTO_TOLERANCIA) {
        acumuladoBruto = totalContrato;
      }
      acumuladoAteAgora = totalContrato > 0
        ? round2(Math.min(acumuladoBruto, totalContrato))
        : round2(acumuladoBruto);
    }

    const valorMedicao = round2(acumuladoAteAgora - acumuladoAnterior);
    acumuladoAnterior = acumuladoAteAgora;

    return {
      sequencia: session.sequencia,
      valorMedicao,
      valorAcumulado: acumuladoAteAgora,
      percentualAcumulado: totalContrato > 0 ? (acumuladoAteAgora / totalContrato) * 100 : 0,
      periodo_inicio: session.periodo_inicio ?? null,
      periodo_fim: session.periodo_fim ?? null,
      data_vistoria: session.data_vistoria ?? null,
      data_relatorio: session.data_relatorio ?? null,
    };
  });

  // Valor acumulado global = último acumulado calculado
  const valorAcumulado = marcos.length > 0
    ? marcos[marcos.length - 1].valorAcumulado
    : 0;

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
