/**
 * Tabela parametrizada de condutores verticais — NBR 10844:1989
 * (valores baseados no ábaco/Figura 4 da norma — saída em aresta viva, H = L).
 * O usuário pode editar a tabela; a interpolação entre pontos é linear em log–log
 * (Q ∝ D^(8/3)), o que é coerente com o comportamento da norma.
 */

export interface FaixaCondutor {
  /** Diâmetro nominal (mm) */
  diametro_mm: number;
  /** Capacidade em L/min (saída em aresta viva — referência) */
  vazao_Lmin: number;
}

/** Faixas padrão extraídas do ábaco da NBR 10844 (saída em aresta viva). */
export const FAIXAS_CONDUTOR_PADRAO: FaixaCondutor[] = [
  { diametro_mm: 50, vazao_Lmin: 87 },
  { diametro_mm: 75, vazao_Lmin: 222 },
  { diametro_mm: 100, vazao_Lmin: 472 },
  { diametro_mm: 125, vazao_Lmin: 851 },
  { diametro_mm: 150, vazao_Lmin: 1306 },
  { diametro_mm: 200, vazao_Lmin: 2790 },
];

/** Ordena por diâmetro crescente. */
export function ordenarFaixas(faixas: FaixaCondutor[]): FaixaCondutor[] {
  return [...faixas].sort((a, b) => a.diametro_mm - b.diametro_mm);
}

/**
 * Interpola o diâmetro mínimo necessário para uma vazão Q (L/min),
 * usando interpolação linear em log–log entre faixas cadastradas.
 * Retorna null se Q estiver fora da tabela (extrapolação não realizada).
 */
export function diametroMinimo(faixas: FaixaCondutor[], Q: number): number | null {
  const f = ordenarFaixas(faixas);
  if (!f.length || Q <= 0) return null;
  if (Q <= f[0].vazao_Lmin) return f[0].diametro_mm;
  if (Q > f[f.length - 1].vazao_Lmin) return null;
  for (let i = 1; i < f.length; i++) {
    const a = f[i - 1];
    const b = f[i];
    if (Q <= b.vazao_Lmin) {
      // interp log–log
      const t =
        (Math.log(Q) - Math.log(a.vazao_Lmin)) /
        (Math.log(b.vazao_Lmin) - Math.log(a.vazao_Lmin));
      const logD = Math.log(a.diametro_mm) + t * (Math.log(b.diametro_mm) - Math.log(a.diametro_mm));
      return Math.exp(logD);
    }
  }
  return null;
}

/** Próximo diâmetro comercial igual ou superior ao mínimo. */
export function diametroComercial(faixas: FaixaCondutor[], dMin: number): FaixaCondutor | null {
  const f = ordenarFaixas(faixas);
  return f.find((x) => x.diametro_mm >= dMin) ?? null;
}

/** Capacidade interpolada (L/min) para um diâmetro arbitrário. */
export function capacidadePorDiametro(faixas: FaixaCondutor[], D: number): number | null {
  const f = ordenarFaixas(faixas);
  if (!f.length) return null;
  if (D <= f[0].diametro_mm) return f[0].vazao_Lmin;
  if (D >= f[f.length - 1].diametro_mm) return f[f.length - 1].vazao_Lmin;
  for (let i = 1; i < f.length; i++) {
    const a = f[i - 1];
    const b = f[i];
    if (D <= b.diametro_mm) {
      const t =
        (Math.log(D) - Math.log(a.diametro_mm)) /
        (Math.log(b.diametro_mm) - Math.log(a.diametro_mm));
      const logQ = Math.log(a.vazao_Lmin) + t * (Math.log(b.vazao_Lmin) - Math.log(a.vazao_Lmin));
      return Math.exp(logQ);
    }
  }
  return null;
}
