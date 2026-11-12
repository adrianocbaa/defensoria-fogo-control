// Rodada 2 — normalidade 68/90/95, micronumerosidade, Cook operacional, fundamentação por pontos,
// tabelas derivadas = output_json, exploração ampla e limite configurável de candidatos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Set, Infinity, NaN, String, require: n => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const E = load('supabase/functions/_shared/avaliacao/engine.ts');
const V = load('supabase/functions/_shared/avaliacao/validator.ts', { './engine.ts': E });
const D = load('supabase/functions/_shared/avaliacao/derived.ts', { './engine.ts': E, './validator.ts': V });
const C = load('supabase/functions/_shared/avaliacao/candidates.ts', { './engine.ts': E });
const cases = JSON.parse(read('tests/fixtures/avaliacao-engine-cases.json'));
const BANDS = [{ grau: 'III', maxAmplitudePct: 30 }, { grau: 'II', maxAmplitudePct: 40 }, { grau: 'I', maxAmplitudePct: 50 }];
const rule = (codigo, thresholds, extra = {}) => ({ codigo, numero: 1, nome: codigo, origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: false, entra_fundamentacao: false, thresholds, ativo: true, ...extra });

// ---------------------------------------------------------------- normalidade
const NORM_TH = {
  faixas: [{ z: 1, referencia: 0.68, tolerancia: 0.02 }, { z: 1.64, referencia: 0.90, tolerancia: null }, { z: 1.96, referencia: 0.95, tolerancia: null }],
  comparacao_sem_tolerancia: 'MINIMO', status_fora: 'REQUER_ANALISE',
};
const fit0 = E.fitRegression(cases[0].input);
const withNorm = (obs) => ({ ...fit0, normality: [{ z: 1, observed: obs[0] }, { z: 1.64, observed: obs[1] }, { z: 1.96, observed: obs[2] }] });
const norm = (obs, th = NORM_TH) => V.validateModel(withNorm(obs), null, [], cases[0].input.dependent, [rule('NORMALIDADE', th)], {}).results[0];

test('normalidade: as três faixas participam do resultado (68 ±2 p.p., 90 e 95 pela política)', () => {
  assert.equal(norm([0.69, 0.91, 0.96]).status, 'ATENDE');
  const n68 = norm([0.72, 0.91, 0.96]);
  assert.equal(n68.status, 'REQUER_ANALISE');
  assert.deepEqual(n68.dados.itens.map(i => i.status), ['FORA', 'ATENDE', 'ATENDE']);
  const n90 = norm([0.68, 0.85, 0.96]);
  assert.equal(n90.status, 'REQUER_ANALISE', '90% abaixo da referência precisa afetar o critério');
  assert.deepEqual(n90.dados.itens.map(i => i.status), ['ATENDE', 'FORA', 'ATENDE']);
  const n95 = norm([0.68, 0.92, 0.93]);
  assert.equal(n95.status, 'REQUER_ANALISE', '95% abaixo da referência precisa afetar o critério');
  assert.deepEqual(n95.dados.itens.map(i => i.status), ['ATENDE', 'ATENDE', 'FORA']);
});

test('normalidade: falhas combinadas e limites 66% e 70% inclusivos', () => {
  const all = norm([0.60, 0.85, 0.90]);
  assert.deepEqual(all.dados.itens.map(i => i.status), ['FORA', 'FORA', 'FORA']);
  assert.equal(all.status, 'REQUER_ANALISE');
  assert.equal(norm([0.66, 0.90, 0.95]).status, 'ATENDE');
  assert.equal(norm([0.70, 0.90, 0.95]).status, 'ATENDE');
  assert.equal(norm([0.6599, 0.90, 0.95]).status, 'REQUER_ANALISE');
  const it = norm([0.69, 0.91, 0.96]).dados.itens[0];
  assert.equal(it.limite_inferior, 0.66); assert.equal(it.limite_superior, 0.70);
});

