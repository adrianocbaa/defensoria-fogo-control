// Município pertence ao imóvel: sugestão pelo laudo, origem territorial, duplicidade e situação de município comparável.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src = readFileSync(new URL('../src/lib/avaliacao/municipioImovel.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Number, String, Math, Object, Array, JSON, Set });
const M = exports;
const plain = (x) => JSON.parse(JSON.stringify(x));
const PEIXOTO = { uf: 'MT', municipio_ibge: '5106422', municipio_nome: 'Peixoto de Azevedo' };
const TERRA_NOVA = { uf: 'MT', municipio_ibge: '5108055', municipio_nome: 'Terra Nova do Norte' };

test('avaliação de Peixoto: imóvel escolhido em Terra Nova do Norte grava Terra Nova e o IBGE 5108055', () => {
  assert.deepEqual(plain(M.municipioParaGravar(TERRA_NOVA)), { municipio_nome: 'Terra Nova do Norte', municipio_ibge: '5108055', uf: 'MT' });
});

test('origem territorial de imóvel de Terra Nova numa avaliação de Peixoto é fora do município', () => {
  assert.equal(M.origemPorMunicipio(PEIXOTO.municipio_ibge, TERRA_NOVA.municipio_ibge), 'MUNICIPIO_COMPARAVEL');
  assert.equal(M.origemAposTrocaMunicipio('LOCAL', PEIXOTO.municipio_ibge, TERRA_NOVA.municipio_ibge), 'MUNICIPIO_COMPARAVEL');
  // voltar para Peixoto volta a "mesmo município"; origem escolhida pelo avaliador é mantida
  assert.equal(M.origemAposTrocaMunicipio('MUNICIPIO_COMPARAVEL', PEIXOTO.municipio_ibge, PEIXOTO.municipio_ibge), 'LOCAL');
  assert.equal(M.origemAposTrocaMunicipio('CONTRATO_PUBLICO_EXTERNO', PEIXOTO.municipio_ibge, TERRA_NOVA.municipio_ibge), 'CONTRATO_PUBLICO_EXTERNO');
});

test('imóvel local sem alteração herda Peixoto por padrão e fica "mesmo município"', () => {
  const sug = M.municipioSugerido({ uf: 'MT', municipio_ibge: '5106422', municipio_nome: 'Peixoto de Azevedo' });
  assert.deepEqual(plain(sug), PEIXOTO);
  assert.deepEqual(plain(M.municipioParaGravar(sug)), { municipio_nome: 'Peixoto de Azevedo', municipio_ibge: '5106422', uf: 'MT' });
  assert.equal(M.origemPorMunicipio('5106422', sug.municipio_ibge), 'LOCAL');
});

test('município incompleto não é aceito (falta escolher depois de trocar a UF)', () => {
  assert.equal(M.municipioValido(TERRA_NOVA), true);
  assert.equal(M.municipioValido({ uf: 'MS', municipio_ibge: '', municipio_nome: '' }), false);
  assert.equal(M.municipioValido({ uf: 'MT', municipio_ibge: '51', municipio_nome: 'X' }), false);
});

test('edição detecta troca de município sem acusar campos iguais', () => {
  assert.equal(M.mudouMunicipio(PEIXOTO, { ...PEIXOTO }), false);
  assert.equal(M.mudouMunicipio(PEIXOTO, { ...TERRA_NOVA }), true);
  assert.equal(M.mudouMunicipio({ uf: null, municipio_ibge: null, municipio_nome: null }, { uf: '', municipio_ibge: '', municipio_nome: '' }), false);
});

test('situação do município externo na lista de comparáveis desta avaliação', () => {
  const av = { municipio_ibge: '5106422' };
  assert.equal(M.situacaoComparavel(av, PEIXOTO, []), 'MESMO_MUNICIPIO');
  assert.equal(M.situacaoComparavel(av, TERRA_NOVA, []), 'NAO_CADASTRADO');
  assert.equal(M.situacaoComparavel(av, TERRA_NOVA, [{ municipio_ibge: '5108055', status: 'SUGERIDO' }]), 'SUGERIDO');
  assert.equal(M.situacaoComparavel(av, TERRA_NOVA, [{ municipio_ibge: '5108055', status: 'REJEITADO' }, { municipio_ibge: '5108055', status: 'APROVADO' }]), 'APROVADO');
  // registro antigo sem código: confere por nome e UF, sem acento/maiúsculas
  assert.equal(M.situacaoComparavel(av, TERRA_NOVA, [{ municipio_ibge: null, municipio_nome: 'terra nova do norte', uf: 'mt', status: 'APROVADO' }]), 'APROVADO');
  assert.equal(M.situacaoComparavel(av, TERRA_NOVA, [{ municipio_ibge: '5103403', status: 'APROVADO' }]), 'NAO_CADASTRADO');
  assert.equal(M.mensagemComparavel('MESMO_MUNICIPIO', PEIXOTO), null);
  assert.equal(M.mensagemComparavel('NAO_CADASTRADO', TERRA_NOVA).tom, 'pendente');
  assert.match(M.mensagemComparavel('NAO_CADASTRADO', TERRA_NOVA).texto, /Terra Nova do Norte\/MT/);
});

test('o cadastro de imóvel usa o município do formulário na gravação e na duplicidade', () => {
  const form = readFileSync(new URL('../src/components/avaliacoes/ImovelForm.tsx', import.meta.url), 'utf8');
  assert.match(form, /p_municipio_ibge: municipioParaGravar\(v\)\.municipio_ibge/);
  assert.match(form, /\.\.\.municipioParaGravar\(v\)/);
  assert.doesNotMatch(form, /municipio_nome: municipio\.nome/);
});
