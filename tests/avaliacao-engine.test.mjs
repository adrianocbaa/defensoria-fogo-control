import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Infinity, NaN, String, require: n => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const E = load('supabase/functions/_shared/avaliacao/engine.ts');
const V = load('supabase/functions/_shared/avaliacao/validator.ts', { './engine.ts': E });
const cases = JSON.parse(read('tests/fixtures/avaliacao-engine-cases.json'));
const close = (a, b, rel = 1e-8, msg = '') => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${msg}: ${a} != ${b}`);
const BANDS = [{ grau: 'III', maxAmplitudePct: 30 }, { grau: 'II', maxAmplitudePct: 40 }, { grau: 'I', maxAmplitudePct: 50 }];

test('distributions match reference values', () => {
  close(E.studentTwoTailedP(2.0, 10), 0.07338803477074464, 1e-9, 't p');
  close(E.fUpperP(4, 2, 10), 0.052922149401344654, 1e-9, 'F p');
  close(E.studentTCritical(0.8, 20), 1.325340706985046, 1e-9, 't crit');
});

for (const c of cases) {
  test(`OLS parity with independent numpy/scipy computation — ${c.name}`, () => {
    const fit = E.fitRegression(c.input);
    const x = c.expected;
    fit.coefficients.forEach((co, j) => {
      close(co.beta, x.beta[j], 1e-8, 'beta'); close(co.stdError, x.se[j], 1e-8, 'se');
      close(co.t, x.t[j], 1e-8, 't'); close(co.pValue, x.p[j], 1e-7, 'p');
    });
    for (const k of ['sse', 'sst', 'ssr', 'mse', 'r2', 'r2Adj', 'f', 'rEstimativa']) close(fit[k], x[k], 1e-8, k);
    close(fit.fPValue, x.fP, 1e-6, 'fP');
    fit.leverage.forEach((h, i) => close(h, x.leverage[i], 1e-8, 'h'));
    fit.cook.forEach((d, i) => close(d, x.cook[i], 1e-7, 'cook'));
    fit.residualsStd.forEach((r, i) => close(r, fit.residuals[i] / Math.sqrt(fit.mse), 1e-12, 'res/dp'));
    const pr = E.project(fit, c.input, c.avaliando, c.level, BANDS);
    close(pr.z0, x.z0, 1e-9, 'z0'); close(pr.seMean, x.seMean, 1e-8, 'seMean'); close(pr.tCritical, x.tCritical, 1e-9, 'tc');
    x.centers.forEach((ec, i) => {
      const gc = pr.centers[i];
      assert.equal(gc.center, ec.center);
      close(gc.value, ec.value, 1e-8, 'center'); close(gc.lower, ec.lower, 1e-8, 'L'); close(gc.upper, ec.upper, 1e-8, 'U');
    });
    assert.equal(pr.predictionInterval.status, 'NOT_VALIDATED');
  });
}

test('log response: mode < median < mean and each IC shifted by its own correction', () => {
  const c = cases[0];
  const fit = E.fitRegression(c.input);
  const pr = E.project(fit, c.input, c.avaliando, 0.8, BANDS);
  const [mo, me, mn] = pr.centers;
  assert.ok(mo.value < me.value && me.value < mn.value);
  close(mo.lower / me.lower, Math.exp(-(fit.s ** 2)), 1e-12, 'mode IC shift');
  close(mn.upper / me.upper, Math.exp(fit.s ** 2 / 2), 1e-12, 'mean IC shift');
  close(mo.value, Math.exp(pr.z0 - fit.s ** 2), 1e-12, 'mode formula');
});

test('precision amplitude formula and classification III<=30 II<=40 I<=50 using integral value', () => {
  close(E.amplitudePct(100, 85, 115), 30, 1e-12, 'amp');
  assert.equal(E.classifyPrecision(30, BANDS), 'III');
  assert.equal(E.classifyPrecision(30.0000001, BANDS), 'II');
  assert.equal(E.classifyPrecision(40, BANDS), 'II');
  assert.equal(E.classifyPrecision(50, BANDS), 'I');
  assert.equal(E.classifyPrecision(50.01, BANDS), null);
});

test('degenerate inputs never produce silent results', () => {
  const base = cases[0].input;
  const code = fn => { try { fn(); return 'none'; } catch (e) { return e.code; } };
  assert.equal(code(() => E.fitRegression({ ...base, sampleIds: base.sampleIds.slice(0, 4), dependent: { ...base.dependent, values: base.dependent.values.slice(0, 4) }, independents: base.independents.map(v => ({ ...v, values: v.values.slice(0, 4) })) })), 'N_LE_P');
  assert.equal(code(() => E.fitRegression({ ...base, independents: [{ code: 'z', transform: 'DIRECT', values: base.sampleIds.map(() => 5) }] })), 'ZERO_VARIANCE');
  assert.equal(code(() => E.fitRegression({ ...base, independents: [{ ...base.independents[1], transform: 'LN' }] })), 'INVALID_DOMAIN');
  const a = base.independents[0];
  assert.equal(code(() => E.fitRegression({ ...base, independents: [a, { ...a, code: 'dup' }] })), 'RANK_DEFICIENT');
  assert.equal(code(() => E.fitRegression({ ...base, independents: [{ ...a, values: a.values.map((v, i) => i === 0 ? Infinity : v) }] })), 'NON_FINITE');
  assert.equal(code(() => E.applyTransform('POWER', 2)), 'INVALID_DOMAIN');
});

test('transform engine mapping is stable', () => {
  assert.deepEqual({ ...E.TRANSFORM_ENGINE_CODE }, { POWER: 0, DIRECT: 1, INVERSE: 2, LN: 3, SQUARE: 4, SQRT: 5, INV_SQUARE: 6, INV_SQRT: 7 });
});

const RULES = [
  { codigo: 'RELACIONAMENTO', numero: 1, nome: 'Relacionamento', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: false, entra_fundamentacao: false, thresholds: {}, ativo: true },
  { codigo: 'SIGNIF_REGRESSORES', numero: 2, nome: 'Significância dos regressores', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: true, entra_fundamentacao: true, thresholds: { graus: [{ grau: 'III', max: 0.10 }, { grau: 'II', max: 0.20 }, { grau: 'I', max: 0.30 }] }, ativo: true },
  { codigo: 'SIGNIF_MODELO', numero: 3, nome: 'Significância do modelo', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: true, entra_fundamentacao: true, thresholds: { graus: [{ grau: 'III', max: 0.01 }, { grau: 'II', max: 0.02 }, { grau: 'I', max: 0.05 }] }, ativo: true },
  { codigo: 'NUMERO_DADOS', numero: 7, nome: 'Número de dados', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: true, entra_fundamentacao: true, thresholds: { graus: [{ grau: 'III', multiplicador: 6 }, { grau: 'II', multiplicador: 4 }, { grau: 'I', multiplicador: 3 }] }, ativo: true },
  { codigo: 'HOMOCEDASTICIDADE', numero: 10, nome: 'Homocedasticidade', origem: 'NORMA_TECNICA', modo: 'MANUAL', bloqueante: false, entra_fundamentacao: false, thresholds: {}, ativo: true },
  { codigo: 'MICRONUMEROSIDADE', numero: 13, nome: 'Micronumerosidade', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: false, entra_fundamentacao: false, thresholds: { faixas: [{ n_max: 30, minimo_abs: 3 }, { n_max: 100, minimo_pct: 10 }, { n_max: null, minimo_abs: 10 }] }, ativo: true },
];

test('validator: number of data per grade uses 6/4/3 × (k+1) from policy', () => {
  const c = cases[0];
  const fit = E.fitRegression(c.input); // n=24, k=3 → III needs 24
  const vars = c.input.independents.map(v => ({ code: v.code, tipo: v.code === 'padrao' ? 'DICOTOMICA' : 'QUANTITATIVA', relacao_esperada: 'POSITIVA', transform: v.transform, values: v.values }));
  const out = V.validateModel(fit, null, vars, c.input.dependent, RULES, {});
  const nd = out.results.find(r => r.codigo === 'NUMERO_DADOS');
  assert.equal(nd.grau, 'III');
  assert.equal(out.results.find(r => r.codigo === 'HOMOCEDASTICIDADE').status, 'REQUER_ANALISE');
  assert.deepEqual([...out.pendentesRevisao], ['HOMOCEDASTICIDADE']);
  const reviewed = V.validateModel(fit, null, vars, c.input.dependent, RULES, { HOMOCEDASTICIDADE: 'ATENDE' });
  assert.equal(reviewed.results.find(r => r.codigo === 'HOMOCEDASTICIDADE').status, 'ATENDE');
  assert.equal(reviewed.pendentesRevisao.length, 0);
});

test('validator: significance grades III<=10% II<=20% I<=30% and blocking when above', () => {
  const g = (p) => V.validateModel({ ...E.fitRegression(cases[1].input), coefficients: [{ code: '(i)', beta: 1, pValue: 0 }, { code: 'area', beta: 1, pValue: p, t: 1 }, { code: 'dist', beta: -1, pValue: 0.01, t: 3 }] }, null, [], cases[1].input.dependent, RULES.slice(1, 2), {});
  assert.equal(g(0.10).results[0].grau, 'III');
  assert.equal(g(0.15).results[0].grau, 'II');
  assert.equal(g(0.30).results[0].grau, 'I');
  const blocked = g(0.31);
  assert.equal(blocked.results[0].status, 'NAO_ATENDE');
  assert.equal(blocked.overall, 'BLOQUEADO');
});

test('validator: micronumerosity up to 30 data requires >=3 per category', () => {
  const c = cases[0];
  const fit = E.fitRegression(c.input);
  const vals = c.input.sampleIds.map((_, i) => (i < 2 ? 1 : 0));
  const out = V.validateModel(fit, null, [{ code: 'padrao', tipo: 'DICOTOMICA', relacao_esperada: 'INDEFINIDA', transform: 'DIRECT', values: vals }], c.input.dependent, [RULES[5]], {});
  assert.equal(out.results[0].status, 'NAO_ATENDE');
  assert.equal(out.results[0].valor, 3);
});
