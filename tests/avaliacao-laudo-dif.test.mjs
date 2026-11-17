// Laudo institucional DIF: composição única (capa, capítulos 1–13, anexos I–III) → DOCX e PDF com o mesmo conteúdo,
// estados dos tópicos, perguntas guiadas, conclusão estruturada e proteção dos dados numéricos contra a IA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as docx from 'docx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import JSZip from 'jszip';
import { difSnapshot } from './helpers/laudoDifFixture.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function load(rel) {
  const file = resolve(ROOT, rel);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = (n) => { if (!n.startsWith('.')) throw new Error('import ' + n); return load(resolve(dirname(file), n).slice(ROOT.length + 1)); };
  new Function('exports', 'require', code)(exports, req);
  return exports;
}
const SH = 'supabase/functions/_shared/avaliacao/';
const E = load(SH + 'engine.ts');
const DIF = load(SH + 'laudoDif.ts');
const R = load(SH + 'laudoDifRender.ts');
const S = load(SH + 'laudoSecoes.ts');
const C = load(SH + 'chartPng.ts');
const A = load(SH + 'aiText.ts');
const IM = load(SH + 'images.ts');
const fx = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/guaranta-do-norte-real.json'), 'utf8'));
const fit = E.fitRegression(fx.input);

async function montar() {
  const im = async (w, h) => C.chartPng({ xLabel: 'x', yLabel: 'y', series: [{ kind: 'scatter', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }], width: w, height: h });
  const imgs = { p: await im(800, 600), m: await im(1600, 900), f: await im(1600, 1000), c: await im(600, 900), b: await im(600, 900), d: await im(620, 877), a: await im(800, 600) };
  const midias = [
    { id: 'p', categoria: 'FOTO_PRINCIPAL', largura: 800, altura: 600 },
    { id: 'm', categoria: 'MAPA_LOCALIZACAO', largura: 1600, altura: 900, legenda: 'Localização do imóvel avaliando', fonte: 'Google Earth', ano: 2026 },
    { id: 'f', categoria: 'FACHADA', largura: 1600, altura: 1000, legenda: 'Fachada', fonte: 'Autor', ano: 2026 },
    { id: 'c', categoria: 'CORREDOR', largura: 600, altura: 900, legenda: 'Corredor' },
    { id: 'b', categoria: 'BANHEIRO', largura: 600, altura: 900, legenda: 'Banheiro' },
    { id: 'd', categoria: 'DOCUMENTO', largura: 620, altura: 877, legenda: 'Matrícula — página 1/1' },
    { id: 'a', categoria: 'AMOSTRA_MERCADO', largura: 800, altura: 600, amostra_id: 'am-1', legenda: 'Fachada da amostra 01' },
  ];
  const snap = difSnapshot({ fit, input: fx.input, midias });
  const model = await DIF.composeDif(snap, { midias: new Map(Object.entries(imgs)) }, { rascunho: false, hash: 'f'.repeat(64) });
  return { snap, model };
}
const textoDe = (b) => b.k === 'heading' ? b.texto : b.k === 'para' ? b.runs.map((r) => r.t).join('') : b.k === 'equation' ? b.texto : b.k === 'table' ? [b.legenda, ...(b.head ?? []).map((c) => c.text), ...b.rows.flat().map((c) => c.text ?? '')].join(' | ') : '';

test('numeração hierárquica: ocultar um tópico renumera os seguintes sem lacunas', () => {
  const secs = [{ codigo: 'R', titulo: 'Resumo', nivel: 0 }, { codigo: 'A', titulo: 'Solicitante', nivel: 1 }, { codigo: 'B', titulo: 'Caracterização', nivel: 1 },
    { codigo: 'B1', titulo: 'Vistoria', nivel: 2 }, { codigo: 'B2', titulo: 'Documentação', nivel: 2, visivel: false }, { codigo: 'B3', titulo: 'Pressupostos', nivel: 2 },
    { codigo: 'B31', titulo: 'Localização', nivel: 3 }, { codigo: 'C', titulo: 'Diagnóstico', nivel: 1 }];
  const n = S.numerar(secs);
  assert.equal(n.get('R'), undefined); assert.equal(n.get('A'), '1'); assert.equal(n.get('B1'), '2.1');
  assert.equal(n.get('B2'), undefined); assert.equal(n.get('B3'), '2.2'); assert.equal(n.get('B31'), '2.2.1'); assert.equal(n.get('C'), '3');
  assert.equal(S.tituloNumerado('5', 'Caracterização do Bem Avaliando', 1), '5. CARACTERIZAÇÃO DO BEM AVALIANDO');
  assert.equal(S.tituloNumerado('5.4.3', 'Caracterização do Imóvel', 3), '5.4.3 Caracterização do Imóvel');
});

