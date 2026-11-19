import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: n => { throw new Error(`Unexpected import ${n}`); } });
  return exports;
}
const calc = load('src/lib/medicaoCalculo.ts');
const pers = load('src/lib/medicaoPersistencia.ts');

const fixture = JSON.parse(read('tests/fixtures/paranatinga-medicoes-real.json'));
const sessions = [1, 2, 3, 4, 5].map(seq => ({ id: `s${seq}`, sequencia: seq, status: 'bloqueada' }));
const medicaoItems = fixture.itens.map(([seq, item_code, total]) => ({ medicao_id: `s${seq}`, item_code, total, pct: 0 }));
const orcItems = [...new Set(fixture.itens.map(r => r[1]))].map(item => ({ item, total_contrato: 1_000_000 }));
const financeiro = items => calc.calcularFinanceiroMedicao(orcItems, [], sessions, items, 0, 0);

test('medição só com positivos mantém o resultado', () => {
  assert.equal(calc.somarTotaisLiquidos([100.004, 200.006, 0.333]), 300.34);
});

test('medição com item negativo reduz o total líquido', () => {
  assert.equal(calc.somarTotaisLiquidos([1000, 250.5, -300.25]), 950.25);
});

test('percentual não quebra com estorno que zera a medição', () => {
  const r = calc.calcularFinanceiroMedicao(
    [{ item: '1.1', total_contrato: 1000 }], [],
    [{ id: 'a', sequencia: 1, status: 'bloqueada' }, { id: 'b', sequencia: 2, status: 'bloqueada' }],
    [{ medicao_id: 'a', item_code: '1.1', total: 500, pct: 50 }, { medicao_id: 'b', item_code: '1.1', total: -500, pct: -50 }],
    0, 0);
  assert.equal(r.marcos[1].valorMedicao, -500);
  assert.equal(r.valorAcumulado, 0);
  assert.equal(r.percentualExecutado, 0);
  assert.ok(Number.isFinite(r.marcos[1].percentualAcumulado));
});

test('Paranatinga: 1ª a 4ª medições inalteradas', () => {
  const m = financeiro(medicaoItems).marcos.map(x => x.valorMedicao);
  assert.deepEqual(Array.from(m.slice(0, 4)), [10148.99, 73042.78, 41041.76, 208472.21]);
});

test('Paranatinga: 5ª medição líquida = 52.576,01 (estorno 8.4 = -3.866,02)', () => {
  const r = financeiro(medicaoItems);
  assert.equal(r.marcos[4].valorMedicao, 52576.01);
  const semEstorno = financeiro(medicaoItems.filter(i => !(i.medicao_id === 's5' && i.item_code === '8.4')));
  assert.equal(semEstorno.marcos[4].valorMedicao, 56442.03);
});

test('Paranatinga: acumulado = soma líquida das medições = 385.281,75', () => {
  const r = financeiro(medicaoItems);
  assert.equal(r.valorAcumulado, 385281.75);
  assert.equal(calc.somarTotaisLiquidos(r.marcos.map(x => x.valorMedicao)), 385281.75);
});

test('card Executado e lista usam a mesma soma líquida', () => {
  const s5 = medicaoItems.filter(i => i.medicao_id === 's5').map(i => i.total);
  assert.equal(calc.somarTotaisLiquidos(s5), financeiro(medicaoItems).marcos[4].valorMedicao);
});

test('estorno em item suprimido (contrato ajustado 0) é gravado com sinal', () => {
  const p = pers.montarItemPersistido({ qnt: -30.16, percentual: -99.9668, total: -3866.02 }, 0, 30.17);
  assert.equal(p.qtd, -30.16);
  assert.equal(p.total, -3866.02);
  assert.equal(p.pct, -99.9668);
  assert.equal(pers.itemPersistidoVazio(p), false);
});

test('estorno em item com contrato positivo mantém total negativo', () => {
  const p = pers.montarItemPersistido({ qnt: -2, total: -200 }, 1000, 10);
  assert.equal(p.total, -200);
  assert.equal(p.pct, -20);
});

test('medição só com estorno conta como medição com lançamentos', () => {
  assert.equal(pers.medicaoTemLancamentos({ 1: { qnt: -1, percentual: 0, total: -50 } }), true);
  assert.equal(pers.medicaoTemLancamentos({ 1: { qnt: 0, percentual: 0, total: 0 } }), false);
  assert.equal(pers.lancamentoEhEstorno({ qnt: -30.16, total: 0 }), true);
});
