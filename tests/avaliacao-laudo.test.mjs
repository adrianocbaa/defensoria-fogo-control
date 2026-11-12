// Rodada 2 — IA no laudo (marcadores protegidos), documentos PDF/DOCX e payloads de persistência.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as docx from 'docx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import JSZip from 'jszip';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, Math, Number, Array, Object, JSON, Error, Map, Set, Infinity, NaN, String, DataView, Uint8Array,
    require: n => { if (!(n in imports)) throw new Error('import ' + n); return imports[n]; } });
  return exports;
}
const A = load('supabase/functions/_shared/avaliacao/aiText.ts');
const L = load('supabase/functions/_shared/avaliacao/docLabels.ts');
const D = load('supabase/functions/_shared/avaliacao/laudoDoc.ts', { './docLabels.ts': L });
const I = load('supabase/functions/_shared/avaliacao/images.ts');
const TOK = ['VALOR_FINAL', 'GRAU_FUNDAMENTACAO', 'GRAU_PRECISAO', 'AREA_AVALIANDO'];

test('IA: proposta que remove marcador protegido é recusada', () => {
  const r = A.checkAiText('O valor adotado é R$ 10.000,00.', 'O valor adotado é {{VALOR_FINAL}}.', TOK, '{}');
  assert.equal(r.ok, false); assert.equal(r.erro, 'TOKEN_REMOVIDO'); assert.deepEqual(r.tokens, ['VALOR_FINAL']);
});
test('IA: proposta que inventa marcador é recusada', () => {
  const r = A.checkAiText('Valor {{VALOR_FINAL}} e {{VALOR_INVENTADO}}.', 'Valor {{VALOR_FINAL}}.', TOK, '{}');
  assert.equal(r.ok, false); assert.equal(r.erro, 'TOKEN_DESCONHECIDO');
});
test('IA: números fora do contexto e grau por extenso geram alerta, sem aprovar nada', () => {
  const r = A.checkAiText('O imóvel tem 250 m² e grau III de fundamentação. Área {{AREA_AVALIANDO}}.', '', TOK, JSON.stringify({ imovel: { area_construida: 120 } }));
  assert.equal(r.ok, true);
  assert.ok(r.alertas.some(a => a.includes('250')));
  assert.ok(r.alertas.some(a => a.includes('grau')));
  const ok = A.checkAiText('Imóvel com área de 120 m², {{AREA_AVALIANDO}}.', '', TOK, JSON.stringify({ imovel: { area_construida: 120 } }));
  assert.equal(ok.alertas.length, 0);
});
test('IA: instruções proíbem decidir, calcular e escrever graus por extenso', () => {
  const p = A.systemPrompt('GERAR');
  for (const s of ['Nunca invente', 'Não faça cálculos', '{{GRAU_FUNDAMENTACAO}}', 'Não decida']) assert.ok(p.includes(s), s);
  assert.ok(A.systemPrompt('MELHORAR').includes('mantendo todos os marcadores'));
  assert.deepEqual([...A.AI_CONTEXTS], ['PROPERTY_DESCRIPTION', 'MARKET_DIAGNOSIS', 'VALIDATION_EXPLANATION', 'COMPATIBILITY', 'CONCLUSION', 'REPORT_SECTION']);
});

const SNAP = {
  codigo: '001/2026 — Revisão 01', tokens: { GRAU_FUNDAMENTACAO: 'II', GRAU_PRECISAO: 'III', VALOR_FINAL: 'R$ 1.234,56', NUMERO_AVALIACAO: '001/2026 — Revisão 01' },
  secoes: [{ codigo: 'RESUMO', titulo: 'Resumo', numerada: true, texto: 'Valor final R$ 1.234,56.', blocos_sistema: ['TABELA_RESUMO'] },
    { codigo: 'VALIDACAO', titulo: 'Validação', numerada: true, texto: '', blocos_sistema: ['TABELA_VALIDACAO'] }],
  validacao_snapshot: { resultados: [{ numero: 1, nome: 'Número de dados', status: 'ATENDE', grau: 'III', detalhe: null }] },
  fundamentacao: { resumo: { total_points: 14, grade_calculated: 'II' }, itens: [{ item_number: 1, titulo: 'Caracterização do imóvel avaliando', grade_achieved: 'II', points: 2, status: 'ATENDE' }] },
  amostras: [], anexos: [{ numero: 'I', titulo: 'Fotografias' }],
};
// PNG 1x1
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

test('documentos oficiais: dados vêm só do snapshot e a fundamentação estruturada vira tabela', () => {
  const d = D.issuedLaudoData(SNAP, 'a'.repeat(64));
  assert.equal(d.rascunho, false); assert.equal(d.hashEmissao, 'a'.repeat(64));
  assert.deepEqual(d.fundamentacao, { itens: [{ item_number: 1, titulo: 'Caracterização do imóvel avaliando', grade_achieved: 'II', points: 2, status: 'ATENDE' }], total_points: 14, grau: 'II' });
  const tabs = D.systemTables(d, 'TABELA_VALIDACAO');
  assert.equal(tabs.length, 2); assert.match(tabs[1].title, /Grau de fundamentação: II · 14 pontos/);
  const resumo = D.systemTables(d, 'TABELA_RESUMO')[0].body;
  assert.deepEqual(resumo.find(r => r[0] === 'Grau de fundamentação'), ['Grau de fundamentação', 'II']);
});

test('DOCX editável: seções, tabelas, imagem, cabeçalho, rodapé com numeração e integridade', async () => {
  assert.deepEqual(I.imageInfo(PNG), { tipo: 'png', largura: 1, altura: 1 });
  const d = { ...D.issuedLaudoData(SNAP, 'b'.repeat(64)), figuras: [{ titulo: 'Fachada', data: PNG, tipo: 'png', largura: 1, altura: 1 }] };
  const buf = await docx.Packer.toBuffer(D.buildLaudoDocx(d, docx));
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(xml.includes('1. Resumo') && xml.includes('2. Validação'));
  assert.ok(xml.includes('Valor final R$ 1.234,56.'));
  assert.ok(xml.includes('Caracterização do imóvel avaliando') && xml.includes('<w:tbl>'));
  assert.ok(xml.includes('Figura 1 — Fachada') && Object.keys(zip.files).some(f => f.startsWith('word/media/')));
  const files = Object.keys(zip.files);
  const footer = await zip.file(files.find(f => /word\/footer\d*\.xml/.test(f))).async('string');
  assert.ok(footer.includes('PAGE') && footer.includes('NUMPAGES') && footer.includes('integridade bbbbbbbbbbbbbbbb'));
  assert.ok(files.some(f => /word\/header\d*\.xml/.test(f)));
  assert.ok(!xml.includes('RASCUNHO'));
});

test('PDF: rascunho marcado; oficial com rodapé de integridade', () => {
  const draft = D.buildLaudoPdf({ ...D.issuedLaudoData(SNAP), rascunho: true }, { jsPDF, autoTable }).output();
  assert.ok(draft.includes('RASCUNHO'));
  const off = D.buildLaudoPdf(D.issuedLaudoData(SNAP, 'c'.repeat(64)), { jsPDF, autoTable }).output();
  assert.ok(!off.includes('RASCUNHO') && off.includes('cccccccccccccccc'));
});