test('estado do tópico: desatualizado, dados insuficientes (pergunta e fotos), texto gerado, aprovado', () => {
  const base = { codigo: 'CARACTERIZACAO_IMOVEL', titulo: 'x', classe: 'ASSISTIDO', conteudo: 'Texto', status: 'RASCUNHO', blocos_sistema: ['FIGURAS_IMOVEL'],
    perguntas: [{ id: 'padrao', pergunta: 'Padrão construtivo?', obrigatoria: true, dado: 'imovel.padrao' }, { id: 'piso', pergunta: 'Piso?', obrigatoria: false }] };
  assert.equal(S.estadoTopico({ ...base, stale: true, stale_motivo: 'Área do imóvel alterada' }, { fatos: {} }).detalhe, 'Área do imóvel alterada');
  const falta = S.estadoTopico(base, { fatos: {}, midias: {} });
  assert.equal(falta.estado, 'DADOS_INSUFICIENTES'); assert.match(falta.detalhe, /1 pergunta sem resposta/); assert.match(falta.detalhe, /faltam fotos/);
  assert.equal(S.estadoTopico(base, { fatos: { 'imovel.padrao': 'Normal' }, midias: { FACHADA: 1 } }).estado, 'REVISAO');
  assert.equal(S.estadoTopico({ ...base, respostas: { padrao: 'Alto' } }, { fatos: {}, midias: { FOTO_PRINCIPAL: 1 }, propostaPendente: true }).estado, 'TEXTO_GERADO');
  assert.equal(S.estadoTopico({ ...base, status: 'APROVADA' }, { fatos: {} }).estado, 'APROVADO');
  assert.equal(S.estadoTopico({ codigo: 'X', titulo: 'x', classe: 'ESTRUTURADO', conteudo: '', status: 'RASCUNHO' }, { fatos: {} }).estado, 'REVISAO');
  assert.equal(S.estadoTopico({ codigo: 'X', titulo: 'x', classe: 'ASSISTIDO', conteudo: '', status: 'RASCUNHO' }, { fatos: {} }).estado, 'NAO_INICIADO');
});

test('perguntas guiadas: o que o sistema já sabe não é perguntado de novo', () => {
  const ps = [{ id: 'a', pergunta: 'Pavimentação?', obrigatoria: true }, { id: 'b', pergunta: 'Área?', obrigatoria: true, dado: 'imovel.area_construida' }];
  assert.deepEqual(S.perguntasPendentes(ps, {}, { 'imovel.area_construida': '129,2' }).map((p) => p.id), ['a']);
  assert.deepEqual(S.perguntasPendentes(ps, { a: 'asfáltica' }, {}).map((p) => p.id), ['b']);
});

