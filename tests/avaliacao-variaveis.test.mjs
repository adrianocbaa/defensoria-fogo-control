// Variáveis da pesquisa antes da coleta: catálogo, campos dinâmicos, gravação na fonte e completude.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src = readFileSync(new URL('../src/lib/avaliacao/variaveis.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Number, String, Math, Object, Array, JSON, Set });
const V = exports;
const plain = (x) => JSON.parse(JSON.stringify(x));

const ATRIBUTOS = [
  { id: 'at-ac', codigo: 'AREA_CONSTRUIDA', nome: 'Área construída', data_type: 'NUMERIC', unidade: 'm²', modelable: true, ordem: 1 },
  { id: 'at-ap', codigo: 'AREA_PRIVATIVA', nome: 'Área privativa', data_type: 'NUMERIC', unidade: 'm²', modelable: true, ordem: 4 },
  { id: 'at-bn', codigo: 'BANHEIROS', nome: 'Banheiros', data_type: 'NUMERIC', unidade: 'un', modelable: true, ordem: 12 },
  { id: 'at-pd', codigo: 'PADRAO', nome: 'Padrão construtivo', data_type: 'CATEGORY', unidade: null, opcoes: ['BAIXO', 'NORMAL', 'ALTO'], modelable: true, ordem: 20 },
  { id: 'at-obs', codigo: 'OBS', nome: 'Observação', data_type: 'TEXT', modelable: false, ordem: 99 },
];
const cat = V.catalogo(ATRIBUTOS);
const item = (chave) => cat.find((c) => c.chave === chave);

test('Banheiros do catálogo preenche código, tipo, unidade e origem automaticamente', () => {
  const nv = V.novaVariavelDoItem(item('atributo:BANHEIROS'), 'INDEPENDENTE', 'POSITIVA', true);
  assert.deepEqual(plain(nv), { nome: 'Banheiros', codigo: 'banheiros', tipo_variavel: 'QUANTITATIVA', unidade: 'un', origem_tipo: 'ATRIBUTO_IMOBILIARIO',
    campo_origem: null, atributo_id: 'at-bn', categorica: null, papel: 'INDEPENDENTE', relacao_esperada: 'POSITIVA', obrigatoria: true,
    transformacoes_autorizadas: ['DIRECT', 'LN', 'INVERSE'] });
});

test('Valor mensal é a dependente de mercado: aponta para o valor utilizado', () => {
  const vm_ = item('campo:valor_utilizado');
  assert.equal(vm_.nome, 'Valor mensal'); assert.equal(vm_.codigo, 'valor_mensal'); assert.equal(vm_.unidade, 'R$/mês');
  assert.equal(vm_.campo_origem, 'valor_utilizado'); assert.equal(vm_.origem_tipo, 'CAMPO_DADO_MERCADO'); assert.equal(vm_.papelSugerido, 'DEPENDENTE');
  const nv = V.novaVariavelDoItem(vm_, 'DEPENDENTE', 'POSITIVA', true);
  assert.equal(nv.relacao_esperada, 'INDEFINIDA', 'relação esperada só vale para independente');
});

test('catálogo não duplica campos físicos nem oferece texto livre; reconhece variável antiga com a mesma origem', () => {
  assert.equal(cat.filter((c) => c.nome === 'Área construída').length, 1);
  assert.equal(item('atributo:OBS'), undefined);
  assert.equal(item('atributo:PADRAO').tipo_variavel, 'CODIGO_ALOCADO');
  const antiga = { id: 'v-old', codigo: 'area', campo_origem: 'area_construida', atributo_id: null };
  assert.equal(V.variavelDoItem(item('campo:area_construida'), [antiga]).id, 'v-old');
});

test('código da variável personalizada gerado do nome', () => {
  assert.equal(V.slugCodigo('Idade aparente estimada'), 'idade_aparente_estimada');
  assert.equal(V.slugCodigo('Área útil'), 'area_util');
  assert.equal(V.slugCodigo('2 vagas cobertas'), 'v_2_vagas_cobertas');
  assert.match(V.slugCodigo('x'.repeat(80)), /^[a-z][a-z0-9_]{0,39}$/);
  assert.equal(V.codigoExibicao('area_privativa'), 'AREA_PRIVATIVA');
});

