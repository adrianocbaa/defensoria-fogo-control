// Critério 12 (Outliers): três níveis pela política versionada, sem reprovação automática e com decisão do avaliador.
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
const O = load('src/lib/avaliacao/outliers.ts');

// Limites da política SIDIF_V1 v3 (o teste SQL confere que o banco tem exatamente estes valores).
const TH_V3 = { metrica: 'RESIDUO_DP', limite_moderado: 2, limite_forte: 3, alpha: 0.05, p_moderado: false, bonferroni: true, justificativa_manter: 'FORTE', origem: 'PROCEDIMENTO_INTERNO' };
const rule = (th = TH_V3) => ({ codigo: 'OUTLIERS', numero: 12, nome: 'Outliers', origem: 'NORMA_TECNICA', modo: 'ASSISTIDO', bloqueante: false, entra_fundamentacao: false, thresholds: th, ativo: true });

/** Ajuste sintético consistente: Σr² = n−p (s = 1), leverage uniforme p/n, Cook pela fórmula do motor. */
function fakeFit(n, p, first) {
  const restSq = (n - p - first * first) / (n - 1);
  const r = [first, ...Array.from({ length: n - 1 }, (_, i) => (i % 2 ? 1 : -1) * Math.sqrt(restSq))];
  const h = p / n;
  return {
    n, p, k: p - 1, sse: n - p, mse: 1, s: 1, residuals: r, residualsStd: r, leverage: r.map(() => h),
    cook: r.map((e) => ((e * e) / p) * (h / (1 - h) ** 2)), sampleIds: r.map((_, i) => `s${i + 1}`), coefficients: [{ code: '(intercepto)', beta: 1 }],
  };
}
const run = (fit, th, decisions) => V.validateModel(fit, null, [], { transform: 'DIRECT' }, [rule(th)], {}, { outlierDecisions: decisions });
const crit = (out) => out.results.find((x) => x.codigo === 'OUTLIERS');

test('1) todas as amostras com |r| <= 2 → atende automaticamente', () => {
  const out = run(fakeFit(30, 3, 1.95));
  const c = crit(out);
  assert.equal(c.status, 'ATENDE');
  assert.equal(c.dados.nivel, 'SEM_INDICIO');
  assert.equal(c.dados.acima_limite, 0);
  assert.equal(c.dados.suspeitas.length, 0);
  assert.match(c.detalhe, /^Nenhum indício de outlier identificado\./);
  assert.equal(out.overall, 'APTO');
  assert.deepEqual([...out.pendentesRevisao], []);
});

test('2) uma amostra com 2 < |r| <= 3 → requer análise (indício moderado)', () => {
  const c = crit(run(fakeFit(30, 3, 2.41)));
  assert.equal(c.status, 'REQUER_ANALISE');
  assert.equal(c.dados.nivel, 'MODERADO');
  assert.equal(c.dados.suspeitas.length, 1);
  assert.equal(c.dados.suspeitas[0].amostra_id, 's1');
  assert.equal(c.dados.suspeitas[0].nivel, 'MODERADO');
  assert.match(c.detalhe, /^Possível outlier identificado: amostra\(s\) 01/);
});

test('3) uma amostra com |r| > 3 → forte indício', () => {
  const c = crit(run(fakeFit(30, 3, 3.27)));
  assert.equal(c.dados.nivel, 'FORTE');
  assert.equal(c.dados.suspeitas[0].nivel, 'FORTE');
  assert.match(c.detalhe, /^Forte indício de outlier — análise obrigatória/);
});

