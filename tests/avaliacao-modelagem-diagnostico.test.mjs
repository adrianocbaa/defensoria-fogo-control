// Modelagem: conjunto congelado desatualizado, motivo amigável do erro de cálculo e ajuda das transformações.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load = (rel) => {
  const exports = {};
  const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, Number, String, Math, Object, Array, JSON, Set, Map });
  return exports;
};
const D = load('../src/lib/avaliacao/modelDiagnostics.ts');
const E = load('../src/lib/avaliacao/errors.ts');
const OUTDATED = 'O conjunto vigente foi congelado antes das últimas alterações em variáveis/amostras. Congele uma nova versão do conjunto antes de gerar modelos.';
const todas = Array.from({ length: 13 }, (_, i) => i + 1);
// Situação real do Modelo 24: conjunto v1 congelado antes da etapa Variáveis — nenhum dos 13 snapshots traz as variáveis.
const homolog = {
  conjunto_id: 'c1', versao: 1, amostras: 13, compativel: false, motivo: 'VARIAVEL_AUSENTE',
  variaveis: [
    { id: 'v1', codigo: 'valor_mensal', nome: 'Valor mensal', papel: 'DEPENDENTE', presentes: 0, ausentes: 13, divergentes: 0, ausentes_amostras: todas, divergentes_amostras: [] },
    { id: 'v2', codigo: 'area_construida', nome: 'Área construída', papel: 'INDEPENDENTE', presentes: 0, ausentes: 13, divergentes: 0, ausentes_amostras: todas, divergentes_amostras: [] },
  ],
};
const vars = [{ codigo: 'valor_mensal', nome: 'Valor mensal' }, { codigo: 'area_construida', nome: 'Área construída' }];

test('conjunto congelado sem as variáveis atuais bloqueia com a mensagem exigida', () => {
  const r = D.compatSummary(homolog);
  assert.equal(r.compativel, false);
  assert.equal(r.mensagem, OUTDATED);
  assert.equal(D.DATASET_OUTDATED_MSG, OUTDATED);
  assert.equal(r.detalhes[0], 'Valor mensal: não existe no conjunto versão 1 (ausente em todas as amostras).');
});

test('valor alterado depois do congelamento aponta a amostra', () => {
  const r = D.compatSummary({ ...homolog, motivo: 'VALOR_ALTERADO', variaveis: [
    { id: 'v2', codigo: 'area_construida', nome: 'Área construída', papel: 'INDEPENDENTE', presentes: 13, ausentes: 0, divergentes: 1, ausentes_amostras: [], divergentes_amostras: [12] }] });
  assert.equal(r.compativel, false);
  assert.deepEqual([...r.detalhes], ['Área construída: valor do cadastro alterado depois do congelamento na amostra 12.']);
});

test('conjunto compatível não gera aviso', () => {
  assert.equal(D.compatSummary({ ...homolog, compativel: true, motivo: null }).mensagem, null);
  assert.equal(D.compatSummary(null).compativel, true);
});

test('completude congelada mostra 0/13 mesmo com a pesquisa viva em 13/13', () => {
  assert.deepEqual({ ...D.frozenCompleteness(homolog, 'v1') }, { presentes: 0, total: 13 });
});

test('Modelo 24: MISSING_VALUES sobre conjunto desatualizado explica e leva ao Mercado', () => {
  const r = D.explainModelError('MISSING_VALUES', { sample: '0f2a24ce-fe5b-45f5-bdbf-527a11f44a87', variable: 'valor_mensal' },
    { variaveis: vars, amostraIndice: (id) => (id === '0f2a24ce-fe5b-45f5-bdbf-527a11f44a87' ? 1 : null), compat: homolog });
  assert.equal(r.titulo, 'Por que este modelo não foi calculado?');
  assert.equal(r.mensagem, OUTDATED);
  assert.equal(r.acao, 'MERCADO');
  assert.equal(r.acaoTexto, 'Ir para Mercado / Congelar nova versão');
  assert.equal(r.contexto, 'Variável: Valor mensal · Amostra 1');
  assert.equal(r.codigo, 'MISSING_VALUES');
});

test('MISSING_VALUES com conjunto compatível: amostra sem valor válido', () => {
  const r = D.explainModelError('MISSING_VALUES', { variable: 'valor_mensal', sample: 'x' }, { variaveis: vars });
  assert.equal(r.mensagem, 'Há amostra sem valor válido para uma das variáveis do modelo.');
  assert.equal(D.explainModelError('NON_FINITE', {}).mensagem, 'Há amostra sem valor válido para uma das variáveis do modelo.');
  assert.equal(D.explainModelError('MISSING_VALUES', { variable: 'area_construida', scope: 'AVALIANDO' }, { compat: homolog }).acao, 'IMOVEL');
});

