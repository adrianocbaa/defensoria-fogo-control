/**
 * Utilitário único de precisão monetária do SiDIF.
 *
 * Regra central: o sistema guarda o VALOR UNITÁRIO BRUTO (como vem da planilha,
 * sem desconto) e aplica o desconto contratual sempre por estas funções.
 * Assim, contrato, aditivo e medição partem exatamente da mesma base e o mesmo
 * item nunca "desbate" por centavos.
 */

const EPS = 1e-9;

/** Trunca em 2 casas (equivalente ao TRUNCAR do Excel), com aritmética em centavos. */
export function truncar2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  // O + EPS * sinal compensa erro binário do tipo 19.759999999999998
  const centavos = valor * 100;
  const ajustado = centavos >= 0 ? centavos + EPS : centavos - EPS;
  return Math.trunc(ajustado) / 100;
}

/** Arredonda em 2 casas com aritmética em centavos. */
export function arredondar2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const centavos = valor * 100;
  return (centavos >= 0 ? Math.round(centavos + EPS) : -Math.round(-centavos + EPS)) / 100;
}

/**
 * Valor unitário líquido (com desconto aplicado), SEM truncamento.
 * O truncamento acontece só no total do item.
 */
export function unitarioLiquido(unitarioBruto: number, pctDesconto: number): number {
  const bruto = Number(unitarioBruto) || 0;
  const pct = Number(pctDesconto) || 0;
  if (pct <= 0) return bruto;
  return bruto * (1 - pct / 100);
}

/**
 * Total do item, exatamente como a planilha orçamentária calcula:
 * 1) total bruto  = TRUNCAR(quantidade × unitário bruto; 2)
 * 2) total líquido = TRUNCAR(total bruto × (1 - desconto); 2)
 */
export function totalItem(
  quantidade: number,
  unitarioBruto: number,
  pctDesconto: number
): number {
  const qtd = Number(quantidade) || 0;
  const bruto = truncar2(qtd * (Number(unitarioBruto) || 0));
  return totalComDesconto(bruto, pctDesconto);
}


/** Aplica desconto sobre um total bruto e trunca em 2 casas. */
export function totalComDesconto(totalBruto: number, pctDesconto: number): number {
  const pct = Number(pctDesconto) || 0;
  const bruto = Number(totalBruto) || 0;
  if (pct <= 0) return truncar2(bruto);
  return truncar2(bruto * (1 - pct / 100));
}

/**
 * Deriva o unitário bruto a partir de um total bruto e quantidade.
 * Usado apenas como fallback para dados legados que não têm unitário bruto salvo.
 */
export function derivarUnitarioBruto(totalBruto: number, quantidade: number): number {
  const qtd = Number(quantidade) || 0;
  if (Math.abs(qtd) < 1e-12) return 0;
  return (Number(totalBruto) || 0) / qtd;
}
