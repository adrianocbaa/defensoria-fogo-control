/**
 * Helper para resolver valores efetivos de itens de medição.
 *
 * Regra: quando uma medição é bloqueada, os valores são "congelados" em colunas
 * dedicadas (`qtd_congelado`, `pct_congelado`, `total_congelado`). A partir desse
 * momento, esses valores são a fonte da verdade — imune a mudanças futuras de
 * fórmula, regra de arredondamento ou ajuste de orçamento.
 *
 * Esta função aplica essa regra de forma uniforme em todos os consumidores.
 */
export interface MedicaoItemRow {
  qtd?: number | null;
  pct?: number | null;
  total?: number | null;
  qtd_congelado?: number | null;
  pct_congelado?: number | null;
  total_congelado?: number | null;
  // demais campos do row são preservados
  [key: string]: any;
}

/**
 * Retorna o item com `qtd`, `pct` e `total` substituídos pelos valores
 * congelados quando disponíveis. Preserva todos os outros campos.
 */
export function resolveItemEfetivo<T extends MedicaoItemRow>(item: T): T {
  if (item.total_congelado != null) {
    return {
      ...item,
      qtd: item.qtd_congelado ?? item.qtd,
      pct: item.pct_congelado ?? item.pct,
      total: item.total_congelado,
    };
  }
  return item;
}

/** Aplica `resolveItemEfetivo` em um array de itens. */
export function resolveItensEfetivos<T extends MedicaoItemRow>(items: T[]): T[] {
  return items.map(resolveItemEfetivo);
}

/** Lista de colunas extra a incluir nos SELECTs de `medicao_items`. */
export const MEDICAO_SNAPSHOT_COLUMNS = 'qtd_congelado, pct_congelado, total_congelado';
