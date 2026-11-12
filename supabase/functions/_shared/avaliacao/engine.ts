// SiDIF Statistical Engine — motor estatístico puro (sem dependências).
// Usado pela tela (prévia) e pela função do servidor avaliacao-engine (execução oficial).
// Regras técnicas (limites, tolerâncias, faixas) NÃO ficam aqui: chegam por política versionada.

export const ENGINE_NAME = 'SiDIF Statistical Engine';
export const ENGINE_VERSION = '1.1.1';

export type TransformCode = 'DIRECT' | 'INVERSE' | 'LN' | 'SQUARE' | 'SQRT' | 'INV_SQUARE' | 'INV_SQRT' | 'POWER';

/** Mapeamento numérico do motor (contrato estável). */
export const TRANSFORM_ENGINE_CODE: Record<TransformCode, number> = {
  POWER: 0, DIRECT: 1, INVERSE: 2, LN: 3, SQUARE: 4, SQRT: 5, INV_SQUARE: 6, INV_SQRT: 7,
};

export type DegenerateCode =
  | 'ZERO_VARIANCE' | 'INVALID_DOMAIN' | 'N_LE_P' | 'RANK_DEFICIENT' | 'NON_FINITE'
  | 'ZERO_RESIDUAL_VARIANCE' | 'MISSING_VALUES' | 'INVALID_INPUT';

export class EngineError extends Error {
  constructor(public code: DegenerateCode, public detail: Record<string, unknown> = {}) {
    super(code);
  }
}

// ----------------------------------------------------------------------------
// Transformações
// ----------------------------------------------------------------------------

export function transformDomainOk(code: TransformCode, x: number, power?: number): boolean {
  if (!Number.isFinite(x)) return false;
  switch (code) {
    case 'DIRECT': case 'SQUARE': return true;
    case 'INVERSE': case 'INV_SQUARE': return x !== 0;
    case 'LN': case 'INV_SQRT': return x > 0;
    case 'SQRT': return x >= 0;
    case 'POWER':
      if (power === undefined || power === null || !Number.isFinite(power) || power === 0) return false;
      if (x > 0) return true;
      if (x === 0) return power > 0;
      return Number.isInteger(power);
  }
  return false;
}

export function applyTransform(code: TransformCode, x: number, power?: number): number {
  if (!transformDomainOk(code, x, power)) throw new EngineError('INVALID_DOMAIN', { transform: code, value: x });
  switch (code) {
    case 'DIRECT': return x;
    case 'INVERSE': return 1 / x;
    case 'LN': return Math.log(x);
    case 'SQUARE': return x * x;
    case 'SQRT': return Math.sqrt(x);
    case 'INV_SQUARE': return 1 / (x * x);
    case 'INV_SQRT': return 1 / Math.sqrt(x);
    case 'POWER': return Math.pow(x, power as number);
  }
}

/** Inversa da transformação da variável dependente (escala original, assumindo y > 0 quando aplicável). */
export function inverseTransform(code: TransformCode, z: number, power?: number): number {
  switch (code) {
    case 'DIRECT': return z;
    case 'INVERSE': return 1 / z;
    case 'LN': return Math.exp(z);
    case 'SQUARE': return Math.sqrt(z);
    case 'SQRT': return z * z;
    case 'INV_SQUARE': return 1 / Math.sqrt(z);
    case 'INV_SQRT': return 1 / (z * z);
    case 'POWER': return Math.pow(z, 1 / (power as number));
  }
}

/** Sinal da derivada da transformação (para x > 0). */
export function transformMonotonicSign(code: TransformCode, power?: number): 1 | -1 {
  switch (code) {
    case 'INVERSE': case 'INV_SQUARE': case 'INV_SQRT': return -1;
    case 'POWER': return (power ?? 1) < 0 ? -1 : 1;
    default: return 1;
  }
}

// ----------------------------------------------------------------------------
// Funções especiais e distribuições
// ----------------------------------------------------------------------------

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function lnGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
  z -= 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 500, EPS = 1e-16, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Função beta incompleta regularizada I_x(a, b). */
export function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** P(|T| > |t|) para T ~ Student(df). */
export function studentTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return betaInc(df / 2, 0.5, df / (df + t * t));
}