test('fatos do sistema: imóvel, ambientes, atributos, pesquisa e municípios comparáveis aprovados', () => {
  const f = S.montarFatos({
    avaliacao: { tipo: 'REAJUSTE' }, imovel: { tipo_imovel: 'Comercial', endereco: 'Rua A', numero: '10', area_construida: 129.2, padrao: 'Normal' },
    ambientes: [{ nome: 'Sala', quantidade: 3 }, { nome: 'Banheiro', area: 4.5 }], atributos: [{ nome: 'Piso', valor_text: 'cerâmico' }, { nome: 'Vagas', valor_numeric: 2 }],
    midias: [{ categoria: 'FACHADA' }, { categoria: 'SALA' }, { categoria: 'MAPA_LOCALIZACAO' }],
    amostras: [{ utilizada: true, dados: { imovel: { area_construida: 50, tipo_imovel: 'Sala', municipio_nome: 'Peixoto', uf: 'MT' } } }, { utilizada: false, dados: { imovel: { area_construida: 900 } } },
      { utilizada: true, dados: { imovel: { area_construida: 320, tipo_imovel: 'Loja', municipio_nome: 'Peixoto', uf: 'MT' } } }],
    totalUtilizado: 2, variaveis: ['Área', 'Banheiros'], comparaveis: [{ municipio_nome: 'Sinop', uf: 'MT', status: 'SUGERIDO' }],
  });
  assert.equal(f['avaliacao.tipo'], 'Reajuste contratual'); assert.equal(f['imovel.endereco'], 'Rua A, 10');
  assert.equal(f['imovel.ambientes'], '3 Sala; Banheiro (4,5 m²)'); assert.equal(f['imovel.atributos'], 'Piso: cerâmico; Vagas: 2');
  assert.equal(f['midias.total_fotos'], '2'); assert.equal(f['pesquisa.total_coletado'], '3'); assert.equal(f['pesquisa.total_utilizado'], '2');
  assert.equal(f['pesquisa.area_min'], '50'); assert.equal(f['pesquisa.area_max'], '320'); assert.equal(f['pesquisa.municipios'], 'Peixoto/MT');
  assert.equal(f['pesquisa.municipios_comparaveis'], undefined, 'sugestão não aprovada não conta');
  assert.match(f['pesquisa.justificativa_comparaveis'], /não se aplica/);
});

test('conclusão estruturada vem dos marcadores; sem valor contratual atual em nova locação', () => {
  const tk = { TIPO_AVALIACAO: 'Nova locação', VALOR_CONTRATO_ATUAL: 'R$ 1,00', VALOR_PROPOSTO: 'R$ 5.000,00', VALOR_MERCADO: 'R$ 4.800,00', CENTRO_ADOTADO: 'Moda',
    LIMITE_INFERIOR: 'R$ 4.000,00', LIMITE_SUPERIOR: 'R$ 5.600,00', GRAU_FUNDAMENTACAO: 'II', GRAU_PRECISAO: 'III', DIFERENCA_PERCENTUAL: '−4,17%' };
  const c = S.conclusaoEstruturada(tk, 'NOVA_LOCACAO');
  assert.ok(!c.some((l) => l.rotulo === 'Valor contratual atual'));
  assert.deepEqual(c.find((l) => l.rotulo === 'Valor proposto pelo locador'), { rotulo: 'Valor proposto pelo locador', valor: 'R$ 5.000,00' });
  assert.equal(c.find((l) => l.rotulo.startsWith('Valor de mercado')).valor, 'R$ 4.800,00 (Moda)');
  assert.equal(c.find((l) => l.rotulo === 'Intervalo de confiança').valor, 'R$ 4.000,00 a R$ 5.600,00');
  assert.ok(S.conclusaoEstruturada({ ...tk, TIPO_AVALIACAO: 'Reajuste' }, 'REAJUSTE').some((l) => l.rotulo === 'Valor contratual atual'));
});

test('IA do tópico: valor ou grau digitado é bloqueado; marcadores passam; perguntas são reconhecidas', () => {
  assert.equal(A.dadoProtegidoDigitado('O valor de mercado é R$ 3.300,00.'), 'MONEY');
  assert.equal(A.dadoProtegidoDigitado('Enquadra-se no grau II de fundamentação.'), 'GRADE');
  assert.equal(A.dadoProtegidoDigitado('O valor de mercado é {{VALOR_FINAL}}, grau {{GRAU_FUNDAMENTACAO}}.'), null);
  assert.deepEqual(JSON.parse(JSON.stringify(A.parseAssistente('{"tipo":"PERGUNTAS","perguntas":["Qual o tipo de piso?"]}'))), { tipo: 'PERGUNTAS', perguntas: ['Qual o tipo de piso?'] });
  assert.equal(A.parseAssistente('```json\n{"tipo":"TEXTO","texto":"Trata-se de imóvel."}\n```').texto, 'Trata-se de imóvel.');
  assert.equal(A.parseAssistente('{"tipo":"X"}'), null);
  const p = A.systemPromptSecao('GERAR');
  for (const s of ['Nunca invente', 'NÃO suponha', 'TEXTO_BASE_INSTITUCIONAL', 'Nunca escreva "R$"', 'CONCLUSAO_ESTRUTURADA']) assert.ok(p.includes(s), s);
});

