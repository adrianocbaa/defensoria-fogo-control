// Validador do modelo (13 critérios). Todos os limites vêm da política versionada (validation_policy_rules).
import {
  type ProjectionResult, type RegressionResult, type TransformCode, transformMonotonicSign,
} from './engine.ts';

export type CriterionStatus = 'ATENDE' | 'NAO_ATENDE' | 'REQUER_ANALISE' | 'NAO_APLICAVEL' | 'NAO_VERIFICADO';
export type OverallStatus = 'APTO' | 'APTO_COM_RESSALVAS' | 'REQUER_AJUSTES' | 'BLOQUEADO';
export type Grau = 'III' | 'II' | 'I';
export type ManualDecision = 'ATENDE' | 'NAO_ATENDE' | 'INCONCLUSIVO';

export interface PolicyRule {
  codigo: string;
  numero: number;
  nome: string;
  origem: string;
  modo: 'AUTOMATICO' | 'ASSISTIDO' | 'DERIVADO' | 'MANUAL';
  bloqueante: boolean;
  entra_fundamentacao: boolean;
  thresholds: Record<string, any>;
  ativo: boolean;
}

export interface VariableMeta {
  code: string;
  tipo: 'QUANTITATIVA' | 'DICOTOMICA' | 'PROXY' | 'CODIGO_ALOCADO' | 'OUTRA';
  /** PROXY/CODIGO_ALOCADO: false quando o profissional indica que NÃO representa categorias discretas. */
  categorica?: boolean | null;
  relacao_esperada: 'POSITIVA' | 'NEGATIVA' | 'INDEFINIDA';
  transform: TransformCode;
  power?: number;
  /** valores originais nas amostras (para micronumerosidade) */
  values: number[];
}

export interface CriterionResult {
  codigo: string;
  numero: number;
  nome: string;
  origem: string;
  modo: string;
  status: CriterionStatus;
  grau: Grau | null;
  valor: number | null;
  detalhe: string;
  dados?: Record<string, unknown>;
  revisado?: boolean;
  bloqueante: boolean;
}

export type FoundationGrade = Grau | 'NAO_ENQUADRA';

/** Política versionada de fundamentação (validation_policies.parametros.fundamentacao). */
export interface FoundationPolicy {
  referencia?: string;
  origem?: string;
  pontos: Record<string, number>;
  itens: {
    item: number; codigo: string; titulo: string;
    source_type: 'CRITERIO' | 'MANUAL';
    criterio?: string;
    obrigatorio?: boolean;
  }[];
  enquadramento: { grau: Grau; pontos_min: number; obrigatorios_grau_min: Grau; demais_grau_min: Grau }[];
}

export interface FoundationItem {
  item_number: number; codigo: string; titulo: string; source_type: string; criterio_codigo: string | null;
  grade_achieved: Grau | null; points: number; mandatory_for_grade: boolean; status: CriterionStatus;
  details_json: Record<string, unknown>;
}

export interface FoundationSummary {
  total_points: number;
  grade_calculated: Grau | null;
  requirements_met: boolean;
  mandatory_requirements_json: { grau: Grau; pontos_min: number; pontos_ok: boolean; obrigatorios_ok: boolean; demais_ok: boolean; atende: boolean; falhas: string[] }[];
  pendencias: string[];
  policy_reference: string | null;
}

export interface CookRule { tipo: 'FIXO' | 'K_SOBRE_N' | 'K_SOBRE_N_MENOS_P'; valor?: number; k?: number; origem?: string; descricao?: string }

export interface ValidateOptions {
  /** Regra operacional de Cook (sobrepõe a da política, ex.: configuração da organização). */
  cookRule?: CookRule | null;
  foundation?: FoundationPolicy | null;
  /** Graus atribuídos pelo profissional a itens sem regra automática. */
  foundationGrades?: Record<string, FoundationGrade>;
}

