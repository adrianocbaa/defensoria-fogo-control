// Compatibilidade com valores administrativos: a tela e o laudo só apresentam o que o servidor gravou (sem recalcular).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Set, Infinity, NaN, String, DataView, Uint8Array,
    require: n => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const L = load('supabase/functions/_shared/avaliacao/docLabels.ts');
const D = load('supabase/functions/_shared/avaliacao/laudoDoc.ts', { './docLabels.ts': L });
const plain = x => JSON.parse(JSON.stringify(x));
const table = (rows) => plain(D.systemTables({ tokens: {}, compatibilidades: rows }, 'TABELA_COMPATIBILIDADE')[0]);

// Linha como gravada por aval_confirm_economic para a 004/2026 (38,28 R$/m² × 6.500 R$/mês, área 140,98 m²)
const convertida = { tipo_valor: 'SOLICITADO_PROPRIETARIO', regra_versao: 1, status_comparacao: 'COMPARAVEL', valor_referencia: 38.2839991959842,
  valor_administrativo_original: 6500, unidade_original: 'R$/mês', unidade_resultado: 'R$/m²', unidade_comparacao: 'R$/m²',
  valor_comparado: 6500 / 140.98, area_conversao: 140.98, diferenca_percentual: (38.2839991959842 - 6500 / 140.98) / 38.2839991959842 * 100 };

test('linha convertida mostra original, equivalente, área e o percentual corrigido', () => {
  const v = L.compatView(convertida);
  assert.equal(v.original, 6500); assert.equal(v.unidadeOriginal, 'R$/mês');
  assert.equal(v.convertido, true); assert.equal(Math.round(v.comparado * 100) / 100, 46.11);
  assert.equal(Math.round(v.diferenca * 100) / 100, -20.43);
  const t = table([convertida]);
  assert.deepEqual(t.head, ['Valor administrativo', 'Valor informado', 'Valor comparado', 'Diferença']);
  assert.deepEqual(t.body[0], ['Valor solicitado pelo proprietário', 'R$ 6.500,00/mês', 'R$ 46,11/m² (área 140,98 m²)', '-20,43%']);
});

test('sem área: laudo não mostra percentual', () => {
  const row = { ...convertida, status_comparacao: 'NAO_COMPARAVEL_FALTA_AREA', valor_comparado: null, area_conversao: null, unidade_comparacao: null,
    diferenca_percentual: null, motivo: 'Falta a área construída do imóvel avaliando para converter R$/mês em R$/m².' };
  const v = L.compatView(row);
  assert.equal(v.comparavel, false); assert.equal(v.diferenca, null);
  assert.deepEqual(table([row]).body[0], ['Valor solicitado pelo proprietário', 'R$ 6.500,00/mês', 'Não comparável — falta área para conversão', '—']);
});

test('comparação direta R$/mês não ganha conversão', () => {
  const row = { tipo_valor: 'REAJUSTADO', regra_versao: 1, status_comparacao: 'COMPARAVEL', valor_referencia: 4219.53, valor_administrativo_original: 3611.22,
    unidade_original: 'R$/mês', unidade_resultado: 'R$/mês', unidade_comparacao: 'R$/mês', valor_comparado: 3611.22, area_conversao: null, diferenca_percentual: 14.4166 };
  assert.equal(L.compatView(row).convertido, false);
  assert.deepEqual(table([row]).body[0], ['Valor reajustado', 'R$ 3.611,22/mês', 'R$ 3.611,22/mês', '14,42%']);
});

test('registro anterior à regra é exibido como foi gravado (sem reescrever histórico)', () => {
  const legado = { tipo_valor: 'REAJUSTADO', valor_referencia: 4219.53, valor_comparado: 3611.22, diferenca_percentual: 14.4166 };
  const v = L.compatView(legado);
  assert.equal(v.legado, true); assert.equal(v.comparavel, true); assert.equal(v.original, 3611.22);
  assert.deepEqual(table([legado]).body[0], ['Valor reajustado', 'R$ 3.611,22', 'R$ 3.611,22', '14,42%']);
});

test('sufixo de unidade', () => {
  assert.equal(L.unidadeSufixo('R$/m²'), '/m²'); assert.equal(L.unidadeSufixo('R$/mês'), '/mês'); assert.equal(L.unidadeSufixo('R$'), ''); assert.equal(L.unidadeSufixo(null), '');
});
