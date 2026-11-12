// Critério 1 — gráficos de relacionamento (valor estimado × variável original no ponto médio, como no SisDEA).
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
const R = load('supabase/functions/_shared/avaliacao/relacionamento.ts', { './engine.ts': E });
const C = load('src/lib/avaliacao/cicloModelo.ts');
const plain = (x) => JSON.parse(JSON.stringify(x));
const RULE = { codigo: 'RELACIONAMENTO', numero: 1, nome: 'Relacionamento', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: false, entra_fundamentacao: false, thresholds: {}, ativo: true };

const AREA = [40.5, 60, 85.2, 110, 150, 210.7];
const QUARTOS = [1, 2, 2, 3, 3, 4];
/** Modelo sintético: z = b0 + b1·T(area) + b2·quartos. */
const modelo = (tArea, bArea, dep = 'DIRECT', b0 = 1000, bQ = 50) => ({
  coefficients: [{ code: '(intercepto)', beta: b0 }, { code: 'area', beta: bArea }, { code: 'quartos', beta: bQ }],
  dependent: { transform: dep },
  independents: [{ code: 'area', transform: tArea, values: AREA }, { code: 'quartos', transform: 'DIRECT', values: QUARTOS }],
});
const curva = (inp, code, meta = {}) => R.relationshipCurves(inp, meta).find((c) => c.code === code);

test('1) DIRECT com coeficiente positivo gera curva crescente', () => {
  const c = curva(modelo('DIRECT', 12), 'area', { area: { relacao_esperada: 'POSITIVA' } });
  assert.equal(c.trend, 'CRESCENTE');
  assert.equal(c.coherence, 'COERENTE');
  assert.equal(c.synthesis, 'Comportamento crescente — coerente com relação esperada positiva');
});

test('2) DIRECT com coeficiente negativo gera curva decrescente', () => {
  const c = curva(modelo('DIRECT', -3), 'area', { area: { relacao_esperada: 'NEGATIVA' } });
  assert.equal(c.trend, 'DECRESCENTE');
  assert.equal(c.synthesis, 'Comportamento decrescente — coerente com relação esperada negativa');
  assert.equal(curva(modelo('DIRECT', -3), 'area', { area: { relacao_esperada: 'POSITIVA' } }).coherence, 'INCOERENTE');
});

test('3) INVERSE com coeficiente negativo gera relação crescente na escala original', () => {
  const c = curva(modelo('INVERSE', -5000), 'area', { area: { relacao_esperada: 'POSITIVA' } });
  assert.ok(c.beta < 0);
  assert.equal(c.trend, 'CRESCENTE');
  assert.equal(c.coherence, 'COERENTE');
});

test('4) INVERSE com coeficiente positivo gera relação decrescente', () => {
  for (const t of ['INVERSE', 'INV_SQUARE', 'INV_SQRT']) {
    const c = curva(modelo(t, 5000), 'area', { area: { relacao_esperada: 'POSITIVA' } });
    assert.equal(c.trend, 'DECRESCENTE', t);
    assert.equal(c.coherence, 'INCOERENTE', t);
  }
});

test('5) ln(y) é revertido com exp() no eixo dos valores estimados', () => {
  const inp = modelo('LN', 0.6, 'LN', 5, 0.1);
  const c = curva(inp, 'area');
  const qm = QUARTOS.reduce((s, x) => s + x, 0) / QUARTOS.length;
  for (const p of c.points) {
    const esperado = Math.exp(5 + 0.6 * Math.log(p.x) + 0.1 * qm);
    assert.ok(Math.abs(p.y - esperado) <= 1e-9 * esperado, `x=${p.x}`);
  }
  assert.ok(c.points[0].y > 50, 'escala original (R$), não ln');
});

