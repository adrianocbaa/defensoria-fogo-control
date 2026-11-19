/**
 * Regra única de persistência dos lançamentos de uma medição.
 *
 * Lançamentos negativos (estornos/glosas de pagamento indevido em medição
 * anterior) são intencionais e devem ser gravados com seu sinal, para que a
 * soma da medição seja algébrica. Nunca filtrar por `> 0`, nunca usar abs()
 * nem condicionar o total a `totalContrato > 0` (itens suprimidos por aditivo
 * ficam com contrato ajustado zero e o estorno precisa continuar valendo).
 */

export interface LancamentoMedicao {
  qnt?: number | null;
  percentual?: number | null;
  total?: number | null;
}

export interface ItemMedicaoPersistido {
  qtd: number;
  pct: number;
  total: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Converte o lançamento da tela no registro gravado em `medicao_items`.
 * - `total` informado (inclusive negativo ou zero) é preservado como está;
 * - sem total informado, deriva de qtd × contrato ajustado;
 * - `pct` é recalculado sobre o contrato ajustado quando ele é positivo;
 *   para item suprimido (contrato ajustado ≤ 0) mantém o percentual da tela.
 */
export function montarItemPersistido(
  dados: LancamentoMedicao | null | undefined,
  totalContratoAjustado: number,
  quantidadeItem: number,
): ItemMedicaoPersistido {
  const qtd = num(dados?.qnt);
  const tc = num(totalContratoAjustado);
  const totalInformado = dados?.total;
  let total: number;
  if (totalInformado !== undefined && totalInformado !== null && Number.isFinite(Number(totalInformado))) {
    total = Number(totalInformado);
  } else if (qtd !== 0 && tc !== 0) {
    total = (qtd / (num(quantidadeItem) || 1)) * tc;
  } else {
    total = 0;
  }
  const pct = tc > 0 ? (total / tc) * 100 : num(dados?.percentual);
  return { qtd, pct, total };
}

/** Registro sem nenhum efeito (qtd, pct e total zerados). */
export function itemPersistidoVazio(it: ItemMedicaoPersistido): boolean {
  return it.qtd === 0 && it.pct === 0 && it.total === 0;
}

/** Há algum lançamento (positivo OU negativo) na medição? */
export function medicaoTemLancamentos(
  dados: Record<string | number, LancamentoMedicao | undefined> | null | undefined,
): boolean {
  return Object.values(dados || {}).some(
    d => !!d && (num(d.qnt) !== 0 || num(d.percentual) !== 0 || num(d.total) !== 0),
  );
}

/** Lançamento é um estorno/glosa (quantidade ou valor negativo)? */
export function lancamentoEhEstorno(d: LancamentoMedicao | null | undefined): boolean {
  return !!d && (num(d.qnt) < 0 || num(d.total) < 0);
}