test('normalidade: faixa sem tolerância e sem regra na política não é ignorada (requer análise)', () => {
  const th = { faixas: NORM_TH.faixas, status_fora: 'REQUER_ANALISE' };
  const r = norm([0.69, 0.99, 0.99], th);
  assert.equal(r.status, 'REQUER_ANALISE');
  assert.deepEqual(r.dados.itens.map(i => i.status), ['ATENDE', 'NAO_VERIFICADO', 'NAO_VERIFICADO']);
  assert.equal(norm([0.69, 0.91, 0.96], { faixas: [] }).status, 'NAO_VERIFICADO');
});

// ---------------------------------------------------------------- micronumerosidade
const MICRO_TH = { tipos: ['DICOTOMICA', 'PROXY', 'CODIGO_ALOCADO'], faixas: [{ n_max: 30, minimo_abs: 3 }, { n_max: 100, minimo_pct: 10 }, { n_max: null, minimo_abs: 10 }] };
const stubFit = (n) => ({ n, k: 1, p: 2, coefficients: [{ code: '(intercepto)' }, { code: 'x', beta: 1, pValue: 0, t: 5 }] });
const micro = (n, vars) => V.validateModel(stubFit(n), null, vars, { transform: 'DIRECT' }, [rule('MICRONUMEROSIDADE', MICRO_TH)], {}).results[0];
const catVals = (n, small) => Array.from({ length: n }, (_, i) => (i < small ? 1 : 0));

test('micronumerosidade: DICOTOMICA, PROXY e CODIGO_ALOCADO até 30 dados exigem 3 por categoria', () => {
  for (const tipo of ['DICOTOMICA', 'PROXY', 'CODIGO_ALOCADO']) {
    const bad = micro(24, [{ code: 'v', tipo, relacao_esperada: 'INDEFINIDA', transform: 'DIRECT', values: catVals(24, 2) }]);
    assert.equal(bad.status, 'NAO_ATENDE', tipo); assert.equal(bad.valor, 3);
    assert.equal(micro(24, [{ code: 'v', tipo, relacao_esperada: 'INDEFINIDA', transform: 'DIRECT', values: catVals(24, 3) }]).status, 'ATENDE', tipo);
  }
});

test('micronumerosidade: 31–100 dados exigem 10% de n; acima de 100, 10 por categoria', () => {
  const v = (n, small) => [{ code: 'g', tipo: 'CODIGO_ALOCADO', relacao_esperada: 'INDEFINIDA', transform: 'DIRECT', values: catVals(n, small) }];
  assert.equal(micro(40, v(40, 3)).status, 'NAO_ATENDE'); assert.equal(micro(40, v(40, 3)).valor, 4);
  assert.equal(micro(40, v(40, 4)).status, 'ATENDE');
  assert.equal(micro(100, v(100, 9)).status, 'NAO_ATENDE'); assert.equal(micro(100, v(100, 10)).status, 'ATENDE');
  assert.equal(micro(150, v(150, 9)).valor, 10); assert.equal(micro(150, v(150, 9)).status, 'NAO_ATENDE');
  assert.equal(micro(150, v(150, 10)).status, 'ATENDE');
});

test('micronumerosidade: quantitativas contínuas e proxy marcada como não categórica ficam fora', () => {
  const q = micro(24, [{ code: 'area', tipo: 'QUANTITATIVA', relacao_esperada: 'POSITIVA', transform: 'DIRECT', values: catVals(24, 1) }]);
  assert.equal(q.status, 'NAO_APLICAVEL');
  const p = micro(24, [{ code: 'renda', tipo: 'PROXY', categorica: false, relacao_esperada: 'POSITIVA', transform: 'DIRECT', values: catVals(24, 1) }]);
  assert.equal(p.status, 'NAO_APLICAVEL');
  const d = micro(24, [{ code: 'd', tipo: 'DICOTOMICA', categorica: false, relacao_esperada: 'INDEFINIDA', transform: 'DIRECT', values: catVals(24, 1) }]);
  assert.equal(d.status, 'NAO_ATENDE', 'dicotômica é sempre categórica');
});