/** P(F > f) para F ~ F(d1, d2). */
export function fUpperP(f: number, d1: number, d2: number): number {
  if (!(f > 0)) return 1;
  if (!Number.isFinite(f)) return 0;
  return betaInc(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

/** t crítico bicaudal: P(|T| > t) = 1 - level. */
export function studentTCritical(level: number, df: number): number {
  const alpha = 1 - level;
  let lo = 0, hi = 1;
  while (studentTwoTailedP(hi, df) > alpha) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (studentTwoTailedP(mid, df) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ----------------------------------------------------------------------------
// Álgebra linear mínima
// ----------------------------------------------------------------------------

type Mat = number[][];

function invertSymmetric(A: Mat): Mat {
  // Gauss-Jordan com pivoteamento parcial; detecção de posto por tolerância relativa.
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  const scale = Math.max(...A.map((r, i) => Math.abs(r[i])), 1e-300);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) <= 1e-12 * scale) throw new EngineError('RANK_DEFICIENT', { column: col });
    [M[col], M[piv]] = [M[piv], M[col]];
    const p = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((r) => r.slice(n));
}

function mean(v: number[]): number { return v.reduce((a, b) => a + b, 0) / v.length; }

export function pearson(a: number[], b: number[]): number {
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; saa += da * da; sbb += db * db;
  }
  if (saa === 0 || sbb === 0) return NaN;
  return sab / Math.sqrt(saa * sbb);
}

// ----------------------------------------------------------------------------
// Regressão
// ----------------------------------------------------------------------------

export interface VariableSpec {
  code: string;
  transform: TransformCode;
  power?: number;
  /** Valores na escala original, alinhados a sampleIds. */
  values: number[];
}

export interface RegressionInput {
  sampleIds: string[];
  dependent: VariableSpec;
  independents: VariableSpec[];
}

export interface CoefficientResult {
  code: string; // '(intercepto)' para o intercepto
  transform: TransformCode | null;
  power?: number;
  beta: number;
  stdError: number;
  t: number;
  pValue: number;
}

export interface RegressionResult {
  engine: { name: string; version: string };
  n: number; k: number; p: number; dfReg: number; dfRes: number;
  coefficients: CoefficientResult[];
  yTransformed: number[];
  yhat: number[];
  residuals: number[];
  sse: number; sst: number; ssr: number; mse: number; s: number;
  r2: number; r2Adj: number; rRegressao: number; rEstimativa: number;
  f: number; fPValue: number;
  leverage: number[];
  residualsStd: number[];
  /** Resíduo ÷ observado, ambos na escala transformada (padrão SisDEA). */
  residualsRelative: number[];
  /** Auxiliar: (observado − estimado) ÷ observado na escala original. */
  residualsRelativeOriginal: number[];
  estimatedOriginal: number[];
  cook: number[];
  correlation: { codes: string[]; matrix: number[][] };
  normality: { z: number; observed: number }[];
  ranges: Record<string, { min: number; max: number }>;
  /** Observado da dependente na escala original (alinhado a sampleIds). */
  yOriginal: number[];
  /** Quadro de análise da variância (mesmas somas usadas em R², F e MSE). */
  anova: AnovaRow[];
  /** Estatísticas descritivas por variável, nas escalas original e transformada. */
  variableStats: VariableStats[];
  /** (X'X)^-1 — necessário à projeção. */
  covUnscaled: number[][];
  sampleIds: string[];
}

export interface AnovaRow { source: 'REGRESSAO' | 'RESIDUO' | 'TOTAL'; ss: number; df: number; ms: number; f: number | null; p: number | null }

export interface VariableStats {
  code: string; role: 'DEPENDENTE' | 'INDEPENDENTE'; transform: TransformCode; power?: number; n: number;
  min: number; max: number; mean: number; stdDev: number; amplitude: number;
  minTransformed: number; maxTransformed: number; meanTransformed: number; stdDevTransformed: number;
}

function sampleStd(v: number[], m: number): number {
  if (v.length < 2) return 0;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

const NORMALITY_BANDS = [1, 1.64, 1.96];

export function fitRegression(input: RegressionInput): RegressionResult {
  const { sampleIds, dependent, independents } = input;
  if (!dependent || !Array.isArray(independents) || independents.length === 0) {
    throw new EngineError('INVALID_INPUT', { reason: 'missing_variables' });
  }
  const n = sampleIds.length;
  const k = independents.length;
  const p = k + 1;
  if (n <= p) throw new EngineError('N_LE_P', { n, p });

  const all = [dependent, ...independents];
  for (const v of all) {
    if (v.values.length !== n) throw new EngineError('MISSING_VALUES', { variable: v.code });
    v.values.forEach((x, i) => {
      if (x === null || x === undefined || Number.isNaN(x)) throw new EngineError('MISSING_VALUES', { variable: v.code, sample: sampleIds[i] });
      if (!Number.isFinite(x)) throw new EngineError('NON_FINITE', { variable: v.code, sample: sampleIds[i] });
    });
  }
  const tx = (v: VariableSpec) => v.values.map((x, i) => {
    if (!transformDomainOk(v.transform, x, v.power)) {
      throw new EngineError('INVALID_DOMAIN', { variable: v.code, transform: v.transform, sample: sampleIds[i], value: x });
    }
    return applyTransform(v.transform, x, v.power);
  });

  const y = tx(dependent);
  const cols = independents.map(tx);
  for (const [idx, c] of [y, ...cols].entries()) {
    const m = mean(c);
    if (c.every((v) => Math.abs(v - m) <= 1e-12 * Math.max(1, Math.abs(m)))) {
      throw new EngineError('ZERO_VARIANCE', { variable: all[idx].code });
    }
  }

  const X: Mat = Array.from({ length: n }, (_, i) => [1, ...cols.map((c) => c[i])]);
  const XtX: Mat = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => {
    let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * X[i][b]; return s;
  }));
  const Xty = Array.from({ length: p }, (_, a) => { let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * y[i]; return s; });
  const C = invertSymmetric(XtX);
  const beta = C.map((row) => row.reduce((s, c, j) => s + c * Xty[j], 0));

  const yhat = X.map((row) => row.reduce((s, x, j) => s + x * beta[j], 0));
  const residuals = y.map((v, i) => v - yhat[i]);
  const ym = mean(y);
  const sse = residuals.reduce((s, e) => s + e * e, 0);
  const sst = y.reduce((s, v) => s + (v - ym) ** 2, 0);
  const ssr = yhat.reduce((s, v) => s + (v - ym) ** 2, 0);
  const dfReg = k, dfRes = n - p;
  const mse = sse / dfRes;
  if (!(mse > 0)) throw new EngineError('ZERO_RESIDUAL_VARIANCE', {});
  const s = Math.sqrt(mse);
  const r2 = 1 - sse / sst;
  const r2Adj = 1 - (1 - r2) * (n - 1) / dfRes;
  const f = (ssr / dfReg) / mse;
  const fPValue = fUpperP(f, dfReg, dfRes);

  const coefficients: CoefficientResult[] = beta.map((b, j) => {
    const se = Math.sqrt(mse * C[j][j]);
    const t = b / se;
    return {
      code: j === 0 ? '(intercepto)' : independents[j - 1].code,
      transform: j === 0 ? null : independents[j - 1].transform,
      power: j === 0 ? undefined : independents[j - 1].power,
      beta: b, stdError: se, t, pValue: studentTwoTailedP(t, dfRes),
    };
  });

  const leverage = X.map((row) => {
    let h = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) h += row[a] * C[a][b] * row[b];
    return h;
  });
  const residualsStd = residuals.map((e) => e / s);
  const cook = residuals.map((e, i) => ((e * e) / (p * mse)) * (leverage[i] / (1 - leverage[i]) ** 2));
  const estimatedOriginal = yhat.map((z) => inverseTransform(dependent.transform, z, dependent.power));
  // Resíduo relativo oficial (SisDEA): resíduo na escala transformada ÷ observado transformado.
  const residualsRelative = residuals.map((e, i) => e / y[i]);
  // Auxiliar (não oficial): diferença relativa na escala original.
  const residualsRelativeOriginal = dependent.values.map((yo, i) => (yo - estimatedOriginal[i]) / yo);
  // R estimativa: sqrt(1 − SSE/SST) na escala original, com estimado = inversa(ŷ) — sem correção moda/média.
  const yoMean = mean(dependent.values);
  const sseOriginal = dependent.values.reduce((acc, yo, i) => acc + (yo - estimatedOriginal[i]) ** 2, 0);
  const sstOriginal = dependent.values.reduce((acc, yo) => acc + (yo - yoMean) ** 2, 0);
  const rEstimativa = Math.sqrt(Math.max(0, 1 - sseOriginal / sstOriginal));

  const codes = [dependent.code, ...independents.map((v) => v.code)];
  const series = [y, ...cols];
  const matrix = series.map((a) => series.map((b) => pearson(a, b)));
  const normality = NORMALITY_BANDS.map((z) => ({
    z, observed: residualsStd.filter((r) => Math.abs(r) <= z).length / n,
  }));
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const v of all) ranges[v.code] = { min: Math.min(...v.values), max: Math.max(...v.values) };

  const anova: AnovaRow[] = [
    { source: 'REGRESSAO', ss: ssr, df: dfReg, ms: ssr / dfReg, f, p: fPValue },
    { source: 'RESIDUO', ss: sse, df: dfRes, ms: mse, f: null, p: null },
    { source: 'TOTAL', ss: sst, df: n - 1, ms: sst / (n - 1), f: null, p: null },
  ];
  const variableStats: VariableStats[] = all.map((v, idx) => {
    const tv = series[idx];
    const m = mean(v.values), mt = mean(tv);
    const min = Math.min(...v.values), max = Math.max(...v.values);
    return {
      code: v.code, role: idx === 0 ? 'DEPENDENTE' : 'INDEPENDENTE', transform: v.transform, power: v.power, n,
      min, max, mean: m, stdDev: sampleStd(v.values, m), amplitude: max - min,
      minTransformed: Math.min(...tv), maxTransformed: Math.max(...tv), meanTransformed: mt, stdDevTransformed: sampleStd(tv, mt),
    };
  });

  const result: RegressionResult = {
    engine: { name: ENGINE_NAME, version: ENGINE_VERSION },
    n, k, p, dfReg, dfRes, coefficients,
    yTransformed: y, yhat, residuals, sse, sst, ssr, mse, s,
    r2, r2Adj, rRegressao: Math.sqrt(Math.max(0, r2)), rEstimativa,
    f, fPValue, leverage, residualsStd, residualsRelative, residualsRelativeOriginal, estimatedOriginal, cook,
    correlation: { codes, matrix }, normality, ranges, yOriginal: [...dependent.values], anova, variableStats,
    covUnscaled: C, sampleIds,
  };
  const scalars = [sse, sst, ssr, mse, r2, r2Adj, f, fPValue, rEstimativa];
  if (scalars.some((v) => !Number.isFinite(v)) || coefficients.some((c) => !Number.isFinite(c.beta) || !Number.isFinite(c.stdError))) {
    throw new EngineError('NON_FINITE', { stage: 'output' });
  }
  return result;
}

