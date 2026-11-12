// Banco reutilizável de imóveis: filtros, aviso de dado mais recente, seleção e foto usada pelo laudo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src = readFileSync(new URL('../src/lib/avaliacao/banco.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Number, String, Math, Object, Array, JSON, Set });
const B = exports;
const plain = (x) => JSON.parse(JSON.stringify(x));

test('busca começa pelo município da avaliação atual, em locação, só com o dado mais recente de cada imóvel', () => {
  const f = B.filtrosIniciais({ municipio_ibge: '5104104' });
  assert.deepEqual(plain(B.filtrosParaServidor(f)), { somente_recentes: true, municipio_ibge: '5104104', tipo_negocio: 'LOCACAO' });
});

test('faixa de área aceita número em formato brasileiro e ignora campos vazios', () => {
  const f = { ...B.filtrosIniciais({ municipio_ibge: null }), tipo_negocio: '', area_min: '1.200,5', area_max: ' ', bairro: '  Centro ' };
  assert.deepEqual(plain(B.filtrosParaServidor(f)), { somente_recentes: true, bairro: 'Centro', area_min: '1200.5' });
});

test('avisa quando existe dado de mercado mais recente do mesmo imóvel', () => {
  assert.equal(B.avisoDadoRecente({ mais_recente: false, dados_do_imovel: 2, data_mais_recente: '2026-11-05' }), 'Há dado mais recente deste imóvel (05/11/2026).');
  assert.equal(B.avisoDadoRecente({ mais_recente: true, dados_do_imovel: 2, data_mais_recente: '2026-11-05' }), null);
});

test('"Selecionar todos" não inclui o que já está na avaliação', () => {
  assert.deepEqual(plain(B.selecionaveis([{ dado_id: 'a', ja_na_avaliacao: false }, { dado_id: 'b', ja_na_avaliacao: true }, { dado_id: 'c', ja_na_avaliacao: false }])), ['a', 'c']);
});

test('origem territorial: mesmo município é local; outro município é comparável', () => {
  assert.equal(B.origemTerritorialPadrao('5104104', '5104104'), 'LOCAL');
  assert.equal(B.origemTerritorialPadrao('5104104', '5103403'), 'MUNICIPIO_COMPARAVEL');
  assert.equal(B.origemTerritorialPadrao('5104104', null), 'LOCAL');
});

const foto = { dado: { valor_utilizado: 4000, data_observacao: '2026-03-10', natureza_dado: 'OFERTA' }, imovel: { area_construida: 80, bairro: 'Centro' } };
const amostra = { snapshot_inclusao: foto, dados_mercado: { valor_utilizado: 4100, data_observacao: '2026-03-10', natureza_dado: 'OFERTA', imoveis: { area_construida: 82, bairro: 'Centro' } } };

test('laudo concluído mostra a foto do conjunto congelado (R$ 4.000), não o cadastro atual (R$ 4.100)', () => {
  const conj = { dado: { valor_utilizado: 4000 }, imovel: { area_construida: 80 } };
  const e = B.exibicaoAmostra(amostra, conj, true);
  assert.equal(e.fonte, 'FOTO_CONJUNTO'); assert.equal(e.dado.valor_utilizado, 4000); assert.equal(e.imovel.area_construida, 80);
});

test('laudo concluído sem conjunto usa a foto da inclusão', () => {
  const e = B.exibicaoAmostra(amostra, null, true);
  assert.equal(e.fonte, 'FOTO_INCLUSAO'); assert.equal(e.dado.valor_utilizado, 4000);
});

test('avaliação ativa mostra o cadastro atual e aponta o que mudou desde a inclusão', () => {
  const e = B.exibicaoAmostra(amostra, null, false);
  assert.equal(e.fonte, 'CADASTRO'); assert.equal(e.dado.valor_utilizado, 4100);
  assert.deepEqual(plain(e.alterados), ['valor utilizado', 'área construída']); assert.equal(e.comparadoCom, 'INCLUSAO');
});

test('números iguais em texto e número não contam como alteração', () => {
  assert.deepEqual(plain(B.camposAlterados({ dado: { valor_utilizado: '4000.00' }, imovel: {} }, { dado: { valor_utilizado: 4000 }, imovel: {} })), []);
});
