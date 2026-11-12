// Homologação numérica com base real (Guarantã do Norte) contra o relatório SisDEA de referência.
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
const fx = JSON.parse(read('tests/fixtures/guaranta-do-norte-real.json'));
const X = fx.expected;

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
/** Tolerância relativa (gabarito publicado com ~15 dígitos significativos). */
const close = (a, b, rel, msg) => ok(Number.isFinite(a) && Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${msg}: obtido ${a}, esperado ${b}`);
/** Tolerância absoluta (Cook publicado com 6 casas). */
const near = (a, b, abs, msg) => ok(Number.isFinite(a) && Math.abs(a - b) <= abs, `${msg}: obtido ${a}, esperado ${b}`);

const bands = fx.policy.precisao_graus.map((b) => ({ grau: b.grau, maxAmplitudePct: b.max }));
const rule = (c) => fx.policy.rules.find((r) => r.codigo === c);

test('Guarantã do Norte — paridade real SisDEA', () => {
  const fit = E.fitRegression(fx.input);
  const pr = E.project(fit, fx.input, fx.avaliando, fx.confidenceLevel, bands);

  // Estrutura
  eq(fit.n, X.n, 'n'); eq(fit.p, X.p, 'p'); eq(fit.dfReg, X.dfReg, 'gl regressão'); eq(fit.dfRes, X.dfRes, 'gl resíduo');
  eq(fit.anova.find((a) => a.source === 'TOTAL').df, X.dfTotal, 'gl total');

  // Coeficientes, t e significâncias
  fit.coefficients.forEach((c, j) => { close(c.beta, X.beta[j], 1e-12, `beta ${c.code}`); close(c.t, X.t[j], 1e-12, `t ${c.code}`); });
  close(fit.coefficients[1].pValue, X.p.banheiro, 1e-10, 'sig banheiro');
  close(fit.coefficients[2].pValue, X.p.area, 1e-10, 'sig área');

  // Somas, R e F
  close(fit.sse, X.sse, 1e-12, 'SSE'); close(fit.sst, X.sst, 1e-12, 'SST'); close(fit.ssr, X.ssr, 1e-12, 'SSR'); close(fit.mse, X.mse, 1e-12, 'MSE');
  close(fit.rRegressao, X.rRegressao, 1e-12, 'R regressão');
  close(fit.rEstimativa, X.rEstimativa, 1e-12, 'R estimativa');
  close(fit.r2, X.r2, 1e-12, 'R²');
  close(fit.f, X.f, 1e-12, 'F');
  close(fit.fPValue, X.fP, 1e-9, 'Sig F');

  // Normalidade (contagens)
  X.normalityCounts.forEach((b, i) => { eq(fit.normality[i].z, b.z, `faixa ${b.z}`); eq(Math.round(fit.normality[i].observed * fit.n), b.count, `normalidade ±${b.z}σ`); });

  // Resíduos derivados do gabarito: e = (resíduo relativo publicado) × ln(Valor); Resíduo/DP = e / sqrt(MSE publicado)
  const sPub = Math.sqrt(X.mse);
  fx.input.dependent.values.forEach((v, i) => {
    const id = fx.input.sampleIds[i];
    const ePub = (X.residualRelativePct[i] / 100) * Math.log(v);
    close(fit.residuals[i], ePub, 1e-10, `resíduo ID${id}`);
    close(fit.residualsRelative[i] * 100, X.residualRelativePct[i], 1e-10, `resíduo relativo ID${id}`);
    close(fit.residualsStd[i], ePub / sPub, 1e-10, `resíduo/DP ID${id}`);
    near(fit.cook[i], X.cook[i], 5e-7, `Cook ID${id}`);
  });

  // Tabela derivada modelo_residuos usa o mesmo campo oficial
  const der = D.deriveStatTables({ fit, preliminary_projection: pr }, fx.input, rule('NORMALIDADE').thresholds);
  der.residuos.forEach((r, i) => close(r.residuo_relativo * 100, X.residualRelativePct[i], 1e-10, `modelo_residuos.residuo_relativo ID${r.amostra_id}`));

  // Projeção
  X.centers.forEach((ec, i) => {
    const c = pr.centers[i];
    eq(c.center, ec.center, `centro ${ec.center}`);
    close(c.value, ec.value, 1e-12, `${ec.center} valor`); close(c.lower, ec.lower, 1e-12, `${ec.center} IC inf`); close(c.upper, ec.upper, 1e-12, `${ec.center} IC sup`);
    close(c.amplitudePct, X.amplitudePct, 1e-10, `${ec.center} amplitude`);
    eq(c.precisionGrade, X.precisionGrade, `${ec.center} grau de precisão`);
  });

  // Validação completa com a política vigente (v2) e graus atribuídos pelo RT aos itens manuais
  const vars = fx.variables.map((v) => ({ ...v, values: fx.input.independents.find((x) => x.code === v.code).values }));
  const out = V.validateModel(fit, pr, vars, fx.input.dependent, fx.policy.rules, {}, { foundation: fx.policy.fundamentacao, foundationGrades: fx.foundationManualGrades });
  eq(out.precisao.grau, X.precisionGrade, 'validação: grau de precisão');
  for (const it of out.foundation.items) eq(it.grade_achieved, X.foundation.items[it.codigo], `fundamentação item ${it.item_number} ${it.codigo}`);
  eq(out.foundation.summary.total_points, X.foundation.points, 'fundamentação: pontos');
  eq(out.foundation.summary.grade_calculated, X.foundation.grade, 'fundamentação: grau');
  eq(out.fundamentacao.grau, X.foundation.grade, 'fundamentação: grau exposto');
  eq(out.results.find((r) => r.codigo === 'PONTOS_INFLUENTES').status, 'ATENDE', 'Cook: nenhuma amostra acima de 4/n');

  // Compatibilidade — espelha aval_confirm_economic (centro Média, sem arbitramento)
  const C = X.compatibility;
  const mean = pr.centers.find((c) => c.center === C.center);
  const bruto = mean.value; // arbitramento não aplicado ⇒ referência bruta = centro
  close(bruto, C.referenciaBruta, 1e-12, 'compat: referência bruta');
  close(bruto - C.reajustado, C.diferenca, 1e-12, 'compat: diferença');
  near(((bruto - C.reajustado) / bruto) * 100, C.percentual, 0.005, 'compat: percentual');
  eq(C.reajustado < mean.lower ? 'ABAIXO_IC' : C.reajustado > mean.upper ? 'ACIMA_IC' : 'DENTRO_IC', C.posicaoIc, 'compat: posição IC');
  eq(C.reajustado < bruto - 0.005 ? 'ABAIXO_REFERENCIA' : C.reajustado > bruto + 0.005 ? 'ACIMA_REFERENCIA' : 'IGUAL_REFERENCIA', C.direcao, 'compat: direção');
  close(bruto * (1 - C.campoPct / 100), C.campo[0], 1e-12, 'campo de arbítrio inferior');
  close(bruto * (1 + C.campoPct / 100), C.campo[1], 1e-12, 'campo de arbítrio superior');

  console.log(`Guarantã do Norte: ${checks} verificações aprovadas`);
});
