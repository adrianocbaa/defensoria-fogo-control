// "Remover da avaliação": leitura do bloqueio histórico e oferta de "Desmarcar e preparar nova versão".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src = readFileSync(new URL('../src/lib/avaliacao/removerAmostra.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, JSON, Array, Set, Object });
const R = exports;
const plain = (x) => JSON.parse(JSON.stringify(x));

test('detalhe do servidor com conjunto congelado vira bloqueio histórico', () => {
  const h = R.lerAmostraHistorica('{"motivos":["CONJUNTO_CONGELADO"],"selecionada":true,"habilitada_modelo":false}');
  assert.deepEqual(plain(h), { motivos: ['CONJUNTO_CONGELADO'], selecionada: true, habilitada_modelo: false });
});

test('detalhe inválido ou sem motivo conhecido não vira bloqueio', () => {
  assert.equal(R.lerAmostraHistorica('não é json'), null);
  assert.equal(R.lerAmostraHistorica('{"motivos":["OUTRA_COISA"]}'), null);
  assert.equal(R.lerAmostraHistorica(null), null);
});

test('desmarcar só é oferecido a quem decide a seleção e se ainda estiver marcada', () => {
  const marcada = { motivos: ['CONJUNTO_CONGELADO'], selecionada: true, habilitada_modelo: true };
  const desmarcada = { motivos: ['CONJUNTO_CONGELADO'], selecionada: false, habilitada_modelo: false };
  assert.equal(R.podeDesmarcar(marcada, true), true);
  assert.equal(R.podeDesmarcar(marcada, false), false);
  assert.equal(R.podeDesmarcar(desmarcada, true), false);
});

