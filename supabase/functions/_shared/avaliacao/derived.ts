// Tabelas estatísticas derivadas (modelo_anova, modelo_residuos, ...): projeções da MESMA saída do motor
// gravada em output_json. Nenhum valor é recalculado por outra fórmula — apenas reorganizado em linhas.
import type { ProjectionResult, RegressionInput, RegressionResult } from './engine.ts';
import { evaluateNormality } from './validator.ts';

export interface DerivedTables {
  anova: { fonte: string; ordem: number; sq: number; gl: number; mq: number; f: number | null; significancia: number | null }[];
  residuos: {
    amostra_id: string; ordem: number; observado_original: number; estimado_original: number;
    observado_transformado: number; estimado_transformado: number; residuo: number; residuo_relativo: number;
    residuo_dp: number; leverage: number; cook: number;
  }[];
  normalidade: { z: number; referencia: number; tolerancia: number | null; criterio: string | null; limite_inferior: number | null; limite_superior: number | null; observado: number; status: string }[];
  correlacoes: { variavel_a: string; variavel_b: string; correlacao: number; escala: string }[];
  estatisticas: {
    variavel: string; papel: string; transformacao: string; n: number; minimo: number; maximo: number; media: number; desvio_padrao: number; amplitude: number;
    minimo_transformado: number; maximo_transformado: number; media_transformada: number; desvio_padrao_transformado: number;
  }[];
  extrapolacoes: { variavel: string; valor_avaliando: number; min_amostra: number; max_amostra: number; inside: boolean }[];
}

export function deriveStatTables(
  output: { fit: RegressionResult; preliminary_projection: ProjectionResult | null },
  input: RegressionInput,
  normalityThresholds: Record<string, unknown> | null,
): DerivedTables {
  const fit = output.fit;
  const yOrig = fit.yOriginal ?? input.dependent.values;
  const codes = fit.correlation.codes;
  const correlacoes: DerivedTables['correlacoes'] = [];
  for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
    correlacoes.push({ variavel_a: codes[i], variavel_b: codes[j], correlacao: fit.correlation.matrix[i][j], escala: 'TRANSFORMADA' });
  }
  return {
    anova: (fit.anova ?? []).map((a, i) => ({ fonte: a.source, ordem: i + 1, sq: a.ss, gl: a.df, mq: a.ms, f: a.f, significancia: a.p })),
    residuos: fit.sampleIds.map((id, i) => ({
      amostra_id: id, ordem: i + 1, observado_original: yOrig[i], estimado_original: fit.estimatedOriginal[i],
      observado_transformado: fit.yTransformed[i], estimado_transformado: fit.yhat[i], residuo: fit.residuals[i],
      residuo_relativo: fit.residualsRelative[i], residuo_dp: fit.residualsStd[i], leverage: fit.leverage[i], cook: fit.cook[i],
    })),
    normalidade: normalityThresholds
      ? evaluateNormality(fit, normalityThresholds).itens.map((b) => ({ z: b.z, referencia: b.referencia, tolerancia: b.tolerancia, criterio: b.criterio,
          limite_inferior: b.limite_inferior, limite_superior: b.limite_superior, observado: b.observado, status: b.status }))
      : fit.normality.map((b) => ({ z: b.z, referencia: NaN, tolerancia: null, criterio: null, limite_inferior: null, limite_superior: null, observado: b.observed, status: 'NAO_VERIFICADO' }))
          .map((b) => ({ ...b, referencia: null as unknown as number })),
    correlacoes,
    estatisticas: (fit.variableStats ?? []).map((v) => ({
      variavel: v.code, papel: v.role, transformacao: v.transform, n: v.n, minimo: v.min, maximo: v.max, media: v.mean, desvio_padrao: v.stdDev,
      amplitude: v.amplitude, minimo_transformado: v.minTransformed, maximo_transformado: v.maxTransformed,
      media_transformada: v.meanTransformed, desvio_padrao_transformado: v.stdDevTransformed,
    })),
    extrapolacoes: (output.preliminary_projection?.extrapolation ?? []).map((e) => ({
      variavel: e.code, valor_avaliando: e.value, min_amostra: e.min, max_amostra: e.max, inside: e.inside,
    })),
  };
}
