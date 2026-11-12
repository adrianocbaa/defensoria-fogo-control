// Triagem prévia explicável: critérios em ordem fixa (sem score), limites da política e paridade do sinal com o motor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load = (rel) => {
  const exports = {};
  const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, Number, String, Math, Object, Array, JSON, Set, Map, Float64Array, Error, require: () => ({}) });
  return exports;
};
const T = load('../src/lib/avaliacao/triagem.ts');
const ENGINE = load('../supabase/functions/_shared/avaliacao/engine.ts');

// Limites da política SIDIF_V1 v2 (validation_policy_rules)
const POL = { codigo: 'SIDIF_V1', versao: 2,
  sig_regressores: [{ grau: 'III', max: 0.1 }, { grau: 'II', max: 0.2 }, { grau: 'I', max: 0.3 }],
  sig_modelo: [{ grau: 'III', max: 0.01 }, { grau: 'II', max: 0.02 }, { grau: 'I', max: 0.05 }] };
let seq = 0;
const mk = (o = {}) => {
  const numero = o.numero ?? ++seq;
  return {
    id: `m${numero}`, numero, nome: `Modelo ${numero}`, status: 'CALCULADO', stale: false, arquivado: false, dependente_transformacao: o.depT ?? 'LN',
    resumo: { n: 13, k: 2, r2: 0.9, r2_ajustado: o.r2a ?? 0.85, f: 30, sig_f: o.sigF ?? 0.0058, pior_sig_regressor: o.pior ?? 0.0733,
      amplitude_pct: 25, grau_precisao: o.prec ?? 'III', extrapola: o.extrapola ?? false, ...(o.resumo ?? {}) },
    variaveis: o.vars ?? [
      { variavel_id: 'a', codigo: 'area', nome: 'Área', transformacao: 'LN', relacao_esperada: 'POSITIVA', beta: 0.8, sig: 0.01 },
      { variavel_id: 'b', codigo: 'banheiros', nome: 'Banheiros', transformacao: 'DIRECT', relacao_esperada: 'POSITIVA', beta: 0.1, sig: o.pior ?? 0.0733 },
    ],
  };
};
const ordem = (ms) => T.triar(ms, POL, 10).sugestoes.map((a) => a.modelo.numero);

test('grau por limite segue as faixas da política (Sig. F 0,58% = III; pior regressor 7,33% = III; 25% = I; 35% = fora)', () => {
  assert.equal(T.grauPorLimite(0.0058, POL.sig_modelo), 'III');
  assert.equal(T.grauPorLimite(0.0733, POL.sig_regressores), 'III');
  assert.equal(T.grauPorLimite(0.25, POL.sig_regressores), 'I');
  assert.equal(T.grauPorLimite(0.35, POL.sig_regressores), null);
  assert.equal(T.grauPorLimite(0.03, POL.sig_modelo), 'I');
});

test('sinal da transformação é idêntico ao do motor 1.1.1', () => {
  for (const t of ['DIRECT', 'INVERSE', 'LN', 'SQUARE', 'SQRT', 'INV_SQUARE', 'INV_SQRT']) assert.equal(T.sinalTransformacao(t), ENGINE.transformMonotonicSign(t), t);
  assert.equal(T.sinalTransformacao('POWER', -2), ENGINE.transformMonotonicSign('POWER', -2));
  assert.equal(T.sinalTransformacao('POWER', 2), ENGINE.transformMonotonicSign('POWER', 2));
});

test('R² alto com regressora não significativa não vira candidato prioritário', () => {
  const altoR2 = mk({ numero: 1, r2a: 0.99, pior: 0.35 });
  const modesto = mk({ numero: 2, r2a: 0.70, pior: 0.05 });
  const r = T.triar([altoR2, modesto], POL);
  assert.deepEqual(r.sugestoes.map((a) => a.modelo.numero), [2]);
  assert.match(T.analisar(altoR2, POL).exclusoes.join(' '), /Regressor com significância 35,00% acima do limite/);
  // Regressora no limite do Grau I perde para Grau III mesmo com R² ajustado bem maior
  assert.deepEqual(ordem([mk({ numero: 3, r2a: 0.99, pior: 0.25 }), mk({ numero: 4, r2a: 0.60, pior: 0.08 })]), [4, 3]);
});

test('modelo com extrapolação perde prioridade para equivalente sem extrapolação', () => {
  assert.deepEqual(ordem([mk({ numero: 5, extrapola: true, r2a: 0.95 }), mk({ numero: 6, extrapola: false, r2a: 0.80 })]), [6, 5]);
  const a = T.analisar(mk({ numero: 7, extrapola: true }), POL);
  assert.equal(a.rotulo, 'Requer atenção');
  assert.ok(a.alertas.some((x) => /extrapolação/i.test(x)));
});