test('6) demais variáveis permanecem fixadas no ponto médio', () => {
  const inp = modelo('DIRECT', 12);
  const c = curva(inp, 'area');
  const qm = QUARTOS.reduce((s, x) => s + x, 0) / QUARTOS.length;
  assert.deepEqual(plain(Object.keys(c.fixed)), ['quartos']);
  assert.ok(Math.abs(c.fixed.quartos - qm) < 1e-12);
  for (const p of c.points) assert.ok(Math.abs(p.y - (1000 + 12 * p.x + 50 * qm)) < 1e-9);
  const am = AREA.reduce((s, x) => s + x, 0) / AREA.length;
  assert.ok(Math.abs(c.meanPoint.x - am) < 1e-12 && Math.abs(c.meanPoint.y - (1000 + 12 * am + 50 * qm)) < 1e-9, 'ponto médio com todas na média');
  // Elasticidade linear no ponto médio = b·x̄/ŷ
  assert.ok(Math.abs(c.elasticity - (12 * am) / c.meanPoint.y) < 1e-6);
});

test('7) gráfico usa só o intervalo observado no modelo (sem extrapolar)', () => {
  const c = curva(modelo('DIRECT', 12), 'area');
  assert.equal(c.points[0].x, Math.min(...AREA));
  assert.equal(c.points.at(-1).x, Math.max(...AREA));
  assert.ok(c.points.every((p) => p.x >= Math.min(...AREA) && p.x <= Math.max(...AREA)));
  assert.equal(c.points.length, R.CONTINUOUS_POINTS, 'contínua: curva suave');
  assert.equal(c.discrete, false);
});

test('8) variável discreta usa pontos inteiros do domínio observado', () => {
  const q = curva(modelo('DIRECT', 12), 'quartos');
  assert.equal(q.discrete, true);
  assert.deepEqual(plain(q.points.map((p) => p.x)), [1, 2, 3, 4]);
  const d = R.domainPoints([0, 1, 1, 0], true, 'DICOTOMICA');
  assert.deepEqual(plain(d), [0, 1]);
  assert.equal(R.isDiscrete([1, 2, 3]), true);
  assert.equal(R.isDiscrete([24, 70, 520]), false, 'área inteira com grande amplitude continua contínua');
  assert.equal(R.isDiscrete([1.5, 2]), false);
});

test('9) critério 1 automático e curvas concordam em todas as transformações; não monotônico requer análise', () => {
  for (const t of ['DIRECT', 'LN', 'SQUARE', 'SQRT', 'INVERSE', 'INV_SQUARE', 'INV_SQRT']) for (const b of [4, -4]) for (const dep of ['DIRECT', 'LN', 'INVERSE']) {
    const inp = modelo(t, b, dep, dep === 'INVERSE' ? 1 : 2, 0.001);
    const c = curva(inp, 'area', { area: { relacao_esperada: 'POSITIVA' } });
    const fit = { k: 2, coefficients: inp.coefficients };
    const auto = V.validateModel(fit, null, [{ code: 'area', tipo: 'QUANTITATIVA', relacao_esperada: 'POSITIVA', transform: t, values: [] }], { transform: dep }, [RULE], {}).results[0];
    if (c.trend === 'INDISPONIVEL') continue;
    assert.equal(auto.status === 'ATENDE', c.coherence === 'COERENTE', `${t} b=${b} dep=${dep}: automático ${auto.status}, curva ${c.trend}`);
  }
  assert.equal(R.classifyTrend([{ x: -2, y: 4 }, { x: 0, y: 0 }, { x: 2, y: 4 }]), 'NAO_MONOTONICO');
  assert.equal(R.synthesisText('NAO_MONOTONICO', 'POSITIVA'), 'Comportamento não monotônico / requer análise');
  assert.equal(R.coherenceOf('CRESCENTE', 'INDEFINIDA'), 'SEM_REFERENCIA');
  // Histórico: o registro da análise visual tem rótulo próprio e mostra a conclusão.
  assert.equal(C.rotuloEventoModelo({ event_type: 'RELATIONSHIP_VISUAL_ANALYSIS', details_json: {} }), 'Análise visual do relacionamento');
  assert.match(C.detalheAnaliseVisual({ conclusao: 'COERENTE', observacao: 'Curvas ok', modelo_nome: 'Modelo 1', engine_version: '1.1.1' }), /Coerência confirmada.*Modelo 1.*1\.1\.1.*Curvas ok/);
  assert.match(C.detalheAnaliseVisual({ conclusao: 'REVISAR' }), /Marcado para revisão/);
});