// ---------------------------------------------------------------- Cook
test('Cook: limite operacional versionado (procedimento interno) sinaliza sem excluir amostras', () => {
  const r = (th, opts) => V.validateModel(fit0, null, [], cases[0].input.dependent, [rule('PONTOS_INFLUENTES', th, { origem: 'PROCEDIMENTO_INTERNO', modo: 'ASSISTIDO' })], {}, opts).results[0];
  assert.equal(r({ cook_limite: null }).status, 'NAO_VERIFICADO');
  const k4 = r({ cook_regra: { tipo: 'K_SOBRE_N', k: 4, origem: 'PROCEDIMENTO_INTERNO' } });
  assert.equal(k4.dados.limite, 4 / fit0.n);
  const expected = fit0.cook.filter(c => c > 4 / fit0.n).length;
  assert.equal(k4.dados.acima.length, expected);
  assert.equal(k4.status, expected ? 'REQUER_ANALISE' : 'ATENDE');
  const maxCook = Math.max(...fit0.cook);
  const fixo = r({ cook_regra: { tipo: 'FIXO', valor: maxCook * 0.999 } });
  assert.equal(fixo.status, 'REQUER_ANALISE');
  assert.equal(fixo.dados.acima.length, 1);
  const a = fixo.dados.acima[0]; const i = fit0.cook.indexOf(maxCook);
  assert.equal(a.amostra_id, fit0.sampleIds[i]); assert.equal(a.cook, maxCook);
  assert.equal(a.leverage, fit0.leverage[i]); assert.equal(a.residuo_dp, fit0.residualsStd[i]); assert.equal(a.residuo_relativo, fit0.residualsRelative[i]);
  assert.match(fixo.detalhe, /procedimento interno/); assert.match(fixo.detalhe, /excluída automaticamente/);
  assert.equal(r({ cook_regra: { tipo: 'FIXO', valor: maxCook + 1 } }).status, 'ATENDE');
  // configuração da organização prevalece sobre a política
  const org = r({ cook_regra: { tipo: 'FIXO', valor: maxCook + 1 } }, { cookRule: { tipo: 'FIXO', valor: maxCook * 0.999 } });
  assert.equal(org.status, 'REQUER_ANALISE');
  assert.equal(V.resolveCookLimit({ tipo: 'K_SOBRE_N_MENOS_P', k: 4 }, 24, 4), 0.2);
});

// ---------------------------------------------------------------- fundamentação
const FOUND = {
  referencia: 'ABNT NBR 14653-2 (tabela de fundamentação — conferir edição vigente)', pontos: { III: 3, II: 2, I: 1 },
  itens: [
    { item: 1, codigo: 'CARACTERIZACAO_AVALIANDO', titulo: 'Caracterização do imóvel avaliando', source_type: 'MANUAL' },
    { item: 2, codigo: 'QUANTIDADE_DADOS', titulo: 'Quantidade de dados', source_type: 'CRITERIO', criterio: 'NUMERO_DADOS', obrigatorio: true },
    { item: 3, codigo: 'IDENTIFICACAO_DADOS', titulo: 'Identificação dos dados', source_type: 'MANUAL' },
    { item: 4, codigo: 'EXTRAPOLACAO', titulo: 'Extrapolação', source_type: 'CRITERIO', criterio: 'EXTRAPOLACAO', obrigatorio: true },
    { item: 5, codigo: 'SIGNIF_REGRESSORES', titulo: 'Significância dos regressores', source_type: 'CRITERIO', criterio: 'SIGNIF_REGRESSORES', obrigatorio: true },
    { item: 6, codigo: 'SIGNIF_MODELO', titulo: 'Significância do modelo', source_type: 'CRITERIO', criterio: 'SIGNIF_MODELO', obrigatorio: true },
  ],
  enquadramento: [
    { grau: 'III', pontos_min: 16, obrigatorios_grau_min: 'III', demais_grau_min: 'II' },
    { grau: 'II', pontos_min: 10, obrigatorios_grau_min: 'II', demais_grau_min: 'I' },
    { grau: 'I', pontos_min: 6, obrigatorios_grau_min: 'I', demais_grau_min: 'I' },
  ],
};
const res = (map) => Object.entries(map).map(([codigo, [status, grau]]) => ({ codigo, status, grau }));
const ALL3 = { NUMERO_DADOS: ['ATENDE', 'III'], EXTRAPOLACAO: ['ATENDE', 'III'], SIGNIF_REGRESSORES: ['ATENDE', 'III'], SIGNIF_MODELO: ['ATENDE', 'III'] };