test('equação do modelo com nomes e transformações (padrão do relatório)', () => {
  const eq = DIF.equacaoModelo({ nome: 'Valor unitário', transform: 'LN' }, [
    { code: '(intercepto)', beta: 2.789226611 }, { code: 'area', transform: 'INVERSE', beta: 56.05821528 },
    { code: 'banh', transform: 'LN', beta: 0.3015916863 }, { code: 'dist', transform: 'INVERSE', beta: 166.2663815 }], { area: 'Área', banh: 'Banheiros', dist: 'Distância' });
  assert.equal(eq, 'ln(Valor unitário) = 2,789226611 + 56,05821528 / Área + 0,3015916863 × ln(Banheiros) + 166,2663815 / Distância');
  assert.match(DIF.equacaoModelo({ nome: 'Y', transform: 'DIRECT' }, [{ code: '(intercepto)', beta: -1.5 }, { code: 'x', transform: 'DIRECT', beta: -2 }], {}), /^Y = −1,500000000 − 2,000000000 × x$/);
});

test('figuras: verticais em par lado a lado; mapa, planta e horizontais em largura ampla', () => {
  const g = DIF.layoutFiguras([
    { id: '1', categoria: 'MAPA_LOCALIZACAO', largura: 600, altura: 900 }, { id: '2', categoria: 'FACHADA', largura: 1600, altura: 1000 },
    { id: '3', categoria: 'CORREDOR', largura: 600, altura: 900 }, { id: '4', categoria: 'BANHEIRO', largura: 600, altura: 900 }, { id: '5', categoria: 'DML', largura: 600, altura: 900 }]);
  assert.deepEqual(g.map((x) => x.itens.map((i) => i.id)), [['1'], ['2'], ['3', '4'], ['5']]);
  assert.equal(g[0].larguras[0], 0.98); assert.equal(g[1].larguras[0], 0.85); assert.equal(g[3].larguras[0], 0.5);
});

test('composição DIF: capa com quadro-resumo, capítulos, figuras numeradas, anexos e software SiDIF', async () => {
  const { model } = await montar();
  const txt = model.blocks.map(textoDe).join('\n');
  assert.ok(txt.includes('LAUDO DE AVALIAÇÃO DE IMÓVEL Nº 006/2026.'));
  const quadro = model.blocks.find((b) => b.k === 'table' && b.rows.some((r) => r[0].text === 'SOLICITANTE'));
  const rotulos = quadro.rows.map((r) => r[0].text);
  assert.deepEqual(rotulos, ['SOLICITANTE', 'OBJETO', 'OBJETIVO', 'FINALIDADE', 'METODOLOGIA', 'ESPECIFICAÇÃO DO LAUDO', 'VALOR CONTRATUAL', 'DATAS', 'RESPONSÁVEL PELA ELABORAÇÃO']);
  assert.equal(quadro.rows[0][0].fill, 'E2EFD9');
  assert.ok(quadro.rows[1][2].img, 'foto principal na célula do OBJETO');
  assert.match(quadro.rows[6][1].text, /R\$ 3\.000,00 \(10\/01\/2025\)/);
  for (const h of ['1. SOLICITANTE', '3. CARACTERIZAÇÃO DO BEM AVALIANDO', '3.1 Vistoria', '3.2.1 Caracterização do Imóvel', '9. ENCERRAMENTO']) assert.ok(txt.includes(h), h);
  const figs = model.blocks.filter((b) => b.k === 'figure').flatMap((b) => b.items.map((i) => i.legenda)).filter((l) => l?.startsWith('Figura'));
  assert.deepEqual(figs, ['Figura 1: Localização do imóvel avaliando', 'Figura 2: Fachada', 'Figura 3: Corredor', 'Figura 4: Banheiro']);
  assert.ok(model.blocks.some((b) => b.k === 'figure' && b.items.length === 2), 'corredor e banheiro lado a lado');
  assert.ok(txt.includes('Fonte: Google Earth (2026)'));
  assert.ok(txt.includes('Conclui-se pelo valor de R$ 3.300,00.'), 'marcadores resolvidos');
  for (const a of ['ANEXO I', 'ANEXO II', 'ANEXO III']) assert.ok(txt.includes(a), a);
  assert.ok(txt.includes('SiDIF') && !/sisdea/i.test(txt));
  assert.ok(model.blocks.some((b) => b.k === 'signature' && b.nome === 'Fulano de Tal' && b.linhas.includes('Engenheiro Civil – CREA MT 000000')));
});