test('4) Bonferroni p < 0,05/n → forte indício, mesmo abaixo do limite de |r|', () => {
  const fit = fakeFit(30, 3, 3.4);
  const c = crit(run(fit, { ...TH_V3, metrica: 'STUDENTIZADO_EXTERNO', limite_forte: 99, limite_moderado: 99 }));
  const s = c.dados.suspeitas[0];
  assert.ok(s.p_valor < 0.05 / 30, `p ${s.p_valor}`);
  assert.equal(c.dados.metrica, 'STUDENTIZADO_EXTERNO');
  assert.equal(s.nivel, 'FORTE');
  assert.ok(s.motivos.some((m) => m.includes('Bonferroni')));
  // Sem Bonferroni na política, o mesmo ponto não é forte por p-valor
  const sem = crit(run(fit, { ...TH_V3, metrica: 'STUDENTIZADO_EXTERNO', limite_forte: 99, limite_moderado: 99, bonferroni: false }));
  assert.equal(sem.dados.nivel, 'SEM_INDICIO');
  // p < α (sem atingir Bonferroni) só sinaliza moderado quando a política liga p_moderado
  const mod = crit(run(fakeFit(30, 3, 2.3), { ...TH_V3, metrica: 'STUDENTIZADO_EXTERNO', limite_forte: 99, limite_moderado: 99, p_moderado: true }));
  assert.equal(mod.dados.nivel, 'MODERADO');
});

test('5) possível outlier não reprova o modelo — nem no forte indício', () => {
  for (const first of [2.41, 3.27]) {
    const out = run(fakeFit(30, 3, first));
    const c = crit(out);
    assert.notEqual(c.status, 'NAO_ATENDE');
    assert.equal(c.bloqueante, false);
    assert.equal(out.overall, 'APTO_COM_RESSALVAS');
    assert.deepEqual([...out.pendentesRevisao], ['OUTLIERS']);
  }
});

test('6) Guarantã: maior |Resíduo/DP| ≈ 1,89 → atende (0 de 12 acima de 2,00)', () => {
  const fx = JSON.parse(read('tests/fixtures/guaranta-do-norte-real.json'));
  const fit = E.fitRegression(fx.input);
  const rules = fx.policy.rules.map((r) => (r.codigo === 'OUTLIERS' ? { ...r, thresholds: TH_V3 } : r));
  const c = V.validateModel(fit, null, fx.variables.map((v, i) => ({ ...v, values: fx.input.independents[i].values })), { transform: 'LN' }, rules).results.find((x) => x.codigo === 'OUTLIERS');
  assert.equal(c.status, 'ATENDE');
  assert.equal(c.dados.metrica, 'RESIDUO_DP');
  assert.equal(c.dados.n, 12);
  assert.equal(c.dados.acima_limite, 0);
  assert.ok(Math.abs(c.dados.maior.valor - 1.888) < 0.001, `maior ${c.dados.maior.valor}`);
  assert.match(c.detalhe, /Nenhum indício de outlier identificado\. Maior \|Resíduo\/DP\|: 1,89 · limite indicativo 2,00 · amostras acima de 2,00: 0 de 12/);
  assert.deepEqual([...O.resumoOutliers(c.dados)], ['12 amostras analisadas', 'Maior |Resíduo/DP|: 1,89', 'Limite indicativo: 2,00', 'Amostras acima de 2,00: 0 de 12']);
  // Informação complementar (não define o resultado nesta política): amostra 13 tem studentizado externo ≈ −2,75 (p ≈ 0,025)
  const a13 = c.dados.amostras.find((a) => a.amostra_id === '13');
  assert.ok(Math.abs(a13.studentizado_externo + 2.749) < 0.002 && Math.abs(a13.p_valor - 0.0251) < 0.001);
  // Política antiga (sem limites) mantém o comportamento anterior
  const legado = V.validateModel(fit, null, [], { transform: 'LN' }, [rule({})]).results[0];
  assert.equal(legado.status, 'REQUER_ANALISE');
});