// ----------------------------------------------------------------------------
// Projeção (centros e intervalo de confiança)
// ----------------------------------------------------------------------------

export type CenterCode = 'DIRECT' | 'MODE' | 'MEDIAN' | 'MEAN';
export type IntervalStatus = 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_VALIDATED' | 'NOT_APPLICABLE';

export interface PrecisionBand { grau: string; maxAmplitudePct: number }

export interface CenterResult {
  center: CenterCode;
  value: number;
  lower: number;
  upper: number;
  amplitudePct: number;
  precisionGrade: string | null;
}

export interface ProjectionResult {
  z0: number;
  seMean: number;
  tCritical: number;
  confidenceLevel: number;
  logResponse: boolean;
  centers: CenterResult[];
  extrapolation: { code: string; value: number; min: number; max: number; inside: boolean }[];
  predictionInterval: { status: IntervalStatus };
}

export function amplitudePct(center: number, lower: number, upper: number): number {
  return Math.abs((100 * (upper - center)) / center) + Math.abs((100 * (lower - center)) / center);
}

/** Classificação usa o valor integral; bandas ordenadas da mais exigente para a menos. */
export function classifyPrecision(amplitude: number, bands: PrecisionBand[]): string | null {
  const sorted = [...bands].sort((a, b) => a.maxAmplitudePct - b.maxAmplitudePct);
  for (const b of sorted) if (amplitude <= b.maxAmplitudePct) return b.grau;
  return null;
}