test('Anexo II: uma ficha por amostra, com fotos; amostra fora do modelo permanece com observação', async () => {
  const { model } = await montar();
  const txt = model.blocks.map(textoDe).join('\n');
  const fichas = model.blocks.filter((b) => b.k === 'para' && /^AMOSTRA \d{2}$/.test(textoDe(b)));
  assert.equal(fichas.length, 14);
  assert.ok(txt.includes('Amostra não utilizada no modelo adotado (valor discrepante).'));
  assert.ok(txt.includes('Dado coletado que não integrou o conjunto de dados do modelo adotado.'));
  const i01 = model.blocks.findIndex((b) => textoDe(b) === 'AMOSTRA 01');
  const i02 = model.blocks.findIndex((b) => textoDe(b) === 'AMOSTRA 02');
  assert.ok(model.blocks.slice(i01, i02).some((b) => b.k === 'figure' && b.items[0].legenda === 'Fachada da amostra 01'));
});

test('Anexo III: relatório estatístico completo do modelo aceito (coeficientes reais e gráficos)', async () => {
  const { model } = await montar();
  const txt = model.blocks.map(textoDe).join('\n');
  for (const s of ['1. Dados do modelo', '3. Estatísticas descritivas', '5. Normalidade dos resíduos', '6. Outliers', '7. Análise da variância', '8. Equação de regressão',
    '9. Coeficientes e significância dos regressores', '11. Resíduos e distância de Cook', '13. Gráficos', '14. Tabela de dados', '15. Estimativa do imóvel avaliando']) assert.ok(txt.includes(s), s);
  assert.ok(txt.includes('8,372996758'), 'intercepto do caso Guarantã');
  assert.ok(txt.includes('0,6821693'), 'R² do caso Guarantã');
  const graficos = model.blocks.filter((b) => b.k === 'figure' && /Gráfico/.test(b.items[0].legenda ?? ''));
  assert.equal(graficos.length, 4, 'aderência, resíduos e elasticidade por variável');
  assert.deepEqual([...graficos[0].items[0].img.data.slice(0, 4)], [137, 80, 78, 71]);
});

test('DOCX e PDF a partir da mesma composição: cabeçalho DIF, página 0 sem número, mesmo conteúdo', async () => {
  const { model } = await montar();
  const buf = await docx.Packer.toBuffer(R.renderDifDocx(model, docx));
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const files = Object.keys(zip.files);
  const headers = await Promise.all(files.filter((f) => /word\/header\d*\.xml/.test(f)).map((f) => zip.file(f).async('string')));
  assert.ok(headers.every((h) => h.includes('DIRETORIA DE INFRAESTRUTURA FÍSICA') && h.includes('<w:drawing>')));
  assert.ok(xml.includes('w:titlePg') && /w:pgNumType w:start="0"/.test(xml));
  assert.ok(xml.includes('E2EFD9') && xml.includes('D9D9D9'));
  assert.ok(files.filter((f) => f.startsWith('word/media/')).length >= 8);
  const pdf = R.renderDifPdf(model, { jsPDF, autoTable });
  const pdfTxt = pdf.output();
  for (const s of ['LAUDO DE AVALIA', 'RESUMO', 'ANEXO III', 'Tabela 1', 'Figura 4: Banheiro', 'Fulano de Tal']) {
    assert.ok(pdfTxt.includes(s), `PDF: ${s}`);
    assert.ok(xml.includes(s.replace('LAUDO DE AVALIA', 'LAUDO DE AVALIAÇÃO')), `DOCX: ${s}`);
  }
  assert.ok(pdf.getNumberOfPages() > 20);
  assert.ok(pdfTxt.includes('integridade') && !pdfTxt.includes('RASCUNHO'));
});

test('gráfico PNG válido e decodificável pelo leitor de imagens do laudo', async () => {
  const g = await C.chartPng({ title: 'Teste — ç ã é ²', xLabel: 'Área (m²)', yLabel: 'R$/m²', series: [{ kind: 'line', points: [{ x: 0, y: 0 }, { x: 10, y: 5 }] }], width: 640, height: 400 });
  assert.deepEqual(JSON.parse(JSON.stringify(IM.imageInfo(g.data))), { tipo: 'png', largura: 640, altura: 400 });
});