export interface ValidationOutput {
  results: CriterionResult[];
  fundamentacao: { grau: Grau | null; itens: { codigo: string; nome: string; grau: Grau | null }[] };
  foundation: { items: FoundationItem[]; summary: FoundationSummary } | null;
  precisao: { amplitudePct: number | null; grau: string | null };
  overall: OverallStatus;
  pendentesRevisao: string[];
  impedimentosGrauIII: string[];
}

const ORDER: Record<string, number> = { III: 3, II: 2, I: 1 };
const minGrau = (gs: (Grau | null)[]): Grau | null => {
  if (gs.some((g) => g === null)) return null;
  return gs.reduce<Grau | null>((m, g) => (m === null || ORDER[g!] < ORDER[m] ? g : m), null);
};
const pct = (v: number) => `${(v * 100).toFixed(2).replace('.', ',')}%`;

export interface NormalityBandResult {
  z: number; referencia: number; tolerancia: number | null; criterio: 'INTERVALO' | 'MINIMO' | 'IGUAL' | null;
  limite_inferior: number | null; limite_superior: number | null; observado: number;
  ok: boolean | null; status: 'ATENDE' | 'FORA' | 'NAO_VERIFICADO';
}

/** Avalia TODAS as faixas da política: com tolerância usa referência ± tolerância; sem tolerância usa a comparação da política. */
export function evaluateNormality(fit: RegressionResult, th: Record<string, any>): { itens: NormalityBandResult[]; status: CriterionStatus } {
  const faixas: { z: number; referencia: number; tolerancia?: number | null; comparacao?: string | null }[] = th?.faixas ?? [];
  const padrao = (th?.comparacao_sem_tolerancia ?? null) as string | null;
  const eps = 1e-12;
  const itens = faixas.map((f): NormalityBandResult => {
    const obs = fit.normality.find((b) => Math.abs(b.z - f.z) < 1e-9)?.observed
      ?? fit.residualsStd.filter((e) => Math.abs(e) <= f.z).length / fit.n;
    const tol = f.tolerancia === undefined || f.tolerancia === null ? null : Number(f.tolerancia);
    let criterio: NormalityBandResult['criterio'] = null; let ok: boolean | null = null; let li: number | null = null; let ls: number | null = null;
    if (tol !== null) {
      criterio = 'INTERVALO'; li = f.referencia - tol; ls = f.referencia + tol;
      ok = obs >= li - eps && obs <= ls + eps;
    } else {
      const c = (f.comparacao ?? padrao) as string | null;
      if (c === 'MINIMO') { criterio = 'MINIMO'; li = f.referencia; ok = obs >= f.referencia - eps; }
      else if (c === 'IGUAL') { criterio = 'IGUAL'; li = ls = f.referencia; ok = Math.abs(obs - f.referencia) <= eps; }
    }
    return { z: f.z, referencia: f.referencia, tolerancia: tol, criterio, limite_inferior: li, limite_superior: ls, observado: obs, ok,
      status: ok === null ? 'NAO_VERIFICADO' : ok ? 'ATENDE' : 'FORA' };
  });
  let status: CriterionStatus;
  if (itens.length === 0) status = 'NAO_VERIFICADO';
  else if (itens.some((i) => i.ok === false)) status = (th?.status_fora as CriterionStatus) ?? 'REQUER_ANALISE';
  else if (itens.some((i) => i.ok === null)) status = 'REQUER_ANALISE';
  else status = 'ATENDE';
  return { itens, status };
}

/** Limite operacional de Cook (procedimento interno). Retorna null quando não há regra configurada. */
export function resolveCookLimit(rule: CookRule | null | undefined, n: number, p: number): number | null {
  if (!rule) return null;
  if (rule.tipo === 'FIXO') return Number.isFinite(Number(rule.valor)) ? Number(rule.valor) : null;
  if (rule.tipo === 'K_SOBRE_N') return Number.isFinite(Number(rule.k)) && n > 0 ? Number(rule.k) / n : null;
  if (rule.tipo === 'K_SOBRE_N_MENOS_P') return Number.isFinite(Number(rule.k)) && n - p > 0 ? Number(rule.k) / (n - p) : null;
  return null;
}