test('transformação inválida por domínio gera texto explicativo com o valor', () => {
  const r = D.explainModelError('INVALID_DOMAIN', { variable: 'area_construida', transform: 'LN', sample: 's3', value: 0 },
    { variaveis: vars, amostraIndice: () => 3 });
  assert.equal(r.mensagem, 'Há valor incompatível com a transformação escolhida (ex.: ln(x) exige valor > 0; 1/x exige valor diferente de zero).');
  assert.equal(r.contexto, 'Variável: Área construída · Amostra 3 · Transformação: ln(x) · Valor: 0');
  assert.equal(r.acao, 'TRANSFORMACOES');
});

test('demais códigos do motor têm causa amigável', () => {
  assert.equal(D.explainModelError('N_LE_P', { n: 3, p: 4 }).mensagem, 'Há poucos dados para a quantidade de parâmetros do modelo (3 amostras para 4 parâmetros).');
  assert.equal(D.explainModelError('RANK_DEFICIENT', {}).mensagem, 'As variáveis escolhidas não permitem estimar coeficientes independentes (colinearidade/perda de posto).');
  assert.equal(D.explainModelError('ZERO_VARIANCE', { variable: 'x' }).mensagem, 'Uma variável não varia entre as amostras.');
  assert.equal(D.explainModelError('dataset_outdated', {}).mensagem, OUTDATED);
  assert.equal(D.explainModelError('ALGO_NOVO', { segredo: 'stack' }).mensagem, 'O cálculo não pôde ser concluído.');
});

test('toast/erros: códigos do motor em maiúsculas e do servidor são traduzidos; texto bruto nunca aparece', () => {
  assert.equal(E.avalErrorMessage({ message: 'aval:dataset_outdated' }), OUTDATED);
  assert.equal(E.avalErrorMessage({ message: 'aval:INVALID_DOMAIN' }), 'Há valor incompatível com a transformação escolhida (ex.: ln(x) exige valor > 0; 1/x exige valor diferente de zero).');
  assert.equal(E.avalErrorMessage({ code: 'MISSING_VALUES', message: 'qualquer coisa' }), 'Há amostra sem valor válido para uma das variáveis do modelo.');
  assert.equal(E.avalErrorMessage({ code: '22023', message: 'ERROR: relation x at line 3' }, 'Falhou.'), 'Falhou.');
});

test('ajuda das transformações usa y para a dependente e x para independentes', () => {
  assert.equal(D.transformHelp('LN', true), 'ln(y) — logaritmo natural; exige valor maior que zero');
  assert.equal(D.transformHelp('INVERSE', false), '1/x — inverso do valor; não admite zero');
  assert.equal(D.transformHelp('INV_SQUARE', false), '1/x² — inverso do quadrado; não admite zero');
  assert.equal(D.transformHelp('INV_SQRT', true), '1/√y — inverso da raiz; exige valor maior que zero');
  assert.equal(D.transformHelp('SQRT', false), '√x — raiz quadrada; não admite valor negativo');
  assert.equal(D.transformRoleNote(true), 'Aqui y representa a variável que queremos estimar.');
  assert.equal(D.transformRoleNote(false), 'Aqui x representa a característica usada para explicar o valor.');
});

test('modal de transformações explica que várias marcações são alternativas, não simultâneas', () => {
  assert.match(D.TRANSFORM_MODAL_INTRO, /Cada modelo usa apenas uma transformação desta variável por vez/);
  assert.match(D.TRANSFORM_MODAL_INTRO, /marcar várias opções apenas autoriza alternativas/);
  const ui = readFileSync(new URL('../src/components/avaliacoes/blocks/ModelagemBlock.tsx', import.meta.url), 'utf8');
  assert.match(ui, /<DialogDescription>\{TRANSFORM_MODAL_INTRO\}<\/DialogDescription>/);
  assert.doesNotMatch(ui, /toast\.error\(\(e as Error\)\.message\)/);
});

test('motor estatístico permanece na versão 1.1.1 (problema era do conjunto congelado, não da fórmula)', () => {
  const src = readFileSync(new URL('../supabase/functions/_shared/avaliacao/engine.ts', import.meta.url), 'utf8');
  assert.match(src, /ENGINE_VERSION\s*=\s*'1\.1\.1'/);
});
