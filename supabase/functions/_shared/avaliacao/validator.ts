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

export interface ValidationOutput {
  results: CriterionResult[];
  fundamentacao: { grau: Grau | null; itens: { codigo: string; nome: string; grau: Grau | null }[] };
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
        const faixas: { z: number; referencia: number; tolerancia?: number | null }[] = th.faixas ?? [];
        const itens = faixas.map((f) => {
          const obs = fit.normality.find((b) => Math.abs(b.z - f.z) < 1e-9)?.observed
            ?? fit.residualsStd.filter((e) => Math.abs(e) <= f.z).length / fit.n;
          const avaliada = f.tolerancia !== null && f.tolerancia !== undefined;
          return { z: f.z, referencia: f.referencia, tolerancia: f.tolerancia ?? null, observado: obs, ok: avaliada ? Math.abs(obs - f.referencia) <= f.tolerancia! + 1e-12 : null };
        });
        const ev = itens.filter((i) => i.ok !== null);
        const fail = ev.some((i) => !i.ok);
        r = { ...base, grau: null, valor: itens[0]?.observado ?? null,
          status: ev.length === 0 ? 'NAO_VERIFICADO' : fail ? ((th.status_fora as CriterionStatus) ?? 'REQUER_ANALISE') : 'ATENDE',
          detalhe: itens.map((i) => `±${String(i.z).replace('.', ',')}σ: ${pct(i.observado)} (ref. ${pct(i.referencia)})`).join(' · '),
          dados: { itens } };
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
        const lim = th.cook_limite;
        const maxCook = Math.max(...fit.cook);
        if (lim === null || lim === undefined) {
          r = { ...base, grau: null, valor: maxCook, status: 'NAO_VERIFICADO', detalhe: `Maior distância de Cook: ${maxCook.toFixed(4)} (sem limite configurado na política).` };
        } else {
          const acima = fit.cook.map((c, i) => ({ id: fit.sampleIds[i], c })).filter((x) => x.c > Number(lim));
          r = { ...base, grau: null, valor: maxCook, status: acima.length ? 'REQUER_ANALISE' : 'ATENDE',
            detalhe: acima.length ? `${acima.length} amostra(s) acima do limite operacional ${lim}.` : 'Nenhuma amostra acima do limite operacional.', dados: { acima } };
        }
        break;
      }
      case 'OUTLIERS': {
        const maxStd = Math.max(...fit.residualsStd.map(Math.abs));
        r = { ...base, grau: null, valor: maxStd, status: 'REQUER_ANALISE', detalhe: `Maior |Resíduo/DP|: ${maxStd.toFixed(2)}. Classificação automática não validada — requer análise.` };
        break;
      }
      case 'MICRONUMEROSIDADE': {
        const dic = vars.filter((v) => v.tipo === 'DICOTOMICA');
        if (!dic.length) { r = { ...base, grau: null, valor: null, status: 'NAO_APLICAVEL', detalhe: 'Sem variáveis dicotômicas.' }; break; }
        const faixas: { n_max: number | null; minimo_abs?: number; minimo_pct?: number }[] = th.faixas ?? [];
        const faixa = [...faixas].sort((a, b) => (a.n_max ?? Infinity) - (b.n_max ?? Infinity)).find((f) => f.n_max === null || fit.n <= f.n_max);
        if (!faixa) { r = { ...base, grau: null, valor: null, status: 'NAO_VERIFICADO', detalhe: 'Política sem faixa aplicável.' }; break; }
        const minimo = faixa.minimo_abs ?? Math.ceil(((faixa.minimo_pct ?? 0) / 100) * fit.n);
        const itens = dic.map((v) => {
          const cats = new Map<number, number>();
          v.values.forEach((x) => cats.set(x, (cats.get(x) ?? 0) + 1));
          const menor = Math.min(...cats.values());
          return { code: v.code, categorias: Object.fromEntries(cats), menor, ok: menor >= minimo };
        });
        const bad = itens.filter((i) => !i.ok);
        r = { ...base, grau: null, valor: minimo, status: bad.length ? 'NAO_ATENDE' : 'ATENDE',
          detalhe: bad.length ? `Categoria com menos de ${minimo} dados: ${bad.map((b) => b.code).join(', ')}` : `Todas as categorias têm ao menos ${minimo} dados.`, dados: { itens } };
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

  const fundItens = active.filter((r) => r.entra_fundamentacao).map((rule) => {
    const res = out.find((o) => o.codigo === rule.codigo)!;
    return { codigo: rule.codigo, nome: rule.nome, grau: res.status === 'NAO_ATENDE' ? null : res.grau };
  });
  const fundGrau = fundItens.length ? minGrau(fundItens.map((i) => i.grau)) : null;
  const prec = out.find((o) => o.codigo === 'PRECISAO');

  let overall: OverallStatus = 'APTO';
  if (out.some((o) => o.status === 'REQUER_ANALISE')) overall = 'APTO_COM_RESSALVAS';
  if (out.some((o) => o.status === 'NAO_ATENDE' && !o.bloqueante)) overall = 'REQUER_AJUSTES';
  if (out.some((o) => o.status === 'NAO_ATENDE' && o.bloqueante)) overall = 'BLOQUEADO';

  const impedimentos: string[] = [];
  for (const i of fundItens) if (i.grau !== 'III') impedimentos.push(`${i.nome}: ${i.grau ? `grau ${i.grau}` : 'não enquadra'}`);
  if (prec && prec.grau !== 'III') impedimentos.push(`Precisão: ${prec.grau ? `grau ${prec.grau}` : 'não enquadra'}`);

  return {
    results: out,
    fundamentacao: { grau: fundGrau, itens: fundItens },
    precisao: { amplitudePct: prec?.valor ?? null, grau: prec?.grau ?? null },
    overall,
    pendentesRevisao: out.filter((o) => o.status === 'REQUER_ANALISE' && !o.revisado).map((o) => o.codigo),
    impedimentosGrauIII: impedimentos,
  };
}