export function project(
  fit: RegressionResult,
  input: RegressionInput,
  avaliando: Record<string, number>,
  confidenceLevel: number,
  precisionBands: PrecisionBand[],
): ProjectionResult {
  if (!(confidenceLevel > 0 && confidenceLevel < 1)) throw new EngineError('INVALID_INPUT', { reason: 'confidence_level' });
  const x0 = [1];
  const extrapolation: ProjectionResult['extrapolation'] = [];
  for (const v of input.independents) {
    const raw = avaliando[v.code];
    if (raw === undefined || raw === null || Number.isNaN(raw)) throw new EngineError('MISSING_VALUES', { variable: v.code, scope: 'AVALIANDO' });
    if (!transformDomainOk(v.transform, raw, v.power)) throw new EngineError('INVALID_DOMAIN', { variable: v.code, scope: 'AVALIANDO', value: raw });
    x0.push(applyTransform(v.transform, raw, v.power));
    const r = fit.ranges[v.code];
    extrapolation.push({ code: v.code, value: raw, min: r.min, max: r.max, inside: raw >= r.min && raw <= r.max });
  }
  const z0 = x0.reduce((s, x, j) => s + x * fit.coefficients[j].beta, 0);
  let q = 0;
  for (let a = 0; a < x0.length; a++) for (let b = 0; b < x0.length; b++) q += x0[a] * fit.covUnscaled[a][b] * x0[b];
  const seMean = fit.s * Math.sqrt(q);
  const tCritical = studentTCritical(confidenceLevel, fit.dfRes);
  const half = tCritical * seMean;
  const tr = input.dependent.transform;
  const pw = input.dependent.power;
  const logResponse = tr === 'LN';

  const mk = (center: CenterCode, zc: number): CenterResult => {
    const value = inverseTransform(tr, zc, pw);
    const a = inverseTransform(tr, zc - half, pw);
    const b = inverseTransform(tr, zc + half, pw);
    const lower = Math.min(a, b), upper = Math.max(a, b);
    const amp = amplitudePct(value, lower, upper);
    return { center, value, lower, upper, amplitudePct: amp, precisionGrade: classifyPrecision(amp, precisionBands) };
  };

  const s2 = fit.s * fit.s;
  // Cada centro logarítmico tem seu próprio IC, deslocado pela mesma correção do centro.
  const centers = logResponse
    ? [mk('MODE', z0 - s2), mk('MEDIAN', z0), mk('MEAN', z0 + s2 / 2)]
    : [mk('DIRECT', z0)];
  if (centers.some((c) => ![c.value, c.lower, c.upper, c.amplitudePct].every(Number.isFinite))) {
    throw new EngineError('NON_FINITE', { stage: 'projection' });
  }
  return {
    z0, seMean, tCritical, confidenceLevel, logResponse, centers, extrapolation,
    predictionInterval: { status: 'NOT_VALIDATED' },
  };
}