test('fundamentação: soma de pontos e itens obrigatórios da política, não o menor grau estatístico', () => {
  const g3 = V.evaluateFoundation(FOUND, res(ALL3), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'II' });
  assert.equal(g3.summary.total_points, 17); assert.equal(g3.summary.grade_calculated, 'III'); assert.equal(g3.summary.requirements_met, true);
  // todos os critérios estatísticos em III, mas item 1 em grau I: não atinge III (demais ≥ II) → II
  const g2 = V.evaluateFoundation(FOUND, res(ALL3), { CARACTERIZACAO_AVALIANDO: 'I', IDENTIFICACAO_DADOS: 'III' });
  assert.equal(g2.summary.total_points, 16); assert.equal(g2.summary.grade_calculated, 'II');
  assert.ok(g2.summary.mandatory_requirements_json.find(m => m.grau === 'III').falhas.some(f => /item 1/.test(f)));
  // obrigatório em II segura no grau II mesmo com pontos suficientes
  const g2b = V.evaluateFoundation(FOUND, res({ ...ALL3, SIGNIF_REGRESSORES: ['ATENDE', 'II'] }), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III' });
  assert.equal(g2b.summary.total_points, 17); assert.equal(g2b.summary.grade_calculated, 'II');
  const g1 = V.evaluateFoundation(FOUND, res({ NUMERO_DADOS: ['ATENDE', 'I'], EXTRAPOLACAO: ['ATENDE', 'III'], SIGNIF_REGRESSORES: ['ATENDE', 'I'], SIGNIF_MODELO: ['ATENDE', 'I'] }), { CARACTERIZACAO_AVALIANDO: 'I', IDENTIFICACAO_DADOS: 'I' });
  assert.equal(g1.summary.total_points, 8); assert.equal(g1.summary.grade_calculated, 'I');
});