test('Aceite — Guarantã: ln(valor) ~ 1/área + ln(banheiros), ambas crescentes e coerentes com relação positiva', () => {
  const fx = JSON.parse(read('tests/fixtures/guaranta-do-norte-real.json'));
  const fit = E.fitRegression(fx.input);
  const meta = Object.fromEntries(fx.variables.map((v) => [v.code, { relacao_esperada: v.relacao_esperada, tipo: v.tipo }]));
  const curves = R.relationshipCurves({ coefficients: fit.coefficients, dependent: fx.input.dependent, independents: fx.input.independents }, meta);
  const ban = curves.find((c) => c.code === 'banheiro'), area = curves.find((c) => c.code === 'area');
  assert.equal(ban.discrete, true);
  assert.deepEqual(plain(ban.points.map((p) => p.x)), [1, 2, 3]);
  assert.equal(ban.trend, 'CRESCENTE'); assert.equal(ban.coherence, 'COERENTE');
  assert.ok(area.beta < 0, 'coeficiente bruto de 1/área é negativo');
  assert.equal(area.trend, 'CRESCENTE'); assert.equal(area.coherence, 'COERENTE');
  assert.equal(area.points[0].x, 24); assert.equal(area.points.at(-1).x, 520);
  // Assintótica: incrementos sucessivos diminuem (curva achatando com a área).
  const inc = area.points.slice(1).map((p, i) => p.y - area.points[i].y);
  assert.ok(inc.every((d, i) => i === 0 || d <= inc[i - 1] + 1e-9), 'incrementos decrescentes');
  assert.ok(inc.at(-1) < inc[0] / 50, 'achatamento forte no fim do intervalo');
  // Mesmos coeficientes do motor: a curva no ponto médio reproduz a predição direta.
  const [b0, bB, bA] = fit.coefficients.map((c) => c.beta);
  const bm = fx.input.independents[0].values.reduce((s, x) => s + x, 0) / 12;
  const am = fx.input.independents[1].values.reduce((s, x) => s + x, 0) / 12;
  assert.ok(Math.abs(area.meanPoint.y - Math.exp(b0 + bB * Math.log(bm) + bA / am)) < 1e-9);
  // Critério automático continua ATENDE para o mesmo modelo.
  const auto = V.validateModel(fit, null, fx.variables.map((v, i) => ({ ...v, values: fx.input.independents[i].values })), fx.input.dependent, [RULE], {}).results[0];
  assert.equal(auto.status, 'ATENDE');
});

test('PDF: desenha um gráfico por variável em grade, sem sair da página', () => {
  const calls = [];
  const doc = new Proxy({}, { get: (_, k) => k === 'splitTextToSize' ? (t) => [t] : k === 'getTextWidth' ? (t) => t.length : (...a) => { calls.push([k, ...a]); } });
  const inp = modelo('INVERSE', -5000);
  const curves = R.relationshipCurves(inp, {});
  let pages = 0;
  const y = R.drawRelationshipChartsPdf(doc, curves.map((c) => ({ curve: c, titulo: `Estimativa por ${c.code}`, eixoX: c.code, eixoY: 'Valor estimado' })),
    { left: 15, top: 250, width: 180, pageBottom: 280, newPage: () => { pages++; return 20; } });
  assert.equal(pages, 1, 'quebra de página quando não cabe');
  assert.ok(y > 20 && y < 280);
  assert.ok(calls.filter((c) => c[0] === 'text' && String(c[1]).startsWith('Estimativa por')).length === 2);
  assert.deepEqual(plain(R.chartLabels({ nome: 'Área construída', unidade: 'm²' }, { unidade: 'R$/mês' })),
    { titulo: 'Estimativa por Área construída', eixoX: 'Área construída (m²)', eixoY: 'Valor estimado (R$/mês)' });
});
