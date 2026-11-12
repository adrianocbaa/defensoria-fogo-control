// Ciclo de vida do modelo (retirar da validação, revalidar, arquivar) e interpretação do sinal com transformações monotônicas.
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
const C = load('src/lib/avaliacao/cicloModelo.ts');
const plain = (x) => JSON.parse(JSON.stringify(x));
const RULE = { codigo: 'RELACIONAMENTO', numero: 1, nome: 'Relacionamento', origem: 'NORMA_TECNICA', modo: 'AUTOMATICO', bloqueante: false, entra_fundamentacao: false, thresholds: {}, ativo: true };

/** Ajuste mínimo: só o que o critério de relacionamento lê (coeficientes). */
const fitCom = (betas) => ({ k: betas.length, coefficients: [{ code: 'intercepto', beta: 1 }, ...betas.map(([code, beta]) => ({ code, beta }))] });
const relac = (betas, vars, dep = { transform: 'DIRECT' }) =>
  V.validateModel(fitCom(betas), null, vars.map((v) => ({ tipo: 'QUANTITATIVA', values: [], ...v })), dep, [RULE], {}).results[0];

test('9) 1/x com relação esperada positiva e coeficiente negativo ATENDE (ln(valor) ~ 1/area)', () => {
  const r = relac([['area', -120]], [{ code: 'area', relacao_esperada: 'POSITIVA', transform: 'INVERSE' }], { transform: 'LN' });
  assert.equal(r.status, 'ATENDE');
  assert.equal(r.dados.itens[0].efeito, 'POSITIVA');
  // O sinal bruto (negativo) não é comparado ingenuamente: esperar NEGATIVA aqui NÃO atende.
  assert.equal(relac([['area', -120]], [{ code: 'area', relacao_esperada: 'NEGATIVA', transform: 'INVERSE' }], { transform: 'LN' }).status, 'NAO_ATENDE');
});

test('10) transformações crescentes com relação positiva e coeficiente positivo ATENDEM', () => {
  for (const t of ['DIRECT', 'LN', 'SQUARE', 'SQRT']) {
    const r = relac([['x', 3.2]], [{ code: 'x', relacao_esperada: 'POSITIVA', transform: t }]);
    assert.equal(r.status, 'ATENDE', t);
    assert.equal(relac([['x', -3.2]], [{ code: 'x', relacao_esperada: 'POSITIVA', transform: t }]).status, 'NAO_ATENDE', `${t} com coeficiente negativo`);
  }
});

test('11) transformações inversas (1/x, 1/x², 1/√x) invertem a leitura do sinal', () => {
  for (const t of ['INVERSE', 'INV_SQUARE', 'INV_SQRT']) {
    assert.equal(relac([['x', -2]], [{ code: 'x', relacao_esperada: 'POSITIVA', transform: t }]).status, 'ATENDE', `${t} β<0 positiva`);
    assert.equal(relac([['x', 2]], [{ code: 'x', relacao_esperada: 'NEGATIVA', transform: t }]).status, 'ATENDE', `${t} β>0 negativa`);
    assert.equal(relac([['x', 2]], [{ code: 'x', relacao_esperada: 'POSITIVA', transform: t }]).status, 'NAO_ATENDE', `${t} β>0 positiva`);
  }
  // Dependente decrescente (1/y) também inverte.
  assert.equal(relac([['x', -2]], [{ code: 'x', relacao_esperada: 'POSITIVA', transform: 'DIRECT' }], { transform: 'INVERSE' }).status, 'ATENDE');
});

test('Guarantã do Norte real: ln(valor) ~ ln(banheiro) + 1/area com relações positivas atende; com a configuração antiga (negativa) não', () => {
  const fx = JSON.parse(read('tests/fixtures/guaranta-do-norte-real.json'));
  const fit = E.fitRegression(fx.input);
  assert.ok(fit.coefficients.find((c) => c.code === 'area').beta < 0, 'coeficiente de 1/area é negativo');
  const vars = (rel) => fx.input.independents.map((iv) => ({ code: iv.code, tipo: 'QUANTITATIVA', relacao_esperada: rel, transform: iv.transform, values: iv.values }));
  const dep = { transform: fx.input.dependent.transform };
  const atual = V.validateModel(fit, null, vars('POSITIVA'), dep, [RULE], {}).results[0];
  assert.equal(atual.status, 'ATENDE');
  assert.deepEqual(plain(atual.dados.itens.map((i) => i.efeito)), ['POSITIVA', 'POSITIVA']);
  const antiga = V.validateModel(fit, null, vars('NEGATIVA'), dep, [RULE], {}).results[0];
  assert.equal(antiga.status, 'NAO_ATENDE');
  // Revalidar com a configuração atual usa o MESMO ajuste: coeficientes idênticos nas duas leituras.
  assert.deepEqual(plain(atual.dados.itens.map((i) => i.code)), plain(antiga.dados.itens.map((i) => i.code)));
});