// ----------------------------------------------------------------------------
// Utilidades de reprodutibilidade
// ----------------------------------------------------------------------------

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).filter((k) => obj[k] !== undefined).sort()
    .map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}

/** Quantidade de candidatos no modo assistido (produto das transformações autorizadas; opcionais podem ficar fora). */
export function countCandidates(vars: { transforms: TransformCode[]; obrigatoria: boolean }[], dependentTransforms: number): number {
  let total = Math.max(1, dependentTransforms);
  for (const v of vars) total *= v.transforms.length + (v.obrigatoria ? 0 : 1);
  return total;
}

export function describeEngineError(code: string): string {
  const m: Record<string, string> = {
    ZERO_VARIANCE: 'Uma variável tem o mesmo valor em todas as amostras.',
    INVALID_DOMAIN: 'Uma transformação não é válida para algum valor (ex.: logaritmo de zero ou negativo).',
    N_LE_P: 'Há poucas amostras para a quantidade de variáveis.',
    RANK_DEFICIENT: 'Há variáveis redundantes (combinação exata de outras).',
    NON_FINITE: 'O cálculo produziu valores inválidos.',
    ZERO_RESIDUAL_VARIANCE: 'O modelo ajusta perfeitamente os dados (sem variância residual).',
    MISSING_VALUES: 'Há valores faltantes em amostras ou no avaliando.',
    INVALID_INPUT: 'Dados de entrada incompletos.',
  };
  return m[code] ?? 'Falha no cálculo.';
}