test('prioridade: enquadramento > sem extrapolação > precisão > pior regressor > Sig. F > R² ajustado > parcimônia', () => {
  // enquadramento (Sig. F Grau II) vence precisão
  assert.deepEqual(ordem([mk({ numero: 10, sigF: 0.015, prec: 'III' }), mk({ numero: 11, sigF: 0.005, prec: 'I' })]), [11, 10]);
  // mesmo enquadramento e sem extrapolação: melhor precisão
  assert.deepEqual(ordem([mk({ numero: 12, prec: 'II' }), mk({ numero: 13, prec: 'III' })]), [13, 12]);
  // empate até precisão: menor pior regressor
  assert.deepEqual(ordem([mk({ numero: 14, pior: 0.09 }), mk({ numero: 15, pior: 0.02 })]), [15, 14]);
  // empate até pior regressor: menor Sig. F
  assert.deepEqual(ordem([mk({ numero: 16, sigF: 0.009 }), mk({ numero: 17, sigF: 0.001 })]), [17, 16]);
  // empate até Sig. F: maior R² ajustado
  assert.deepEqual(ordem([mk({ numero: 18, r2a: 0.70 }), mk({ numero: 19, r2a: 0.90 })]), [19, 18]);
  // tudo igual: menos variáveis
  const uma = mk({ numero: 20, vars: [{ variavel_id: 'a', codigo: 'area', nome: 'Área', transformacao: 'LN', relacao_esperada: 'POSITIVA', beta: 0.8, sig: 0.0733 }] });
  assert.deepEqual(ordem([mk({ numero: 21 }), uma]), [20, 21]);
});

test('sinal contrário à relação esperada exclui da sugestão (inclusive com transformação inversa)', () => {
  // 1/área com beta positivo = efeito NEGATIVO de área, contrário ao esperado POSITIVA
  const inv = mk({ numero: 30, vars: [{ variavel_id: 'a', codigo: 'area', nome: 'Área', transformacao: 'INVERSE', relacao_esperada: 'POSITIVA', beta: 0.5, sig: 0.01 }] });
  const a = T.analisar(inv, POL);
  assert.equal(a.elegivel, false);
  assert.match(a.exclusoes.join(' '), /Sinal contrário ao esperado: Área/);
  const ok = mk({ numero: 31, vars: [{ variavel_id: 'a', codigo: 'area', nome: 'Área', transformacao: 'INVERSE', relacao_esperada: 'POSITIVA', beta: -0.5, sig: 0.01 }] });
  assert.equal(T.analisar(ok, POL).elegivel, true);
});

test('cards explicam motivos objetivos e nunca dizem "Melhor modelo"', () => {
  const a = T.analisar(mk({ numero: 40, sigF: 0.0058, pior: 0.0733, prec: 'I' }), POL);
  assert.ok(a.motivos.includes('Sem extrapolação'));
  assert.ok(a.motivos.includes('Sig. F: 0,58% — Grau III'));
  assert.ok(a.motivos.includes('Pior regressor: 7,33% — Grau III'));
  assert.ok(a.motivos.includes('Precisão estimada: Grau I'));
  assert.ok(a.motivos.includes('2 variáveis independentes'));
  assert.equal(a.rotulo, 'Candidato');
  assert.equal(T.analisar(mk({ numero: 41 }), POL).rotulo, 'Forte candidato');
  const src = readFileSync(new URL('../src/lib/avaliacao/triagem.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Melhor modelo/);
  assert.equal(T.TRIAGEM_AVISO, 'Triagem prévia — não substitui a Validação Técnica');
});

test('triagem limita a 5 sugestões, só considera calculados válidos e resume exclusões', () => {
  const ms = Array.from({ length: 8 }, (_, i) => mk({ numero: 50 + i, r2a: 0.5 + i / 100 }));
  ms.push({ ...mk({ numero: 60 }), status: 'EM_VALIDACAO' }, { ...mk({ numero: 61 }), arquivado: true }, mk({ numero: 62, sigF: 0.2 }));
  const r = T.triar(ms, POL);
  assert.equal(r.sugestoes.length, 5);
  assert.equal(r.elegiveis, 8);
  assert.equal(r.analisados, 11);
  assert.ok(r.exclusoes.some((e) => e.motivo === 'Sig. F' && e.quantidade === 1));
  assert.ok(!r.sugestoes.some((a) => [60, 61, 62].includes(a.modelo.numero)));
});

test('comparador marca diferenças sem apontar vencedor', () => {
  const l = T.linhasComparacao([T.analisar(mk({ numero: 70, extrapola: true }), POL), T.analisar(mk({ numero: 71 }), POL)]);
  assert.equal(l.find((x) => x.rotulo === 'Extrapolação').difere, true);
  assert.equal(l.find((x) => x.rotulo === 'n').difere, false);
  assert.ok(!l.some((x) => /vencedor|melhor/i.test(x.rotulo)));
});