test('4/5) arquivar: em validação bloqueado com orientação; calculado permitido', () => {
  assert.deepEqual(plain(C.podeArquivar({ status: 'EM_VALIDACAO' })), { ok: false, motivo: 'Retire o modelo da validação antes de arquivá-lo.' });
  assert.equal(C.podeArquivar({ status: 'CALCULADO' }).ok, true);
  const s = C.separarArquivaveis([{ id: 'a', status: 'CALCULADO' }, { id: 'b', status: 'EM_VALIDACAO' }, { id: 'c', status: 'ERRO' }]);
  assert.deepEqual(plain(s.arquivaveis.map((m) => m.id)), ['a', 'c']);
  assert.deepEqual(plain(s.emValidacao.map((m) => m.id)), ['b']);
});

test('7) validação desatualizada após alterar a relação esperada; modelo continua revalidável', () => {
  const itens = [{ code: 'area_construida', esperado: 'NEGATIVA' }, { code: 'banheiros', esperado: 'NEGATIVA' }];
  const atuais = [{ codigo: 'area_construida', nome: 'Área construída', relacao_esperada: 'POSITIVA' }, { codigo: 'banheiros', nome: 'Banheiros', relacao_esperada: 'NEGATIVA' }];
  const alt = C.relacoesAlteradas(itens, atuais);
  assert.deepEqual(plain(alt), [{ codigo: 'area_construida', nome: 'Área construída', antes: 'NEGATIVA', agora: 'POSITIVA' }]);
  assert.equal(C.situacaoValidacao({ modeloStale: false, validacao: { stale: false }, alteradas: alt }), 'CONFIG_ALTERADA');
  assert.equal(C.situacaoValidacao({ modeloStale: false, validacao: { stale: true }, alteradas: [] }), 'CONFIG_ALTERADA');
  assert.equal(C.situacaoValidacao({ modeloStale: false, validacao: { stale: false }, alteradas: [] }), 'ATUAL');
  assert.equal(C.situacaoValidacao({ modeloStale: false, validacao: null }), 'SEM_VALIDACAO');
  assert.equal(C.situacaoValidacao({ modeloStale: true, validacao: { stale: true } }), 'MODELO_DESATUALIZADO');
  assert.equal(C.podeRevalidar('CONFIG_ALTERADA'), true);
  assert.equal(C.podeRevalidar('MODELO_DESATUALIZADO'), false);
  assert.match(C.MSG_CONFIG_ALTERADA, /coeficientes da regressão permanecem válidos/);
});

test('3/8) histórico do modelo: eventos próprios, mudança de relação das suas variáveis e arquivamento, em ordem cronológica', () => {
  const ev = (id, t, entity_type, entity_id, created_at, details_json = {}) => ({ id, event_type: t, entity_type, entity_id, created_at, details_json, actor_id: null });
  const lista = [
    ev('5', 'MODEL_REVALIDATED', 'modelo', 'M1', '2026-11-12T18:50:00Z', { validacao_anterior: 'V1' }),
    ev('1', 'MODEL_SENT_TO_VALIDATION', 'modelo', 'M1', '2026-11-12T18:20:38Z'),
    ev('2', 'VALIDATION_EXECUTED', 'modelo', 'M1', '2026-11-12T18:20:50Z'),
    ev('3', 'CHANGE_APPLIED', 'variavel', 'VA', '2026-11-12T18:41:10Z', { campo: 'relacao_esperada', anterior: 'NEGATIVA', novo: 'POSITIVA' }),
    ev('3b', 'CHANGE_APPLIED', 'variavel', 'VA', '2026-11-12T18:41:11Z', { campo: 'nome' }),
    ev('3c', 'CHANGE_APPLIED', 'variavel', 'OUTRA', '2026-11-12T18:41:12Z', { campo: 'relacao_esperada' }),
    ev('4', 'VALIDATION_MARKED_STALE', 'modelo', 'M1', '2026-11-12T18:41:10Z'),
    ev('6', 'MODEL_WITHDRAWN_FROM_VALIDATION', 'modelo', 'M1', '2026-11-12T18:55:00Z', { status_anterior: 'EM_VALIDACAO', status_novo: 'CALCULADO' }),
    ev('7', 'MODELS_ARCHIVED', 'avaliacao', 'AV', '2026-11-12T18:56:00Z', { modelos: ['M1'] }),
    ev('8', 'MODEL_SENT_TO_VALIDATION', 'modelo', 'M2', '2026-11-12T18:20:00Z'),
  ];
  const h = C.eventosDoModelo(lista, 'M1', ['VA']);
  assert.deepEqual(plain(h.map((e) => e.id)), ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual(h.map(C.rotuloEventoModelo), ['Enviado para validação', 'Validação executada', 'Relação esperada alterada',
    'Validação marcada como desatualizada', 'Revalidado com as configurações atuais', 'Retirado da validação', 'Arquivado']);
  assert.equal(C.rotuloEventoModelo({ event_type: 'MODEL_RESENT_TO_VALIDATION', details_json: {} }), 'Reenviado para validação');
  assert.equal(C.rotuloEventoModelo({ event_type: 'MODEL_ACCEPTED', details_json: {} }), 'Validado (modelo aceito)');
});

test('confirmação de retirada usa o texto aprovado', () => {
  assert.equal(C.RETIRADA.titulo, 'Retirar modelo da validação?');
  assert.equal(C.RETIRADA.texto, 'O modelo retornará para a etapa de Modelagem. Os cálculos e o histórico das validações realizadas serão preservados.');
});
