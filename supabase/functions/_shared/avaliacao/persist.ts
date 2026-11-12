// Montagem dos payloads gravados atomicamente por aval_engine_persist_run / aval_engine_persist_validation.
// Tudo vem da MESMA saída do motor (output_json); nada é recalculado aqui.
import type { ProjectionResult, RegressionInput, RegressionResult } from './engine.ts';
import { deriveStatTables } from './derived.ts';
import type { ManualDecision, ValidationOutput } from './validator.ts';

export interface RunBase {
  organization_id: string; avaliacao_id: string; modelo_id: string; engine_name: string; engine_version: string;
  input_snapshot_json: unknown; input_hash: string; iniciado_em: string; executado_por: string;
}

export interface EngineOutput { fit: RegressionResult; preliminary_projection: ProjectionResult | null; preliminary_projection_error: string | null }

/** JSON não representa NaN/Infinity: grava null (o Postgres recusaria o literal). */
const fin = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? null : v);
function finiteDeep<T>(rows: T[]): T[] {
  return rows.map((r) => Object.fromEntries(Object.entries(r as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'number' ? fin(v) : v])) as T);
}

export function buildRunPayload(base: RunBase, output: EngineOutput, outputHash: string, input: RegressionInput,
  normality: { policyId: string; thresholds: Record<string, unknown> | null }) {
  const { fit, preliminary_projection: preliminary } = output;
  const indep = fit.coefficients.slice(1);
  const center = preliminary?.centers.find((c) => c.center === (preliminary.logResponse ? 'MEDIAN' : 'DIRECT'));
  const d = deriveStatTables(output, input, normality.thresholds);
  return {
    policy_id: normality.policyId,
    execucao: { ...base, output_json: output, output_hash: outputHash },
    resumo: {
      n: fit.n, k: fit.k, r2: fin(fit.r2), r2_ajustado: fin(fit.r2Adj), f: fin(fit.f), sig_f: fin(fit.fPValue),
      pior_sig_regressor: indep.length ? fin(Math.max(...indep.map((c) => c.pValue))) : null,
      amplitude_pct: fin(center?.amplitudePct), grau_precisao: center?.precisionGrade ?? null,
      extrapola: preliminary ? preliminary.extrapolation.some((x) => !x.inside) : null, centro_preliminar: fin(center?.value),
    },
    coeficientes: fit.coefficients.map((c, i) => ({ codigo: c.code, transformacao: c.transform, beta: fin(c.beta), erro_padrao: fin(c.stdError), t: fin(c.t), sig: fin(c.pValue), ordem: i })),
    derived: {
      anova: finiteDeep(d.anova), residuos: finiteDeep(d.residuos), normalidade: finiteDeep(d.normalidade), correlacoes: finiteDeep(d.correlacoes),
      estatisticas: finiteDeep(d.estatisticas), extrapolacoes: finiteDeep(d.extrapolacoes),
    },
  };
}

export function buildValidationPayload(
  ids: { organization_id: string; avaliacao_id: string; modelo_id: string; execucao_id: string; created_by: string },
  policy: { id: string; codigo: string; versao: number },
  out: ValidationOutput, manual: Record<string, ManualDecision>, extra: Record<string, unknown> = {},
) {
  return {
    politica: `${policy.codigo} v${policy.versao}`,
    validacao: {
      ...ids, policy_id: policy.id, overall_status: out.overall, fundamentacao_grau: out.fundamentacao.grau, precisao_grau: out.precisao.grau,
      amplitude_pct: fin(out.precisao.amplitudePct),
      resumo_json: { fundamentacao: out.fundamentacao, precisao: out.precisao, pendentes_revisao: out.pendentesRevisao,
        impedimentos_grau_iii: out.impedimentosGrauIII, politica: { codigo: policy.codigo, versao: policy.versao }, ...extra },
    },
    resultados: out.results.map((r) => ({ codigo: r.codigo, numero: r.numero, nome: r.nome, origem: r.origem, modo: r.modo, status: r.status, grau: r.grau,
      valor: fin(r.valor), detalhe: r.detalhe, dados: r.dados ?? null, revisado: !!manual[r.codigo] || !!r.revisado, bloqueante: r.bloqueante })),
    fundamentacao: out.foundation ? { policy_version: policy.versao, summary: out.foundation.summary, items: out.foundation.items } : null,
  };
}
