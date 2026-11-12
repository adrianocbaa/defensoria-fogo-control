// Homologação numérica com bases reais contra relatórios SisDEA Home 1.60 (Aripuanã e São Félix do Araguaia).
// Nenhuma fórmula é ajustada para estes casos: o motor é executado tal como está e comparado ao gabarito publicado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Set, Infinity, NaN, String, require: (n) => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const E = load('supabase/functions/_shared/avaliacao/engine.ts');
const V = load('supabase/functions/_shared/avaliacao/validator.ts', { './engine.ts': E });
const D = load('supabase/functions/_shared/avaliacao/derived.ts', { './engine.ts': E, './validator.ts': V });

/** Valores integrais publicados (~15 dígitos significativos): tolerância relativa pura. */
const REL = 1e-9;

function runParity(fixtureFile) {
  const fx = JSON.parse(read(`tests/fixtures/${fixtureFile}`));
  const X = fx.expected;
  const failures = [];
  let checks = 0;
  const record = (pass, msg) => { checks++; if (!pass) failures.push(msg); };
  const eq = (a, b, msg) => record(a === b, `${msg}: obtido ${a}, esperado ${b}`);
  const close = (a, b, msg) => record(Number.isFinite(a) && Math.abs(a - b) <= REL * Math.abs(b), `${msg}: obtido ${a}, esperado ${b}`);
  /** Valor publicado arredondado: meia unidade da última casa. */
  const rounded = (a, b, decimals, msg) => record(Number.isFinite(a) && Math.abs(a - b) <= 0.5 * 10 ** -decimals + 1e-12, `${msg}: obtido ${a}, esperado ${b} (${decimals} casas)`);

  const fit = E.fitRegression(fx.input);
  const pr = E.project(fit, fx.input, fx.avaliando, fx.confidenceLevel, fx.precisionBands);
  const ids = fx.input.sampleIds;

  eq(fit.n, X.n, 'n'); eq(fit.p, X.p, 'p'); eq(fit.dfReg, X.dfReg, 'gl regressão'); eq(fit.dfRes, X.dfRes, 'gl resíduo');
  eq(fit.anova.find((a) => a.source === 'TOTAL').df, X.dfTotal, 'gl total');
  fit.coefficients.forEach((c, j) => close(c.beta, X.beta[j], `coeficiente ${c.code}`));
  fit.coefficients.forEach((c, j) => close(c.t, X.t[j], `t ${c.code}`));
  for (const [code, p] of Object.entries(X.pValues)) close(fit.coefficients.find((c) => c.code === code).pValue, p, `significância ${code}`);
  for (const k of ['sse', 'sst', 'ssr', 'mse', 'rRegressao', 'rEstimativa', 'r2', 'r2Adj', 'f']) close(fit[k], X[k], k);
  close(fit.fPValue, X.fP, 'Sig F');

  X.normalityCounts.forEach((b, i) => eq(Math.round(fit.normality[i].observed * fit.n), b.count, `normalidade ±${b.z}σ`));

  X.centers.forEach((ec, i) => {
    const c = pr.centers[i];
    eq(c.center, ec.center, `centro ${ec.center}`);
    close(c.value, ec.value, `${ec.center} valor`); close(c.lower, ec.lower, `${ec.center} IC inf`); close(c.upper, ec.upper, `${ec.center} IC sup`);
    if (ec.amplitudePct !== undefined) close(c.amplitudePct, ec.amplitudePct, `${ec.center} amplitude`);
  });
  eq(pr.centers[0].precisionGrade, X.precisionGrade, 'grau de precisão');

  const der = D.deriveStatTables({ fit, preliminary_projection: pr }, fx.input, null);
  ids.forEach((id, i) => {
    if (X.estimatedOriginal) close(fit.estimatedOriginal[i], X.estimatedOriginal[i], `estimado ID${id}`);
    if (X.residuals) close(fit.residuals[i], X.residuals[i], `resíduo ID${id}`);
    close(fit.residualsRelative[i] * 100, X.residualRelativePct[i], `resíduo relativo ID${id}`);
    close(der.residuos[i].residuo_relativo * 100, X.residualRelativePct[i], `modelo_residuos.residuo_relativo ID${id}`);
    if (X.residualsStdRounded) rounded(fit.residualsStd[i], X.residualsStdRounded[i], X.roundedDecimals, `resíduo/DP ID${id}`);
    if (X.cookRounded) rounded(fit.cook[i], X.cookRounded[i], X.roundedDecimals, `Cook ID${id}`);
  });
  return { name: fx.name, checks, failures };
}

for (const [label, file] of [['Aripuanã', 'aripuana-real.json'], ['São Félix do Araguaia', 'sao-felix-do-araguaia-real.json']]) {
  test(`${label} — paridade real SisDEA`, () => {
    const r = runParity(file);
    console.log(`${label}: ${r.checks - r.failures.length}/${r.checks} verificações aprovadas`);
    for (const f of r.failures) console.log(`  DIVERGÊNCIA ${label}: ${f}`);
    assert.deepEqual(r.failures, []);
  });
}