// Situação Guarantã: Valor mensal (dependente), Área privativa e Banheiros; 13 amostras, a 12 sem Área privativa.
const vars = [
  { id: 'vm', codigo: 'valor_mensal', nome: 'Valor mensal', papel: 'DEPENDENTE', obrigatoria: true, fonte: 'MERCADO', campo_origem: 'valor_utilizado', precisa_avaliando: false, unidade: 'R$/mês', data_type: null },
  { id: 'ap', codigo: 'area_privativa', nome: 'Área privativa', papel: 'INDEPENDENTE', obrigatoria: true, fonte: 'ATRIBUTO', atributo_codigo: 'AREA_PRIVATIVA', precisa_avaliando: true, unidade: 'm²', data_type: 'NUMERIC' },
  { id: 'bn', codigo: 'banheiros', nome: 'Banheiros', papel: 'INDEPENDENTE', obrigatoria: true, fonte: 'ATRIBUTO', atributo_codigo: 'BANHEIROS', precisa_avaliando: true, unidade: 'un', data_type: 'NUMERIC' },
  { id: 'id', codigo: 'idade', nome: 'Idade estimada', papel: 'DISPONIVEL', obrigatoria: false, fonte: 'MANUAL', precisa_avaliando: true, unidade: 'anos', data_type: null },
];
const amostras = Array.from({ length: 13 }, (_, i) => ({ amostra_id: `a${i + 1}`, indice: i + 1, selecionada: true, habilitada_modelo: true,
  faltando: i === 11 ? ['ap'] : [], completa: i !== 11 }));
const st = { avaliando: { imovel_id: 'im0', faltando: [] }, variaveis: vars, amostras };

test('avaliando mostra só as variáveis que precisam de valor nele; amostra mostra todas', () => {
  assert.deepEqual(plain(V.camposDinamicos(st, 'AVALIANDO').map((c) => c.variavel.nome)), ['Área privativa', 'Banheiros', 'Idade estimada']);
  assert.deepEqual(plain(V.camposDinamicos(st, 'AMOSTRA').map((c) => c.variavel.nome)), ['Valor mensal', 'Área privativa', 'Banheiros', 'Idade estimada']);
  assert.equal(V.camposDinamicos(st, 'AMOSTRA')[0].editavel, false, 'Valor mensal vem do valor utilizado, não é redigitado');
});

test('salvar Banheiros grava na característica do imóvel; variável personalizada grava valor manual da amostra', () => {
  const campos = V.camposDinamicos(st, 'AMOSTRA');
  const { alteracoes, invalidos } = V.alteracoesDinamicas(campos, { ap: 120, bn: null, id: null },
    { ap: '120,00', bn: '2', id: '7' }, { imovel_id: 'im5', dado_id: 'd5', amostra_id: 'a5' });
  assert.deepEqual(invalidos, []);
  assert.deepEqual(plain(alteracoes.map((a) => [a.entity_type, a.entity_id, a.campo, a.valor, a.contexto])), [
    ['imovel_atributo', 'im5', 'BANHEIROS', '2', { dado_id: 'd5' }],
    ['variavel_valor', 'id', 'valor', 7, { amostra_id: 'a5' }],
  ]);
});

test('valor inválido não entra no lote', () => {
  const r = V.alteracoesDinamicas(V.camposDinamicos(st, 'AVALIANDO'), {}, { ap: 'abc', bn: '-1' }, { imovel_id: 'im0' });
  assert.deepEqual(plain(r.invalidos), ['Área privativa', 'Banheiros']);
  assert.equal(r.alteracoes.length, 0);
});

test('amostra incompleta pode ser salva: obrigatórias vazias são só avisadas', () => {
  const campos = V.camposDinamicos(st, 'AMOSTRA');
  assert.deepEqual(plain(V.obrigatoriasVazias(campos, { ap: '', bn: '2' }, { vm: 1500 })), ['Área privativa']);
  assert.deepEqual(plain(V.obrigatoriasVazias(campos, { ap: '80', bn: '2' }, { vm: null })), ['Valor mensal']);
});

test('completude 12/13 aponta exatamente a amostra 12 e bloqueia o congelamento com mensagem concreta', () => {
  const b = V.bloqueiosCongelamento(st);
  assert.deepEqual(plain(b), [{ amostra_id: 'a12', indice: 12, faltando: ['Área privativa'] }]);
  assert.equal(V.mensagemCongelamento(b), 'Não é possível congelar o conjunto: Amostra 12 sem Área privativa.');
  const fora = { ...st, amostras: st.amostras.map((a) => (a.indice === 12 ? { ...a, habilitada_modelo: false } : a)) };
  assert.equal(V.bloqueiosCongelamento(fora).length, 0, 'amostra fora do modelo não bloqueia');
});

test('mensagem do servidor ao recusar congelamento', () => {
  const b = V.bloqueiosDoServidor('[{"amostra": 3, "faltando": ["Banheiros", "Área privativa"]}]');
  assert.equal(V.mensagemCongelamento(b), 'Não é possível congelar o conjunto: Amostra 3 sem Banheiros e Área privativa.');
  assert.deepEqual(plain(V.bloqueiosDoServidor('não é json')), []);
});

test('característica categórica volta ao formulário pela opção', () => {
  const pd = { fonte: 'ATRIBUTO', data_type: 'CATEGORY', opcoes: ['BAIXO', 'NORMAL', 'ALTO'] };
  assert.equal(V.valorParaFormulario(pd, 2), 'NORMAL');
  assert.equal(V.valorParaFormulario({ fonte: 'ATRIBUTO', data_type: 'NUMERIC' }, 127.82), '127,82');
});