const CATEGORICAL_DEFAULT = ['DICOTOMICA', 'PROXY', 'CODIGO_ALOCADO'];
/** Variáveis tratadas como categorias/grupos discretos para micronumerosidade. Quantitativas nunca entram. */
export function categoricalVariables(vars: VariableMeta[], tipos: string[] = CATEGORICAL_DEFAULT): VariableMeta[] {
  return vars.filter((v) => {
    if (v.tipo === 'QUANTITATIVA' || !tipos.includes(v.tipo)) return false;
    if (v.tipo === 'DICOTOMICA') return true;
    return v.categorica !== false;
  });
}

function gradeByMax(value: number, graus: { grau: Grau; max: number }[]): Grau | null {
  const sorted = [...graus].sort((a, b) => a.max - b.max);
  for (const g of sorted) if (value <= g.max) return g.grau;
  return null;
}

export function validateModel(
  fit: RegressionResult,
  projection: ProjectionResult | null,
  vars: VariableMeta[],
  dependent: { transform: TransformCode; power?: number },
  rules: PolicyRule[],
  manualReviews: Record<string, ManualDecision> = {},
  options: ValidateOptions = {},
): ValidationOutput {
  const active = rules.filter((r) => r.ativo).sort((a, b) => a.numero - b.numero);
  const out: CriterionResult[] = [];
  const indep = fit.coefficients.slice(1);
  const k = fit.k;

  for (const rule of active) {
    const base = { codigo: rule.codigo, numero: rule.numero, nome: rule.nome, origem: rule.origem, modo: rule.modo, bloqueante: rule.bloqueante };
    const th = rule.thresholds ?? {};
    let r: CriterionResult;
    switch (rule.codigo) {
      case 'RELACIONAMENTO': {
        const ySign = transformMonotonicSign(dependent.transform, dependent.power);
        const items = vars.map((v) => {
          const c = indep.find((x) => x.code === v.code);
          const effect = Math.sign(c?.beta ?? 0) * transformMonotonicSign(v.transform, v.power) * ySign;
          const esperado = v.relacao_esperada === 'POSITIVA' ? 1 : v.relacao_esperada === 'NEGATIVA' ? -1 : 0;
          return { code: v.code, esperado: v.relacao_esperada, efeito: effect > 0 ? 'POSITIVA' : effect < 0 ? 'NEGATIVA' : 'NULA', ok: esperado === 0 ? null : effect === esperado };
        });
        const def = items.filter((i) => i.ok !== null);
        const bad = def.filter((i) => !i.ok);
        r = {
          ...base, grau: null, valor: bad.length,
          status: def.length === 0 ? 'REQUER_ANALISE' : bad.length ? 'NAO_ATENDE' : 'ATENDE',
          detalhe: bad.length ? `Sinal contrário ao esperado: ${bad.map((b) => b.code).join(', ')}` : def.length ? 'Sinais coerentes com o esperado.' : 'Relação esperada não definida.',
          dados: { itens: items },
        };
        break;
      }
      case 'SIGNIF_REGRESSORES': {
        const worst = Math.max(...indep.map((c) => c.pValue));
        const g = gradeByMax(worst, th.graus ?? []);
        r = { ...base, grau: g, valor: worst, status: g ? 'ATENDE' : 'NAO_ATENDE', detalhe: `Pior significância: ${pct(worst)}`, dados: { itens: indep.map((c) => ({ code: c.code, p: c.pValue, t: c.t })) } };
        break;
      }
      case 'SIGNIF_MODELO': {
        const g = gradeByMax(fit.fPValue, th.graus ?? []);
        r = { ...base, grau: g, valor: fit.fPValue, status: g ? 'ATENDE' : 'NAO_ATENDE', detalhe: `Significância F: ${pct(fit.fPValue)}` };
        break;
      }
      case 'NORMALIDADE': {
        const ev = evaluateNormality(fit, th);
        const fmtFaixa = (b: NormalityBandResult) => `±${String(b.z).replace('.', ',')}σ: ${pct(b.observado)} (ref. ${pct(b.referencia)}${
          b.criterio === 'INTERVALO' ? `, aceito ${pct(b.limite_inferior!)}–${pct(b.limite_superior!)}` : b.criterio === 'MINIMO' ? ', mínimo' : b.criterio === 'IGUAL' ? ', igual' : ', sem regra na política'})${b.ok === false ? ' — fora' : ''}`;
        r = { ...base, grau: null, valor: ev.itens[0]?.observado ?? null, status: ev.status,
          detalhe: ev.itens.length ? ev.itens.map(fmtFaixa).join(' · ') : 'Política sem faixas de normalidade.',
          dados: { itens: ev.itens } };
        break;
      }
      case 'PRECISAO': {
        if (!projection) { r = { ...base, grau: null, valor: null, status: 'NAO_VERIFICADO', detalhe: 'Sem valores do avaliando para projeção.' }; break; }
        const amp = projection.centers[0].amplitudePct;
        const g = gradeByMax(amp, (th.graus ?? []).map((x: any) => ({ grau: x.grau, max: x.max })));
        r = { ...base, grau: g, valor: amp, status: g ? 'ATENDE' : 'NAO_ATENDE', detalhe: `Amplitude do IC: ${amp.toFixed(2).replace('.', ',')}%` };
        break;
      }
      case 'EXTRAPOLACAO': {
        if (!projection) { r = { ...base, grau: null, valor: null, status: 'NAO_VERIFICADO', detalhe: 'Sem valores do avaliando.' }; break; }
        const fora = projection.extrapolation.filter((e) => !e.inside);
        r = { ...base, grau: fora.length ? ((th.grau_maximo_com_extrapolacao as Grau) ?? null) : 'III', valor: fora.length,
          status: fora.length ? ((th.status_fora as CriterionStatus) ?? 'REQUER_ANALISE') : 'ATENDE',
          detalhe: fora.length ? `Fora da amplitude amostral: ${fora.map((f) => f.code).join(', ')}` : 'Avaliando dentro da amplitude amostral.',
          dados: { itens: projection.extrapolation } };
        break;
      }
      case 'NUMERO_DADOS': {
        const graus: { grau: Grau; multiplicador: number }[] = th.graus ?? [];
        const sorted = [...graus].sort((a, b) => b.multiplicador - a.multiplicador);
        const hit = sorted.find((g) => fit.n >= g.multiplicador * (k + 1));
        r = { ...base, grau: hit?.grau ?? null, valor: fit.n, status: hit ? 'ATENDE' : 'NAO_ATENDE',
          detalhe: `n = ${fit.n}; mínimos: ${sorted.map((g) => `${g.grau} ${g.multiplicador * (k + 1)}`).join(' · ')}` };
        break;
      }
      case 'T_DERIVADO': {
        r = { ...base, grau: null, valor: Math.min(...indep.map((c) => Math.abs(c.t))), status: 'NAO_APLICAVEL',
          detalhe: 'Verificação derivada da significância dos regressores (sem dupla penalização).',
          dados: { itens: indep.map((c) => ({ code: c.code, t: c.t })) } };
        break;
      }
      case 'MULTICOLINEARIDADE': {
        const lim = Number(th.r_max);
        const codes = fit.correlation.codes;
        const pares: { a: string; b: string; r: number }[] = [];
        for (let i = 1; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
          const v = fit.correlation.matrix[i][j];
          if (Math.abs(v) > lim) pares.push({ a: codes[i], b: codes[j], r: v });
        }
        r = { ...base, grau: null, valor: pares.length, status: !Number.isFinite(lim) ? 'NAO_VERIFICADO' : pares.length ? 'REQUER_ANALISE' : 'ATENDE',
          detalhe: pares.length ? `Correlação alta: ${pares.map((p) => `${p.a}×${p.b} (${p.r.toFixed(2)})`).join(', ')}` : 'Sem correlações acima do limite entre independentes.',
          dados: { pares } };
        break;
      }
      case 'HOMOCEDASTICIDADE': {
        r = { ...base, grau: null, valor: null, status: 'REQUER_ANALISE', detalhe: 'Análise visual do gráfico Resíduo × Estimado pelo profissional.' };
        break;
      }
      case 'PONTOS_INFLUENTES': {
        const rule: CookRule | null = options.cookRule ?? th.cook_regra
          ?? (th.cook_limite !== null && th.cook_limite !== undefined ? { tipo: 'FIXO', valor: Number(th.cook_limite), origem: 'PROCEDIMENTO_INTERNO' } : null);
        const lim = resolveCookLimit(rule, fit.n, fit.p);
        const maxCook = Math.max(...fit.cook);
        if (lim === null) {
          r = { ...base, grau: null, valor: maxCook, status: 'NAO_VERIFICADO', detalhe: `Maior distância de Cook: ${maxCook.toFixed(4)} (sem limite operacional configurado).` };
        } else {
          const acima = fit.cook.map((c, i) => ({ amostra_id: fit.sampleIds[i], ordem: i + 1, cook: c, leverage: fit.leverage[i], residuo_dp: fit.residualsStd[i], residuo_relativo: fit.residualsRelative[i] }))
            .filter((x) => x.cook > lim);
          const regraTxt = rule!.tipo === 'FIXO' ? `D > ${lim.toFixed(4)}` : `D > ${rule!.k}/${rule!.tipo === 'K_SOBRE_N' ? 'n' : '(n−p)'} = ${lim.toFixed(4)}`;
          r = { ...base, grau: null, valor: maxCook, status: acima.length ? 'REQUER_ANALISE' : 'ATENDE',
            detalhe: `${acima.length ? `${acima.length} amostra(s) acima do limite operacional` : 'Nenhuma amostra acima do limite operacional'} (${regraTxt}; procedimento interno, não é limite normativo). Nenhuma amostra é excluída automaticamente.`,
            dados: { acima, limite: lim, regra: { ...rule, origem: rule!.origem ?? 'PROCEDIMENTO_INTERNO' } } };
        }
        break;
      }
      case 'OUTLIERS': {
        const maxStd = Math.max(...fit.residualsStd.map(Math.abs));
        r = { ...base, grau: null, valor: maxStd, status: 'REQUER_ANALISE', detalhe: `Maior |Resíduo/DP|: ${maxStd.toFixed(2)}. Classificação automática não validada — requer análise.` };
        break;
      }
      case 'MICRONUMEROSIDADE': {
        const dic = categoricalVariables(vars, th.tipos ?? CATEGORICAL_DEFAULT);
        if (!dic.length) { r = { ...base, grau: null, valor: null, status: 'NAO_APLICAVEL', detalhe: 'Sem variáveis que representem categorias discretas.' }; break; }
        const faixas: { n_max: number | null; minimo_abs?: number; minimo_pct?: number }[] = th.faixas ?? [];
        const faixa = [...faixas].sort((a, b) => (a.n_max ?? Infinity) - (b.n_max ?? Infinity)).find((f) => f.n_max === null || fit.n <= f.n_max);
        if (!faixa) { r = { ...base, grau: null, valor: null, status: 'NAO_VERIFICADO', detalhe: 'Política sem faixa aplicável.' }; break; }
        const minimo = faixa.minimo_abs ?? Math.ceil(((faixa.minimo_pct ?? 0) / 100) * fit.n - 1e-9);
        const itens = dic.map((v) => {
          const cats = new Map<number, number>();
          v.values.forEach((x) => cats.set(x, (cats.get(x) ?? 0) + 1));
          const menor = Math.min(...cats.values());
          return { code: v.code, tipo: v.tipo, categorias: Object.fromEntries(cats), menor, ok: menor >= minimo };
        });
        const bad = itens.filter((i) => !i.ok);
        r = { ...base, grau: null, valor: minimo, status: bad.length ? 'NAO_ATENDE' : 'ATENDE',
          detalhe: bad.length ? `Categoria com menos de ${minimo} dados: ${bad.map((b) => b.code).join(', ')}` : `Todas as categorias têm ao menos ${minimo} dados.`, dados: { itens, minimo, n: fit.n } };
        break;
      }
      default:
        r = { ...base, grau: null, valor: null, status: 'NAO_VERIFICADO', detalhe: 'Critério não implementado nesta versão do motor.' };
    }

    const rev = manualReviews[rule.codigo];
    if (rev && (r.status === 'REQUER_ANALISE' || rule.modo === 'MANUAL')) {
      r.revisado = true;
      r.status = rev === 'INCONCLUSIVO' ? 'REQUER_ANALISE' : rev;
      r.detalhe = `${r.detalhe} · Análise do profissional: ${rev === 'ATENDE' ? 'atende' : rev === 'NAO_ATENDE' ? 'não atende' : 'inconclusiva'}.`;
    }
    out.push(r);
  }

  const legacyItens = active.filter((r) => r.entra_fundamentacao).map((rule) => {
    const res = out.find((o) => o.codigo === rule.codigo)!;
    return { codigo: rule.codigo, nome: rule.nome, grau: res.status === 'NAO_ATENDE' ? null : res.grau };
  });
  const foundation = options.foundation ? evaluateFoundation(options.foundation, out, options.foundationGrades ?? {}) : null;
  const fundItens = foundation
    ? foundation.items.map((i) => ({ codigo: i.codigo, nome: i.titulo, grau: i.grade_achieved }))
    : legacyItens;
  const fundGrau = foundation ? foundation.summary.grade_calculated : (legacyItens.length ? minGrau(legacyItens.map((i) => i.grau)) : null);
  const prec = out.find((o) => o.codigo === 'PRECISAO');

  let overall: OverallStatus = 'APTO';
  if (out.some((o) => o.status === 'REQUER_ANALISE')) overall = 'APTO_COM_RESSALVAS';
  if (out.some((o) => o.status === 'NAO_ATENDE' && !o.bloqueante)) overall = 'REQUER_AJUSTES';
  if (out.some((o) => o.status === 'NAO_ATENDE' && o.bloqueante)) overall = 'BLOQUEADO';

  const impedimentos: string[] = [];
  if (foundation) {
    const g3 = foundation.summary.mandatory_requirements_json.find((m) => m.grau === 'III');
    if (g3 && !g3.atende) impedimentos.push(...g3.falhas.map((f) => `Fundamentação: ${f}`));
    for (const p of foundation.summary.pendencias) impedimentos.push(`Fundamentação: ${p}`);
  } else {
    for (const i of fundItens) if (i.grau !== 'III') impedimentos.push(`${i.nome}: ${i.grau ? `grau ${i.grau}` : 'não enquadra'}`);
  }
  if (prec && prec.grau !== 'III') impedimentos.push(`Precisão: ${prec.grau ? `grau ${prec.grau}` : 'não enquadra'}`);

  return {
    results: out,
    fundamentacao: { grau: fundGrau, itens: fundItens },
    foundation,
    precisao: { amplitudePct: prec?.valor ?? null, grau: prec?.grau ?? null },
    overall,
    pendentesRevisao: out.filter((o) => o.status === 'REQUER_ANALISE' && !o.revisado).map((o) => o.codigo),
    impedimentosGrauIII: [...new Set(impedimentos)],
  };
}

