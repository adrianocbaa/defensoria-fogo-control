// Geração de candidatos de modelo (modos Assistido e Exploração ampla). Puro e determinístico.
// Nunca escolhe o "melhor" modelo nem atribui pontuação: apenas enumera combinações matematicamente válidas.
import { type TransformCode, transformDomainOk } from './engine.ts';

export type CandidateMode = 'ASSISTIDO' | 'AMPLA';

export interface CandidateVar {
  id: string;
  code: string;
  transforms: TransformCode[];
  /** No modo assistido, obrigatória entra em todos os candidatos. */
  obrigatoria: boolean;
  /** Valores na escala original das amostras do conjunto congelado e do avaliando (independentes). */
  values: number[];
}

export interface CandidateSpec { depT: TransformCode; vars: [string, TransformCode][] }

export interface ModelingSettings {
  assisted_candidate_soft_limit: number;
  exploration_candidate_soft_limit: number;
  hard_limit: number | null;
  require_confirmation_over: number | null;
}

/**
 * Transformações autorizadas que são válidas para todos os valores (domínio).
 * POWER exige expoente explícito do profissional e fica restrita ao modo Manual.
 */
export function validTransforms(transforms: TransformCode[], values: number[]): TransformCode[] {
  return transforms.filter((t) => t !== 'POWER' && values.every((x) => Number.isFinite(x) && transformDomainOk(t, x)));
}

/** Quantidade estimada antes de enumerar (já descontando transformações inválidas pelo domínio). */
export function estimateCandidates(
  mode: CandidateMode,
  dep: { transforms: TransformCode[]; selected: TransformCode[]; values: number[] },
  indeps: CandidateVar[],
): { total: number; descartadasDominio: number } {
  const depTs = validTransforms(mode === 'AMPLA' ? dep.transforms : dep.selected, dep.values);
  let total = depTs.length;
  let descartadas = (mode === 'AMPLA' ? dep.transforms : dep.selected).length - depTs.length;
  let nonEmptyFactor = 1; let emptyPossible = true;
  for (const v of indeps) {
    const ts = validTransforms(v.transforms, v.values);
    descartadas += v.transforms.length - ts.length;
    const required = mode === 'ASSISTIDO' && v.obrigatoria;
    if (required && ts.length === 0) return { total: 0, descartadasDominio: descartadas };
    nonEmptyFactor *= ts.length + (required ? 0 : 1);
    if (required) emptyPossible = false;
  }
  // Exclui a combinação sem nenhuma variável independente.
  total *= Math.max(0, nonEmptyFactor - (emptyPossible ? 1 : 0));
  return { total, descartadasDominio: descartadas };
}

export function buildCandidates(
  mode: CandidateMode,
  dep: { transforms: TransformCode[]; selected: TransformCode[]; values: number[] },
  indeps: CandidateVar[],
): CandidateSpec[] {
  const depTs = validTransforms(mode === 'AMPLA' ? dep.transforms : dep.selected, dep.values);
  let combos: [string, TransformCode][][] = [[]];
  for (const v of indeps) {
    const ts = validTransforms(v.transforms, v.values);
    const required = mode === 'ASSISTIDO' && v.obrigatoria;
    const opts: (TransformCode | null)[] = [...ts, ...(required ? [] : [null])];
    combos = combos.flatMap((c) => opts.map((t) => (t ? [...c, [v.id, t] as [string, TransformCode]] : c)));
  }
  combos = combos.filter((c) => c.length > 0);
  return depTs.flatMap((depT) => combos.map((vars) => ({ depT, vars })));
}

export type LimitDecision =
  | { ok: true; requiresConfirmation: boolean; softLimit: number }
  | { ok: false; reason: 'HARD_LIMIT' | 'EMPTY'; limit?: number };

/** Mesma regra aplicada no servidor (aval_model_generate_batch). */
export function evaluateCandidateLimit(count: number, mode: CandidateMode, s: ModelingSettings): LimitDecision {
  if (count <= 0) return { ok: false, reason: 'EMPTY' };
  if (s.hard_limit !== null && s.hard_limit !== undefined && count > s.hard_limit) return { ok: false, reason: 'HARD_LIMIT', limit: s.hard_limit };
  const soft = mode === 'AMPLA' ? s.exploration_candidate_soft_limit : s.assisted_candidate_soft_limit;
  const over = s.require_confirmation_over;
  return { ok: true, softLimit: soft, requiresConfirmation: count > soft || (over !== null && over !== undefined && count > over) };
}