test('resíduo studentizado externo confere com o ajuste sem a amostra (leave-one-out)', () => {
  const fx = JSON.parse(read('tests/fixtures/guaranta-do-norte-real.json'));
  const fit = E.fitRegression(fx.input);
  const st = V.externallyStudentized(fit);
  for (const i of [0, 7, 11]) {
    const keep = (arr) => arr.filter((_, j) => j !== i);
    const red = { sampleIds: keep(fx.input.sampleIds), dependent: { ...fx.input.dependent, values: keep(fx.input.dependent.values) },
      independents: fx.input.independents.map((v) => ({ ...v, values: keep(v.values) })) };
    const f2 = E.fitRegression(red);
    const x = [1, ...fx.input.independents.map((v) => E.applyTransform(v.transform, v.values[i], v.power))];
    const yhat = x.reduce((s, xj, j) => s + xj * f2.coefficients[j].beta, 0);
    let q = 0; for (let a = 0; a < x.length; a++) for (let b = 0; b < x.length; b++) q += x[a] * f2.covUnscaled[a][b] * x[b];
    const t = (fit.yTransformed[i] - yhat) / (f2.s * Math.sqrt(1 + q));
    assert.ok(Math.abs(st.t[i] - t) < 1e-9, `amostra ${i}: ${st.t[i]} vs ${t}`);
  }
});

test('7) decisão do avaliador: manter todas → atende (revisado); excluir → segue em análise; histórico usa a última', () => {
  const fit = fakeFit(30, 3, 3.27);
  const manter = crit(run(fit, TH_V3, { s1: { decisao: 'MANTER', justificativa: 'Imóvel representativo do mercado local' } }));
  assert.equal(manter.status, 'ATENDE');
  assert.equal(manter.revisado, true);
  assert.equal(manter.dados.nivel, 'FORTE');
  assert.equal(manter.dados.decisoes[0].decisao, 'MANTER');
  const excluir = crit(run(fit, TH_V3, { s1: { decisao: 'EXCLUIR', justificativa: 'Erro de digitação da área' } }));
  assert.equal(excluir.status, 'REQUER_ANALISE');
  assert.match(excluir.detalhe, /Exclusão indicada pelo avaliador: 01/);
  // Análise genérica antiga não sobrepõe decisões por amostra
  const g = V.validateModel(fit, null, [], { transform: 'DIRECT' }, [rule()], { OUTLIERS: 'ATENDE' }, { outlierDecisions: { s1: { decisao: 'EXCLUIR' } } }).results[0];
  assert.equal(g.status, 'REQUER_ANALISE');

  const ev = (id, amostra, decisao, at, extra = {}) => ({ id, event_type: 'OUTLIER_DECISION', created_at: at, actor_id: 'u1', details_json: { execucao: 'ex1', amostra_id: amostra, decisao, ordem: 8, ...extra } });
  const eventos = [ev('2', 'a8', 'EXCLUIR', '2026-11-12T10:05:00Z'), ev('1', 'a8', 'MANTER', '2026-11-12T10:00:00Z'), ev('3', 'a8', 'MANTER', '2026-11-12T09:00:00Z', { execucao: 'outra' })];
  const ult = O.ultimasDecisoes(eventos, 'ex1');
  assert.equal(ult.a8.id, '2');
  assert.equal(eventos.length, 3);
  assert.equal(O.detalheDecisaoOutlier({ ordem: 8, decisao: 'MANTER', nivel: 'MODERADO', justificativa: 'Padrão superior', modelo_nome: 'Modelo 1', validacao_numero: 2, engine_version: '1.1.1',
    indicadores: { residuo_dp: 2.41, studentizado_externo: 2.9, p_valor: 0.012, cook: 0.12, leverage: 0.1 } }),
    'Amostra 08: Amostra mantida · Indício moderado de dado atípico · Resíduo/DP: 2,41 · Resíduo studentizado: 2,90 · p-valor: 0,0120 · Cook: 0,12 · Leverage: 0,100 · Modelo 1 · validação 2 · motor 1.1.1 — Padrão superior');
});

test('justificativa: excluir sempre; manter só no forte indício (política padrão)', () => {
  assert.equal(O.justificativaObrigatoria('EXCLUIR', 'MODERADO'), true);
  assert.equal(O.justificativaObrigatoria('MANTER', 'FORTE'), true);
  assert.equal(O.justificativaObrigatoria('MANTER', 'MODERADO'), false);
  assert.equal(O.justificativaObrigatoria('MANTER', 'MODERADO', 'SEMPRE'), true);
  assert.equal(V.outlierJustificationRequired('MANTER', 'FORTE', 'OPCIONAL'), false);
});
