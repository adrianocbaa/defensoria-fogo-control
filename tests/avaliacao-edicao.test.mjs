// Edição completa: somente campos alterados entram no lote; números no padrão brasileiro; prévia do valor unitário.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src = readFileSync(new URL('../src/lib/avaliacao/edicao.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Number, String, Math, Object, Array, JSON });
const E = exports;
const plain = (x) => JSON.parse(JSON.stringify(x));

const valorAdm = (id) => [
  { chave: 'tipo', entity_type: 'valor_administrativo', entity_id: id, campo: 'tipo', rotulo: 'Tipo do valor', tipo: 'opcao', opcoes: { CONTRATO_ATUAL: 'Contrato atual', REAJUSTADO: 'Reajustado' } },
  { chave: 'valor', entity_type: 'valor_administrativo', entity_id: id, campo: 'valor', rotulo: 'Valor mensal', tipo: 'numero', casas: 2, prefixo: 'R$' },
  { chave: 'data_referencia', entity_type: 'valor_administrativo', entity_id: id, campo: 'data_referencia', rotulo: 'Data de referência', tipo: 'data' },
  { chave: 'observacao', entity_type: 'valor_administrativo', entity_id: id, campo: 'observacao', rotulo: 'Observação', tipo: 'texto' },
];

test('valor administrativo: os quatro campos alterados entram em um único lote', () => {
  const original = { tipo: 'CONTRATO_ATUAL', valor: 5000, data_referencia: '2026-01-10', observacao: 'inicial' };
  const lote = E.montarAlteracoes(valorAdm('v1'), original, { tipo: 'REAJUSTADO', valor: '6.200,50', data_referencia: '2026-02-01', observacao: 'corrigida' });
  assert.deepEqual(plain(lote.map((c) => [c.campo, c.valor])), [['tipo', 'REAJUSTADO'], ['valor', 6200.5], ['data_referencia', '2026-02-01'], ['observacao', 'corrigida']]);
  assert.equal(lote[0].de, 'Contrato atual'); assert.equal(lote[0].para, 'Reajustado');
  assert.equal(lote[2].de, '10/01/2026'); assert.equal(lote[2].para, '01/02/2026');
});

test('campos sem diferença real não entram no lote (5000 = "5.000,00"; espaços ignorados)', () => {
  const original = { tipo: 'CONTRATO_ATUAL', valor: 5000, data_referencia: '2026-01-10', observacao: 'inicial' };
  const lote = E.montarAlteracoes(valorAdm('v1'), original, { tipo: 'CONTRATO_ATUAL', valor: '5.000,00', data_referencia: '2026-01-10', observacao: ' inicial ' });
  assert.equal(lote.length, 0);
});

test('números no padrão brasileiro', () => {
  assert.equal(E.parseDecimalBR('1.234,56'), 1234.56);
  assert.equal(E.parseDecimalBR('242,5'), 242.5);
  assert.equal(E.parseDecimalBR('242.5'), 242.5);
  assert.equal(E.parseDecimalBR('1.234'), 1234);
  assert.equal(E.parseDecimalBR(''), null);
  assert.ok(Number.isNaN(E.parseDecimalBR('abc')));
});

test('campo numérico inválido é apontado antes de salvar', () => {
  assert.deepEqual(plain(E.camposInvalidos(valorAdm('v1'), { valor: '12a' })), ['Valor mensal']);
});

test('limpar um campo opcional envia vazio (null)', () => {
  const lote = E.montarAlteracoes(valorAdm('v1'), { observacao: 'algo' }, { observacao: '' });
  assert.equal(lote.length, 1); assert.equal(lote[0].valor, null); assert.equal(lote[0].para, '—');
});

test('contexto do imóvel (dado e escolha de compartilhamento) segue no lote', () => {
  const campos = [{ chave: 'area_construida', entity_type: 'imovel', entity_id: 'i1', campo: 'area_construida', rotulo: 'Área construída', tipo: 'numero', casas: 2, contexto: { dado_id: 'd1', modo: 'CLONAR' } }];
  const lote = E.montarAlteracoes(campos, { area_construida: 50 }, { area_construida: '45' });
  assert.deepEqual(plain(lote[0].contexto), { dado_id: 'd1', modo: 'CLONAR' }); assert.equal(lote[0].valor, 45);
});

test('origem diferente da chave do formulário (mesmo campo em imóvel e dado)', () => {
  const campos = [{ chave: 'anuncio_url', origem: 'url_anuncio', entity_type: 'dado_mercado', entity_id: 'd1', campo: 'url_anuncio', rotulo: 'Link', tipo: 'texto' }];
  assert.equal(E.montarAlteracoes(campos, { url_anuncio: 'x', anuncio_url: 'y' }, { anuncio_url: 'x' }).length, 0);
});

test('valor unitário = valor ÷ área construída com 4 casas (mesma regra do servidor)', () => {
  assert.equal(E.valorUnitario(1000, 40), 25);
  assert.equal(E.valorUnitario(1000, 45), 22.2222);
  assert.equal(E.valorUnitario(1000, null), null);
  assert.equal(E.valorUnitario(1000, 0), null);
});