test('fundamentação: itens sem regra formalizada ficam sem grau automático até o profissional decidir', () => {
  const pend = V.evaluateFoundation(FOUND, res(ALL3), {});
  assert.equal(pend.summary.grade_calculated, null); assert.equal(pend.summary.requirements_met, false);
  assert.equal(pend.items.find(i => i.codigo === 'CARACTERIZACAO_AVALIANDO').status, 'REQUER_ANALISE');
  assert.equal(pend.items.find(i => i.codigo === 'CARACTERIZACAO_AVALIANDO').grade_achieved, null);
  assert.equal(pend.summary.pendencias.length, 2);
  // extrapolação que requer análise não ganha grau automático
  const ex = V.evaluateFoundation(FOUND, res({ ...ALL3, EXTRAPOLACAO: ['REQUER_ANALISE', 'II'] }), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III' });
  assert.equal(ex.items.find(i => i.codigo === 'EXTRAPOLACAO').grade_achieved, null);
  assert.equal(ex.summary.grade_calculated, null);
  const exm = V.evaluateFoundation(FOUND, res({ ...ALL3, EXTRAPOLACAO: ['REQUER_ANALISE', null] }), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III', EXTRAPOLACAO: 'II' });
  assert.equal(exm.items.find(i => i.codigo === 'EXTRAPOLACAO').grade_achieved, 'II'); assert.equal(exm.summary.grade_calculated, 'II');
  // grau automático não é sobrescrito pelo profissional
  const ov = V.evaluateFoundation(FOUND, res(ALL3), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III', SIGNIF_MODELO: 'I' });
  assert.equal(ov.items.find(i => i.codigo === 'SIGNIF_MODELO').grade_achieved, 'III');
  // critério não atendido → não enquadra
  const na = V.evaluateFoundation(FOUND, res({ ...ALL3, SIGNIF_MODELO: ['NAO_ATENDE', null] }), { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III' });
  assert.equal(na.summary.grade_calculated, null); assert.equal(na.items.find(i => i.codigo === 'SIGNIF_MODELO').status, 'NAO_ATENDE');
});

test('validateModel usa o resumo estruturado como grau de fundamentação e lista impedimentos ao Grau III', () => {
  const rules = [
    rule('SIGNIF_REGRESSORES', { graus: [{ grau: 'III', max: 0.10 }, { grau: 'II', max: 0.20 }, { grau: 'I', max: 0.30 }] }),
    rule('SIGNIF_MODELO', { graus: [{ grau: 'III', max: 0.01 }, { grau: 'II', max: 0.02 }, { grau: 'I', max: 0.05 }] }),
    rule('NUMERO_DADOS', { graus: [{ grau: 'III', multiplicador: 6 }, { grau: 'II', multiplicador: 4 }, { grau: 'I', multiplicador: 3 }] }),
  ];
  const out = V.validateModel(fit0, null, [], cases[0].input.dependent, rules, {}, { foundation: FOUND, foundationGrades: { CARACTERIZACAO_AVALIANDO: 'III', IDENTIFICACAO_DADOS: 'III' } });
  assert.ok(out.foundation);
  assert.equal(out.fundamentacao.grau, out.foundation.summary.grade_calculated);
  assert.equal(out.foundation.items.length, 6);
  assert.ok(out.impedimentosGrauIII.some(t => /Fundamentação/.test(t)), 'extrapolação inativa deixa item pendente e impede Grau III');
});

// ---------------------------------------------------------------- tabelas derivadas
test('tabelas estatísticas derivadas reproduzem exatamente a saída do motor (output_json)', () => {
  const c = cases[0];
  const fit = E.fitRegression(c.input);
  const proj = E.project(fit, c.input, c.avaliando, 0.8, BANDS);
  const output = JSON.parse(JSON.stringify({ fit, preliminary_projection: proj, preliminary_projection_error: null }));
  const d = D.deriveStatTables(output, c.input, NORM_TH);
  const f = output.fit;
  assert.equal(d.residuos.length, f.n);
  d.residuos.forEach((r, i) => {
    assert.equal(r.amostra_id, f.sampleIds[i]); assert.equal(r.observado_original, f.yOriginal[i]);
    assert.equal(r.estimado_original, f.estimatedOriginal[i]); assert.equal(r.observado_transformado, f.yTransformed[i]);
    assert.equal(r.estimado_transformado, f.yhat[i]); assert.equal(r.residuo, f.residuals[i]); assert.equal(r.residuo_relativo, f.residualsRelative[i]);
    assert.equal(r.residuo_dp, f.residualsStd[i]); assert.equal(r.leverage, f.leverage[i]); assert.equal(r.cook, f.cook[i]);
  });
  assert.deepEqual(d.anova.map(a => [a.fonte, a.sq, a.gl, a.mq, a.f, a.significancia]), f.anova.map(a => [a.source, a.ss, a.df, a.ms, a.f, a.p]));
  assert.equal(d.anova[0].sq, f.ssr); assert.equal(d.anova[1].sq, f.sse); assert.equal(d.anova[2].sq, f.sst);
  assert.equal(d.anova[0].f, f.f); assert.equal(d.anova[0].significancia, f.fPValue); assert.equal(d.anova[1].mq, f.mse);
  assert.deepEqual(d.normalidade.map(n => n.observado), f.normality.map(b => b.observed));
  assert.deepEqual(d.normalidade.map(n => n.referencia), [0.68, 0.90, 0.95]);
  const k = f.correlation.codes.length;
  assert.equal(d.correlacoes.length, (k * (k - 1)) / 2);
  for (const r of d.correlacoes) assert.equal(r.correlacao, f.correlation.matrix[f.correlation.codes.indexOf(r.variavel_a)][f.correlation.codes.indexOf(r.variavel_b)]);
  assert.deepEqual(d.estatisticas.map(s => [s.variavel, s.minimo, s.maximo, s.media, s.desvio_padrao]), f.variableStats.map(s => [s.code, s.min, s.max, s.mean, s.stdDev]));
  assert.deepEqual(d.extrapolacoes.map(e => [e.variavel, e.valor_avaliando, e.min_amostra, e.max_amostra, e.inside]), output.preliminary_projection.extrapolation.map(e => [e.code, e.value, e.min, e.max, e.inside]));
});

test('motor 1.1: ANOVA fecha (SQreg + SQres = SQtotal) e estatísticas batem com as amplitudes', () => {
  assert.equal(E.ENGINE_VERSION, '1.1.1');
  const [reg, resid, tot] = fit0.anova;
  assert.ok(Math.abs(reg.ss + resid.ss - tot.ss) <= 1e-9 * tot.ss);
  assert.equal(reg.df + resid.df, tot.df);
  for (const s of fit0.variableStats) { assert.equal(s.min, fit0.ranges[s.code].min); assert.equal(s.max, fit0.ranges[s.code].max); }
});

// ---------------------------------------------------------------- candidatos
const SETTINGS = { assisted_candidate_soft_limit: 30, exploration_candidate_soft_limit: 200, hard_limit: 1000, require_confirmation_over: 100 };
const vA = { id: 'a', code: 'area', transforms: ['DIRECT', 'LN', 'INVERSE'], obrigatoria: true, values: [10, 20, 30] };
const vB = { id: 'b', code: 'idade', transforms: ['DIRECT', 'LN', 'SQRT'], obrigatoria: false, values: [0, 5, 9] }; // LN inválido (0)
const vC = { id: 'c', code: 'padrao', transforms: ['DIRECT'], obrigatoria: false, values: [0, 1, 1] };
const dep = { transforms: ['DIRECT', 'LN', 'INVERSE'], selected: ['LN'], values: [100, 200, 300] };

test('exploração ampla: todas as transformações autorizadas válidas, sem escolher melhor modelo', () => {
  const amp = C.buildCandidates('AMPLA', dep, [vA, vB, vC]);
  const est = C.estimateCandidates('AMPLA', dep, [vA, vB, vC]);
  // dep: 3 · combinações (3+1)(2+1)(1+1) − 1 = 23
  assert.equal(est.total, 3 * 23); assert.equal(amp.length, est.total); assert.equal(est.descartadasDominio, 1);
  assert.ok(amp.every(c => c.vars.every(([id, t]) => !(id === 'b' && t === 'LN'))), 'respeita domínio');
  assert.deepEqual([...new Set(amp.map(c => c.depT))].sort(), ['DIRECT', 'INVERSE', 'LN']);
  assert.ok(amp.some(c => !c.vars.some(([id]) => id === 'a')), 'na ampla, obrigatoriedade do assistido não restringe');
  assert.ok(amp.every(c => !('score' in c)));
});

test('assistido: dependente escolhida e variáveis obrigatórias em todos os candidatos', () => {
  const as = C.buildCandidates('ASSISTIDO', dep, [vA, vB, vC]);
  assert.equal(as.length, C.estimateCandidates('ASSISTIDO', dep, [vA, vB, vC]).total);
  assert.equal(as.length, 1 * 3 * 3 * 2);
  assert.ok(as.every(c => c.depT === 'LN' && c.vars.some(([id]) => id === 'a')));
});

test('limite de candidatos configurável por organização, sem teto fixo de 30', () => {
  assert.deepEqual({ ...C.evaluateCandidateLimit(31, 'ASSISTIDO', SETTINGS) }, { ok: true, softLimit: 30, requiresConfirmation: true });
  assert.equal(C.evaluateCandidateLimit(31, 'ASSISTIDO', { ...SETTINGS, assisted_candidate_soft_limit: 50 }).requiresConfirmation, false);
  assert.equal(C.evaluateCandidateLimit(150, 'AMPLA', SETTINGS).requiresConfirmation, true, 'acima de require_confirmation_over');
  assert.equal(C.evaluateCandidateLimit(90, 'AMPLA', SETTINGS).requiresConfirmation, false);
  assert.equal(C.evaluateCandidateLimit(1001, 'AMPLA', SETTINGS).ok, false);
  assert.equal(C.evaluateCandidateLimit(5000, 'AMPLA', { ...SETTINGS, hard_limit: null, require_confirmation_over: null, exploration_candidate_soft_limit: 10000 }).ok, true);
  assert.equal(C.evaluateCandidateLimit(0, 'AMPLA', SETTINGS).ok, false);
});

test('candidatos: POWER fica restrita ao modo Manual (exige expoente do profissional)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(C.validTransforms(['POWER', 'DIRECT', 'LN'], [1, 2, 3]))), ['DIRECT', 'LN']);
});