/**
 * Fundamentação por pontos conforme política versionada. Itens sem regra automática formalizada
 * (ou com critério que requer análise) ficam REQUER_ANALISE/NAO_VERIFICADO sem grau, até o profissional atribuir.
 */
export function evaluateFoundation(
  policy: FoundationPolicy,
  results: CriterionResult[],
  manual: Record<string, FoundationGrade>,
): { items: FoundationItem[]; summary: FoundationSummary } {
  const pts = (g: Grau | null) => (g ? Number(policy.pontos?.[g] ?? 0) : 0);
  const items: FoundationItem[] = [...policy.itens].sort((a, b) => a.item - b.item).map((def) => {
    const mg = manual[def.codigo];
    let grade: Grau | null = null; let status: CriterionStatus; const details: Record<string, unknown> = {};
    if (def.source_type === 'CRITERIO') {
      const res = results.find((r) => r.codigo === def.criterio);
      details.criterio = def.criterio ?? null;
      if (!res) { status = 'NAO_VERIFICADO'; details.motivo = 'Critério inativo na política.'; }
      else {
        details.criterio_status = res.status; details.criterio_grau = res.grau;
        if (res.status === 'NAO_ATENDE') { status = 'NAO_ATENDE'; }
        else if (res.status === 'ATENDE' && res.grau) { status = 'ATENDE'; grade = res.grau; }
        else { status = res.status === 'NAO_VERIFICADO' ? 'NAO_VERIFICADO' : 'REQUER_ANALISE'; }
      }
      if ((status === 'REQUER_ANALISE' || status === 'NAO_VERIFICADO') && mg) {
        details.grau_profissional = mg;
        if (mg === 'NAO_ENQUADRA') status = 'NAO_ATENDE'; else { status = 'ATENDE'; grade = mg; }
      }
    } else {
      if (!mg) { status = 'REQUER_ANALISE'; details.motivo = 'Sem regra automática formalizada: requer grau atribuído pelo profissional.'; }
      else { details.grau_profissional = mg; if (mg === 'NAO_ENQUADRA') status = 'NAO_ATENDE'; else { status = 'ATENDE'; grade = mg; } }
    }
    return { item_number: def.item, codigo: def.codigo, titulo: def.titulo, source_type: def.source_type, criterio_codigo: def.criterio ?? null,
      grade_achieved: grade, points: pts(grade), mandatory_for_grade: !!def.obrigatorio, status, details_json: details };
  });
  const total = items.reduce((s, i) => s + i.points, 0);
  const pendencias = items.filter((i) => i.status === 'REQUER_ANALISE' || i.status === 'NAO_VERIFICADO')
    .map((i) => `item ${i.item_number} (${i.titulo}) sem grau definido`);
  const ge = (g: Grau | null, min: Grau) => g !== null && ORDER[g] >= ORDER[min];
  const evals = [...policy.enquadramento].sort((a, b) => ORDER[b.grau] - ORDER[a.grau]).map((e) => {
    const falhas: string[] = [];
    const pontosOk = total >= e.pontos_min;
    if (!pontosOk) falhas.push(`grau ${e.grau} exige ${e.pontos_min} pontos (obtidos ${total})`);
    const obrig = items.filter((i) => i.mandatory_for_grade);
    const demais = items.filter((i) => !i.mandatory_for_grade);
    const obOk = obrig.every((i) => ge(i.grade_achieved, e.obrigatorios_grau_min));
    for (const i of obrig) if (!ge(i.grade_achieved, e.obrigatorios_grau_min)) falhas.push(`item ${i.item_number} (${i.titulo}) precisa de grau ${e.obrigatorios_grau_min} ou superior`);
    const deOk = demais.every((i) => ge(i.grade_achieved, e.demais_grau_min));
    for (const i of demais) if (!ge(i.grade_achieved, e.demais_grau_min)) falhas.push(`item ${i.item_number} (${i.titulo}) precisa de grau ${e.demais_grau_min} ou superior`);
    return { grau: e.grau, pontos_min: e.pontos_min, pontos_ok: pontosOk, obrigatorios_ok: obOk, demais_ok: deOk, atende: pontosOk && obOk && deOk, falhas };
  });
  const grade = pendencias.length ? null : (evals.find((e) => e.atende)?.grau ?? null);
  return {
    items,
    summary: { total_points: total, grade_calculated: grade, requirements_met: grade !== null, mandatory_requirements_json: evals, pendencias,
      policy_reference: policy.referencia ?? null },
  };
}
