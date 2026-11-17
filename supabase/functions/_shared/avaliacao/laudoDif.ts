// Composição do laudo no modelo institucional da DIF (TEMPLATE_DIF_AVALIACAO_V1) a partir do snapshot único do laudo
// (aval_laudo_snapshot_build). Produz um documento intermediário (blocos) que vira DOCX e PDF pelos mesmos renderizadores,
// garantindo a mesma estrutura e conteúdo. Tudo o que é número vem do snapshot (motor, validação, resultado confirmado).
import { CENTRO_LABEL, TRANSFORM_LABEL, VALOR_ADM_LABEL, compatView, unidadeSufixo } from './docLabels.ts';
import { relationshipCurves, chartLabels, type RelacionamentoInput } from './relacionamento.ts';
import { chartPng, type ChartImage } from './chartPng.ts';
import { b64ToBytes, type Deflate } from './png.ts';
import { LOGO_DPE_MT } from './logoDpeMt.ts';
import { conclusaoEstruturada, numerar, tituloNumerado } from './laudoSecoes.ts';

export const LAYOUT_DIF = 'DIF_V1';
export const MIDIA_CATEGORIAS: Record<string, string> = {
  FOTO_PRINCIPAL: 'Foto principal (quadro-resumo)', FACHADA: 'Fachada', RECEPCAO: 'Recepção', CORREDOR: 'Corredor', SALA: 'Sala', TI: 'Sala de TI',
  BANHEIRO: 'Banheiro', DML: 'DML', PLANTA: 'Planta baixa', MAPA_LOCALIZACAO: 'Mapa de localização', AMOSTRA_MERCADO: 'Imóvel de amostra',
  DOCUMENTO: 'Documento do imóvel', OUTRA: 'Outra imagem do imóvel',
};
/** Categorias inseridas por bloco de figuras do corpo do laudo. */
export const FIGURAS_POR_BLOCO: Record<string, string[]> = {
  FIGURAS_MAPA: ['MAPA_LOCALIZACAO'],
  FIGURAS_IMOVEL: ['FACHADA', 'PLANTA', 'RECEPCAO', 'CORREDOR', 'SALA', 'TI', 'BANHEIRO', 'DML', 'OUTRA'],
};
const LARGAS = new Set(['MAPA_LOCALIZACAO', 'PLANTA']);

// ---------------------------------------------------------------- documento intermediário
export interface Img { data: Uint8Array; tipo: 'png' | 'jpg'; largura: number; altura: number }
export interface Run { t: string; b?: boolean; i?: boolean }
export interface Cell { text?: string; runs?: Run[]; bold?: boolean; fill?: string; align?: 'left' | 'center' | 'right' | 'justify'; colSpan?: number; img?: Img; imgW?: number }
export interface FigItem { img: Img; w: number; legenda?: string | null; fonte?: string | null }
export type Block =
  | { k: 'heading'; nivel: number; texto: string }
  | { k: 'para'; runs: Run[]; align?: 'justify' | 'center' | 'left' | 'right'; size?: number; before?: number; after?: number; indent?: boolean }
  | { k: 'table'; legenda?: string; fonte?: string; widths: number[]; head?: Cell[]; rows: Cell[][]; size?: number }
  | { k: 'figure'; items: FigItem[] }
  | { k: 'equation'; texto: string }
  | { k: 'pagebreak' }
  | { k: 'spacer'; mm: number }
  | { k: 'signature'; localData: string; nome: string; linhas: string[] };
export interface DocModel {
  titulo: string; codigo: string; rascunho: boolean; hash?: string | null;
  header: { logo: Img | null; linhas: string[] }; blocks: Block[];
}

// ---------------------------------------------------------------- formatação
export const fmt = (v: unknown, c = 2) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '—'
  : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));
const money = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `R$ ${fmt(v)}`);
const pct = (v: unknown, c = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${fmt(Number(v) * 100, c)}%`);
const dataBR = (iso: unknown) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : null; };
/** Coeficiente com 10 algarismos significativos (padrão dos relatórios estatísticos). */
export function fmtCoef(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const s = Math.abs(v).toPrecision(10);
  const n = Number(s); const dec = s.includes('e') ? 6 : (s.split('.')[1] ?? '').length;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: false });
}

const TRANSFORM_EXPR: Record<string, (n: string, k?: number) => string> = {
  DIRECT: (n) => n, INVERSE: (n) => `1/${n}`, LN: (n) => `ln(${n})`, SQUARE: (n) => `${n}²`, SQRT: (n) => `√${n}`,
  INV_SQUARE: (n) => `1/${n}²`, INV_SQRT: (n) => `1/√${n}`, POWER: (n, k) => `${n}^${k ?? 'k'}`,
};
const TERM_EXPR: Record<string, (b: string, n: string, k?: number) => string> = {
  DIRECT: (b, n) => `${b} × ${n}`, INVERSE: (b, n) => `${b} / ${n}`, LN: (b, n) => `${b} × ln(${n})`, SQUARE: (b, n) => `${b} × ${n}²`,
  SQRT: (b, n) => `${b} × √${n}`, INV_SQUARE: (b, n) => `${b} / ${n}²`, INV_SQRT: (b, n) => `${b} / √${n}`, POWER: (b, n, k) => `${b} × ${n}^${k ?? 'k'}`,
};
export interface CoefLike { code: string; transform?: string | null; power?: number; beta: number; stdError?: number; t?: number; pValue?: number }
/** Equação do modelo aceito na forma "f(Y) = b0 + b1 × g(X1) …", com os nomes das variáveis. */
export function equacaoModelo(dep: { nome: string; transform: string; power?: number | null }, coefs: CoefLike[], nomes: Record<string, string>): string {
  const icpt = coefs.find((c) => c.code === '(intercepto)') ?? coefs[0];
  if (!icpt) return '';
  const lhs = (TRANSFORM_EXPR[dep.transform] ?? TRANSFORM_EXPR.DIRECT)(dep.nome, dep.power ?? undefined);
  const parts = [`${icpt.beta < 0 ? '−' : ''}${fmtCoef(icpt.beta)}`];
  for (const c of coefs) {
    if (c === icpt) continue;
    const f = TERM_EXPR[c.transform ?? 'DIRECT'] ?? TERM_EXPR.DIRECT;
    parts.push(`${c.beta < 0 ? '−' : '+'} ${f(fmtCoef(c.beta), nomes[c.code] ?? c.code, c.power)}`);
  }
  return `${lhs} = ${parts.join(' ')}`;
}

/** Disposição das figuras: verticais consecutivas lado a lado; horizontais, mapa e planta em largura ampla. */
export interface MidiaSnap { id: string; categoria: string; largura: number; altura: number; legenda?: string | null; fonte?: string | null; ano?: number | null; ordem?: number; amostra_id?: string | null; documento_grupo?: string | null; pagina?: number | null }
export function layoutFiguras<T extends MidiaSnap>(midias: T[]): { itens: T[]; larguras: number[] }[] {
  const out: { itens: T[]; larguras: number[] }[] = [];
  const vertical = (m: T) => m.altura > m.largura * 1.05;
  for (let i = 0; i < midias.length; i++) {
    const m = midias[i]; const n = midias[i + 1];
    if (!LARGAS.has(m.categoria) && vertical(m) && n && !LARGAS.has(n.categoria) && vertical(n)) { out.push({ itens: [m, n], larguras: [0.44, 0.44] }); i++; continue; }
    out.push({ itens: [m], larguras: [LARGAS.has(m.categoria) ? 0.98 : vertical(m) ? 0.5 : 0.85] });
  }
  return out;
}
const fonteTexto = (m: MidiaSnap) => (m.fonte ? `${m.fonte}${m.ano ? ` (${m.ano})` : ''}` : m.ano ? String(m.ano) : null);

// ---------------------------------------------------------------- amostras (Anexo II e tabelas)
export interface AmostraFicha {
  numero: number; id: string; utilizada: boolean; noConjunto: boolean; observacao: string | null;
  tipo: string | null; endereco: string; bairro: string | null; municipio: string | null; area: number | null; valor: number | null;
  unitario: number | null; periodicidade: string | null; natureza: string | null; fontes: string[]; variaveis: Record<string, number | null>;
}
// deno-lint-ignore no-explicit-any
export function fichasAmostras(snap: any): AmostraFicha[] {
  // deno-lint-ignore no-explicit-any
  const porId = new Map<string, any>((snap.amostras ?? []).map((a: any) => [a.amostra_id, a.dados ?? {}]));
  const excl = new Set<string>(snap.modelo?.amostras_excluidas ?? []);
  // deno-lint-ignore no-explicit-any
  const meta: any[] = (snap.amostras_meta ?? []).length ? snap.amostras_meta : [...porId.keys()].map((id) => ({ amostra_id: id, no_conjunto: true }));
  const vistos = new Set<string>();
  const out: AmostraFicha[] = [];
  for (const m of meta) {
    const dados = porId.get(m.amostra_id) ?? m.snapshot_inclusao ?? null;
    if (!dados || vistos.has(m.amostra_id)) continue;
    vistos.add(m.amostra_id);
    const noConjunto = porId.has(m.amostra_id);
    const utilizada = noConjunto && dados.habilitada_modelo !== false && !excl.has(m.amostra_id);
    const im = dados.imovel ?? {}; const d = dados.dado ?? {};
    const motivo = m.motivo_desabilitacao ?? dados.amostra?.motivo_desabilitacao ?? null;
    out.push({
      numero: out.length + 1, id: m.amostra_id, utilizada, noConjunto,
      observacao: utilizada ? null : noConjunto ? `Amostra não utilizada no modelo adotado${motivo ? ` (${motivo})` : ''}.`
        : 'Dado coletado que não integrou o conjunto de dados do modelo adotado.',
      tipo: im.tipo_imovel ?? null, endereco: [im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || 'Endereço não informado',
      bairro: im.bairro ?? null, municipio: im.municipio_nome ? `${im.municipio_nome}${im.uf ? `/${im.uf}` : ''}` : null,
      area: im.area_construida ?? null, valor: d.valor_utilizado ?? null, unitario: d.valor_unitario ?? null, periodicidade: d.periodicidade ?? null,
      natureza: d.natureza_dado ?? null,
      // deno-lint-ignore no-explicit-any
      fontes: (dados.fontes ?? []).map((f: any) => [f.nome, f.tipo && f.tipo !== 'OUTRO' ? f.tipo.toLowerCase() : null].filter(Boolean).join(' — ')).filter(Boolean),
      variaveis: dados.variaveis ?? {},
    });
  }
  return out;
}

// ---------------------------------------------------------------- composição
export interface ComposeAssets {
  /** Imagens já baixadas e conferidas, por id de mídia. */
  midias: Map<string, Img>;
  deflate?: Deflate;
}

const H = (texto: string, nivel = 1): Block => ({ k: 'heading', nivel, texto });
const P = (t: string, o: Partial<Extract<Block, { k: 'para' }>> = {}): Block => ({ k: 'para', runs: [{ t }], align: 'justify', ...o });
const PB = (pares: [string, string | null | undefined][]): Block[] => pares.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
  .map(([r, v]) => ({ k: 'para', runs: [{ t: `${r}: `, b: true }, { t: String(v) }], align: 'left', after: 2 }) as Block);

// deno-lint-ignore no-explicit-any
export async function composeDif(snap: any, assets: ComposeAssets, opts: { rascunho: boolean; hash?: string | null }): Promise<DocModel> {
  const t: Record<string, string | null> = snap.tokens ?? {};
  const tk = (k: string) => t[k] ?? '—';
  const ident = snap.template?.identidade ?? {};
  const capa = snap.capa ?? {};
  const av = snap.avaliacao ?? {};
  const fit = snap.execucao?.output?.fit ?? null;
  const input = snap.execucao?.input?.regression_input ?? null;
  // deno-lint-ignore no-explicit-any
  const mvars: any[] = snap.modelo_variaveis ?? [];
  const nomes: Record<string, string> = Object.fromEntries(mvars.map((v) => [v.codigo, v.nome]));
  if (snap.dependente?.codigo) nomes[snap.dependente.codigo] = snap.dependente.nome;
  const depNome = snap.dependente?.nome ?? 'Variável dependente';
  const depUnid = snap.dependente?.unidade ?? null;
  // deno-lint-ignore no-explicit-any
  const midias: (MidiaSnap & { id: string })[] = (snap.midias ?? []).filter((m: any) => assets.midias.has(m.id));
  const img = (id: string) => assets.midias.get(id)!;
  const fichas = fichasAmostras(snap);
  const numAmostra = new Map(fichas.map((f) => [f.id, f.numero]));
  let nFig = 0, nTab = 0;
  const blocks: Block[] = [];
  const tabela = (titulo: string, widths: number[], head: string[], rows: (string | Cell)[][], o: { fonte?: string; size?: number } = {}): Block => {
    nTab += 1;
    return { k: 'table', legenda: `Tabela ${nTab} – ${titulo}`, fonte: o.fonte ?? 'Elaborado pelo autor (SiDIF).', widths, size: o.size,
      head: head.map((h) => ({ text: h, bold: true, fill: 'D9D9D9', align: 'center' })),
      rows: rows.map((r) => r.map((c) => (typeof c === 'string' ? { text: c } : c))) };
  };
  const figuras = (lista: MidiaSnap[]) => {
    for (const g of layoutFiguras(lista)) {
      blocks.push({ k: 'figure', items: g.itens.map((m, i) => { nFig += 1; return { img: img(m.id), w: g.larguras[i], legenda: `Figura ${nFig}: ${m.legenda ?? MIDIA_CATEGORIAS[m.categoria] ?? 'Imagem'}`, fonte: fonteTexto(m) ? `Fonte: ${fonteTexto(m)}` : null }; }) });
    }
  };

  // ---------------- capa / página 0
  const foto = midias.find((m) => m.categoria === 'FOTO_PRINCIPAL') ?? midias.find((m) => m.categoria === 'FACHADA') ?? null;
  const imv = snap.imovel_avaliando ?? {};
  const enderecoLinha = capa.endereco_titulo
    ?? [[imv.endereco, imv.numero].filter(Boolean).join(', '), imv.bairro, imv.municipio_nome ? `${imv.municipio_nome}${imv.uf ? ` – ${imv.uf}` : ''}` : null].filter(Boolean).join(' – ');
  const secTxt = (codigo: string) => (snap.secoes ?? []).find((s: { codigo: string }) => s.codigo === codigo)?.texto ?? '';
  // deno-lint-ignore no-explicit-any
  const vadm: any[] = snap.valores_administrativos ?? [];
  const L = (rotulo: string): Cell => ({ text: rotulo, bold: true, fill: 'E2EFD9', align: 'left' });
  const quadro: Cell[][] = [
    [L('SOLICITANTE'), { text: capa.solicitante ?? tk('SOLICITANTE'), colSpan: 2 }],
    foto ? [L('OBJETO'), { text: capa.objeto ?? secTxt('OBJETO') }, { img: img(foto.id), imgW: 0.28, align: 'center' }]
      : [L('OBJETO'), { text: capa.objeto ?? secTxt('OBJETO'), colSpan: 2 }],
    [L('OBJETIVO'), { text: capa.objetivo ?? secTxt('OBJETIVO'), colSpan: 2 }],
    [L('FINALIDADE'), { text: capa.finalidade ?? secTxt('FINALIDADE'), colSpan: 2 }],
    [L('METODOLOGIA'), { text: capa.metodologia ?? 'Método Comparativo Direto de Dados de Mercado, com tratamento dos dados por inferência estatística (regressão linear múltipla).', colSpan: 2 }],
    [L('ESPECIFICAÇÃO DO LAUDO'), { text: `Grau de fundamentação: ${tk('GRAU_FUNDAMENTACAO')}\nGrau de precisão: ${tk('GRAU_PRECISAO')}`, colSpan: 2 }],
  ];
  if (vadm.length) quadro.push([L('VALOR CONTRATUAL'), { text: vadm.map((v) => `${VALOR_ADM_LABEL[v.tipo] ?? v.tipo}: ${money(v.valor)}${dataBR(v.data_referencia) ? ` (${dataBR(v.data_referencia)})` : ''}`).join('\n'), colSpan: 2 }]);
  const datas = [capa.data_vistoria ? `Vistoria: ${dataBR(capa.data_vistoria)}` : null, capa.data_referencia ? `Referência: ${dataBR(capa.data_referencia)}` : null,
    `Emissão: ${opts.rascunho ? 'rascunho (não emitido)' : tk('DATA_EMISSAO')}`].filter(Boolean).join('\n');
  quadro.push([L('DATAS'), { text: datas, colSpan: 2 }]);
  quadro.push([L('RESPONSÁVEL PELA ELABORAÇÃO'), { text: [capa.responsavel_nome, [capa.responsavel_titulo, capa.responsavel_crea ? `CREA ${capa.responsavel_crea}` : null].filter(Boolean).join(' – '), capa.responsavel_cargo].filter(Boolean).join('\n') || '—', colSpan: 2 }]);
  const numeroLaudo = av.codigo ?? String(snap.codigo ?? '').split(' — ')[0];
  blocks.push({ k: 'spacer', mm: 4 });
  blocks.push({ k: 'para', runs: [{ t: `LAUDO DE AVALIAÇÃO DE IMÓVEL Nº ${numeroLaudo}.`, b: true }], align: 'center', size: 14, after: 4 });
  if (Number(snap.revisao) > 0) blocks.push({ k: 'para', runs: [{ t: `Revisão ${String(snap.revisao).padStart(2, '0')}`, b: true }], align: 'center', size: 11, after: 2 });
  if (enderecoLinha) blocks.push({ k: 'para', runs: [{ t: enderecoLinha, b: true }], align: 'center', size: 11, after: 6 });
  blocks.push({ k: 'para', runs: [{ t: 'RESUMO', b: true }], align: 'center', size: 11, after: 2 });
  blocks.push({ k: 'table', widths: [0.27, 0.43, 0.30], rows: quadro, size: 9.5 });
  blocks.push({ k: 'pagebreak' });

  // ---------------- corpo
  // deno-lint-ignore no-explicit-any
  const secoes: any[] = (snap.secoes ?? []).filter((s: any) => s.visivel !== false).sort((a: any, b: any) => a.ordem - b.ordem);
  const numeros = numerar(secoes);
  const coefs: CoefLike[] = fit?.coefficients ?? [];
  // deno-lint-ignore no-explicit-any
  const centros: any[] = snap.resultado_snapshot?.centros ?? [];
  // deno-lint-ignore no-explicit-any
  const fund: any = snap.fundamentacao;
  const bloco = async (b: string) => {
    switch (b) {
      case 'QUADRO_RESUMO': return;
      case 'FIGURAS_MAPA': case 'FIGURAS_IMOVEL': figuras(midias.filter((m) => FIGURAS_POR_BLOCO[b].includes(m.categoria))); return;
      case 'TABELA_VARIAVEIS': {
        const rows: string[][] = [];
        if (snap.dependente) rows.push([depNome, 'Dependente', depUnid ?? '—', TRANSFORM_LABEL[snap.modelo?.dependente_transformacao ?? 'DIRECT']?.replace('x', 'y') ?? '—', '—']);
        for (const v of mvars) rows.push([v.nome, 'Independente', v.unidade ?? '—', TRANSFORM_LABEL[v.transformacao] ?? v.transformacao, v.relacao_esperada === 'POSITIVA' ? 'Positiva' : v.relacao_esperada === 'NEGATIVA' ? 'Negativa' : 'Indefinida']);
        if (rows.length) blocks.push(tabela('Variáveis do modelo', [0.32, 0.16, 0.14, 0.18, 0.2], ['Variável', 'Tipo', 'Unidade', 'Transformação', 'Relação esperada'], rows));
        return;
      }
      case 'TABELA_COMPOSICAO_AMOSTRAS':
        if (fichas.length) blocks.push(tabela('Composição da amostra', [0.06, 0.38, 0.12, 0.14, 0.12, 0.18], ['Nº', 'Endereço', 'Área (m²)', 'Valor (R$)', 'R$/m²', 'Situação'],
          fichas.map((f) => [String(f.numero).padStart(2, '0'), [f.endereco, f.bairro].filter(Boolean).join(' – '), fmt(f.area), fmt(f.valor), fmt(f.unitario), f.utilizada ? 'Utilizada' : 'Não utilizada']), { size: 8.5 }));
        return;
      case 'EQUACAO':
        if (coefs.length && snap.modelo) blocks.push({ k: 'equation', texto: equacaoModelo({ nome: depNome, transform: snap.modelo.dependente_transformacao, power: snap.modelo.dependente_power }, coefs, nomes) });
        return;
      case 'TABELA_ESTATISTICAS_MODELO':
        if (fit) blocks.push(tabela('Estatísticas do modelo', [0.6, 0.4], ['Parâmetro', 'Valor'], [
          ['Dados utilizados (n)', String(fit.n)], ['Variáveis independentes (k)', String(fit.k)], ['Coeficiente de correlação (r)', fmt(fit.rRegressao, 4)],
          ['Coeficiente de determinação (R²)', fmt(fit.r2, 4)], ['R² ajustado', fmt(fit.r2Adj, 4)], ['F calculado', fmt(fit.f, 2)],
          ['Significância do modelo (F)', pct(fit.fPValue)], ['Desvio-padrão do modelo', fmt(fit.s, 6)], ['Nível de confiança', tk('NIVEL_CONFIANCA')],
          ['Software', `SiDIF — motor estatístico ${snap.execucao?.engine_version ?? ''}`.trim()]]));
        return;
      case 'TABELA_SIGNIFICANCIA':
        if (coefs.length) blocks.push(tabela('Significância dos regressores (teste t)', [0.3, 0.16, 0.2, 0.16, 0.18], ['Variável', 'Transformação', 'Coeficiente', 't calculado', 'Significância'],
          coefs.map((c) => [c.code === '(intercepto)' ? 'Intercepto' : nomes[c.code] ?? c.code, c.code === '(intercepto)' ? '—' : TRANSFORM_LABEL[c.transform ?? 'DIRECT'] ?? '—',
            (c.beta < 0 ? '−' : '') + fmtCoef(c.beta), fmt(c.t, 2), pct(c.pValue)])));
        return;
      case 'TABELA_ANOVA':
        if (fit?.anova?.length) blocks.push(tabela('Análise da variância', [0.24, 0.2, 0.12, 0.18, 0.12, 0.14], ['Fonte de variação', 'Soma dos quadrados', 'G.L.', 'Quadrado médio', 'F', 'Significância'],
          // deno-lint-ignore no-explicit-any
          fit.anova.map((a: any) => [a.source === 'REGRESSAO' ? 'Explicada (regressão)' : a.source === 'RESIDUO' ? 'Não explicada (resíduos)' : 'Total', fmt(a.ss, 4), String(a.df), a.source === 'TOTAL' ? '—' : fmt(a.ms, 4), a.f == null ? '—' : fmt(a.f, 2), a.p == null ? '—' : pct(a.p)])));
        return;
      case 'TABELA_NORMALIDADE':
        if (fit?.normality?.length) {
          const esperado: Record<string, string> = { '1': '68%', '1.64': '90%', '1.96': '95%' };
          // deno-lint-ignore no-explicit-any
          blocks.push(tabela('Distribuição dos resíduos padronizados', [0.4, 0.3, 0.3], ['Intervalo', 'Normal (esperado)', 'Modelo (observado)'], fit.normality.map((n: any) => [`−${fmt(n.z, 2)} a +${fmt(n.z, 2)} desvio-padrão`, esperado[String(n.z)] ?? '—', pct(n.observed, 0)])));
        }
        return;
      case 'TABELA_CAMPO_ARBITRIO': {
        const arb = snap.arbitrio;
        blocks.push(tabela('Campo de arbítrio', [0.6, 0.4], ['Item', 'Valor'], [
          ['Estimativa de tendência central adotada', `${tk('VALOR_MERCADO')} (${tk('CENTRO_ADOTADO')})`], ['Limite inferior do campo de arbítrio', tk('CAMPO_INFERIOR')],
          ['Limite superior do campo de arbítrio', tk('CAMPO_SUPERIOR')], ['Valor arbitrado', arb?.aplicar ? tk('VALOR_FINAL') : 'Não houve arbitramento']]));
        return;
      }
      case 'TABELA_AVALIANDO_VARIAVEIS': {
        const av0 = snap.projecao?.avaliando ?? Object.fromEntries((snap.avaliando_variaveis ?? []).map((v: { codigo: string; valor: number }) => [v.codigo, v.valor]));
        const rows = mvars.map((v) => [v.nome, v.unidade ?? '—', fmt(av0?.[v.codigo], Number.isInteger(Number(av0?.[v.codigo])) ? 0 : 2)]);
        if (rows.length) blocks.push(tabela('Características do imóvel avaliando no modelo', [0.5, 0.2, 0.3], ['Variável', 'Unidade', 'Valor'], rows));
        return;
      }
      case 'TABELA_CALCULO_VALOR':
        if (centros.length) blocks.push(tabela(`Valores estimados${depUnid ? ` (${depUnid})` : ''}`, [0.22, 0.17, 0.17, 0.17, 0.13, 0.14], ['Tendência central', 'Mínimo', 'Valor', 'Máximo', 'Amplitude', 'Precisão'],
          centros.map((c) => [CENTRO_LABEL[c.centro] ?? c.centro, fmt(c.limite_inferior), fmt(c.valor), fmt(c.limite_superior), `${fmt(c.amplitude_pct)}%`, c.grau_precisao ?? 'Não enquadrado'])));
        return;
      case 'TABELA_FUNDAMENTACAO':
        if (fund?.itens?.length) blocks.push(tabela('Graus de fundamentação (regressão linear)', [0.08, 0.6, 0.16, 0.16], ['Item', 'Descrição', 'Grau', 'Pontos'], [
          // deno-lint-ignore no-explicit-any
          ...fund.itens.map((i: any) => [String(i.item_number), i.titulo, i.grade_achieved ?? '—', String(i.points ?? 0)]),
          [{ text: 'Total', bold: true, colSpan: 2 }, { text: `Grau ${fund.resumo?.grade_calculated ?? 'não enquadrado'}`, bold: true }, { text: String(fund.resumo?.total_points ?? '—'), bold: true }]]));
        return;
      case 'TABELA_PRECISAO':
        blocks.push(tabela('Grau de precisão', [0.6, 0.4], ['Item', 'Valor'], [['Amplitude do intervalo de confiança', tk('AMPLITUDE_IC')], ['Nível de confiança', tk('NIVEL_CONFIANCA')], ['Grau de precisão', tk('GRAU_PRECISAO')]]));
        return;
      case 'TABELA_COMPATIBILIDADE': {
        // deno-lint-ignore no-explicit-any
        const cps: any[] = snap.resultado_snapshot?.compatibilidades ?? [];
        if (cps.length) blocks.push(tabela('Análise de compatibilidade', [0.26, 0.22, 0.32, 0.2], ['Valor administrativo', 'Valor informado', 'Valor comparado', 'Diferença'], cps.map((c) => {
          const v = compatView(c);
          return [VALOR_ADM_LABEL[c.tipo_valor] ?? c.tipo_valor, `${money(v.original)}${unidadeSufixo(v.unidadeOriginal)}`,
            !v.comparavel ? (v.status ?? 'Não comparável') : `${money(v.comparado)}${unidadeSufixo(v.unidadeComparacao)}${v.convertido ? ` (área ${fmt(v.area)} m²)` : ''}`,
            v.diferenca == null ? '—' : `${fmt(v.diferenca)}%`];
        })));
        return;
      }
      case 'TABELA_CONCLUSAO': {
        const linhas = conclusaoEstruturada(t, av.tipo);
        if (linhas.length) blocks.push(tabela('Síntese da conclusão', [0.45, 0.55], ['Item', 'Valor'], linhas.map((l) => [l.rotulo, l.valor])));
        return;
      }
      case 'ASSINATURA': return;
      default: return;
    }
  };
  for (const s of secoes) {
    if (Number(s.nivel ?? 1) === 0) continue;
    blocks.push(H(tituloNumerado(numeros.get(s.codigo), s.titulo, Number(s.nivel ?? 1)), Number(s.nivel ?? 1)));
    for (const linha of String(s.texto ?? '').split(/\n+/).map((x) => x.trim()).filter(Boolean)) blocks.push(P(linha, /^[a-z]\)\s/.test(linha) ? { indent: true } : {}));
    for (const b of s.blocos_sistema ?? []) await bloco(b);
    if ((s.blocos_sistema ?? []).includes('ASSINATURA')) {
      blocks.push({ k: 'spacer', mm: 14 });
      blocks.push({ k: 'signature', localData: `${capa.local ?? `${tk('MUNICIPIO')} – ${tk('UF')}`}, ${opts.rascunho ? '____/____/________' : tk('DATA_EMISSAO')}.`,
        nome: capa.responsavel_nome ?? tk('RESPONSAVEL_TECNICO'),
        linhas: [capa.responsavel_cargo, [capa.responsavel_titulo, capa.responsavel_crea ? `CREA ${capa.responsavel_crea}` : null].filter(Boolean).join(' – ')].filter(Boolean) as string[] });
    }
  }

  // ---------------- anexos
  // deno-lint-ignore no-explicit-any
  const anexos: any[] = snap.anexos ?? [];
  const tituloAnexo = (a: { numero: string; titulo: string }) => {
    blocks.push({ k: 'pagebreak' }, { k: 'spacer', mm: 70 },
      { k: 'para', runs: [{ t: `ANEXO ${a.numero}`, b: true }], align: 'center', size: 16, after: 4 },
      { k: 'para', runs: [{ t: a.titulo.toLocaleUpperCase('pt-BR'), b: true }], align: 'center', size: 14 }, { k: 'pagebreak' });
  };
  for (const a of anexos) {
    if (a.tipo === 'DOCUMENTOS_IMOVEL') {
      tituloAnexo(a);
      const docs = midias.filter((m) => m.categoria === 'DOCUMENTO');
      if (!docs.length) blocks.push(P('Nenhum documento do imóvel foi anexado a este laudo.', { align: 'center' }));
      docs.forEach((m, i) => {
        if (i > 0) blocks.push({ k: 'pagebreak' });
        blocks.push({ k: 'figure', items: [{ img: img(m.id), w: 1, legenda: m.legenda ?? null, fonte: null }] });
      });
    } else if (a.tipo === 'PESQUISA_MERCADO') {
      tituloAnexo(a);
      if (fichas.length) blocks.push(tabela('Resumo dos imóveis de amostra', [0.07, 0.37, 0.12, 0.15, 0.12, 0.17], ['Nº', 'Endereço', 'Área (m²)', 'Valor (R$)', 'R$/m²', 'Situação'],
        fichas.map((f) => [String(f.numero).padStart(2, '0'), [f.endereco, f.bairro, f.municipio].filter(Boolean).join(' – '), fmt(f.area), fmt(f.valor), fmt(f.unitario), f.utilizada ? 'Utilizada' : 'Não utilizada']), { size: 8.5 }));
      for (const f of fichas) {
        blocks.push({ k: 'pagebreak' });
        blocks.push({ k: 'para', runs: [{ t: `AMOSTRA ${String(f.numero).padStart(2, '0')}`, b: true }], align: 'left', size: 12, after: 4 });
        blocks.push({ k: 'para', runs: [{ t: '1. Características do imóvel:', b: true }], align: 'left', after: 2 });
        const banh = Object.entries(f.variaveis).find(([k]) => /banheir/i.test(k))?.[1];
        blocks.push(...PB([['Tipo', f.tipo], ['Endereço', [f.endereco, f.bairro, f.municipio].filter(Boolean).join(' – ')], ['Área', f.area != null ? `${fmt(f.area)} m²` : null],
          ['Banheiros', banh != null ? fmt(banh, 0) : null],
          ['Valor', f.valor != null ? `${money(f.valor)}${f.periodicidade === 'MENSAL' ? ' mensais' : ''}${f.unitario != null ? ` (${money(f.unitario)}/m²)` : ''}` : null],
          ['Natureza do dado', f.natureza ? f.natureza.charAt(0) + f.natureza.slice(1).toLowerCase() : null], ['Fonte/contato', f.fontes.join('; ') || null]]));
        if (f.observacao) blocks.push({ k: 'para', runs: [{ t: 'Observação: ', b: true }, { t: f.observacao }], align: 'left', after: 2 });
        blocks.push({ k: 'para', runs: [{ t: '2. Imagens do Imóvel', b: true }], align: 'left', before: 4, after: 2 });
        const fotos = midias.filter((m) => m.categoria === 'AMOSTRA_MERCADO' && m.amostra_id === f.id);
        if (!fotos.length) blocks.push(P('Sem imagens cadastradas para esta amostra.', { align: 'left' }));
        for (const g of layoutFiguras(fotos)) blocks.push({ k: 'figure', items: g.itens.map((m, i) => ({ img: img(m.id), w: g.larguras[i], legenda: m.legenda ?? null, fonte: fonteTexto(m) ? `Fonte: ${fonteTexto(m)}` : null })) });
      }
    } else if (a.tipo === 'RELATORIO_ESTATISTICO') {
      tituloAnexo(a);
      await relatorioEstatistico(blocks, snap, { fit, input, coefs, nomes, depNome, depUnid, mvars, numAmostra, fichas, deflate: assets.deflate, tk });
    }
  }

  return {
    titulo: `Laudo de Avaliação de Imóvel nº ${numeroLaudo}`, codigo: snap.codigo ?? numeroLaudo, rascunho: opts.rascunho, hash: opts.hash ?? null,
    header: { logo: { data: b64ToBytes(LOGO_DPE_MT.base64), tipo: 'png', largura: LOGO_DPE_MT.largura, altura: LOGO_DPE_MT.altura },
      linhas: [ident.diretoria ?? 'DIRETORIA DE INFRAESTRUTURA FÍSICA'] },
    blocks,
  };
}

// ---------------------------------------------------------------- Anexo III — relatório estatístico completo do SiDIF
// deno-lint-ignore no-explicit-any
async function relatorioEstatistico(blocks: Block[], snap: any, c: any) {
  const { fit, input, coefs, nomes, depNome, depUnid, mvars, numAmostra, deflate, tk } = c;
  const sub = (s: string) => blocks.push({ k: 'para', runs: [{ t: s, b: true }], align: 'left', before: 6, after: 3 });
  const tab = (widths: number[], head: string[], rows: string[][], size = 8.5) => blocks.push({ k: 'table', widths, size,
    head: head.map((h) => ({ text: h, bold: true, fill: 'D9D9D9', align: 'center' })), rows: rows.map((r) => r.map((x) => ({ text: x }))) });
  if (!fit || !input) { blocks.push(P('Não há modelo aceito com execução registrada para compor o relatório estatístico.')); return; }
  const fig = (im: ChartImage, legenda: string) => blocks.push({ k: 'figure', items: [{ img: im, w: 0.9, legenda, fonte: 'Fonte: SiDIF.' }] });
  const nomeVar = (code: string) => (code === input.dependent.code ? depNome : nomes[code] ?? code);
  const sampleNum = (id: string, i: number) => String(numAmostra.get(id) ?? i + 1).padStart(2, '0');

  sub('1. Dados do modelo');
  tab([0.5, 0.5], ['Item', 'Valor'], [
    ['Avaliação', String(snap.avaliacao?.codigo ?? '—')], ['Modelo', String(snap.modelo?.nome ?? `Modelo ${snap.modelo?.numero ?? ''}`)],
    ['Software', `SiDIF — motor estatístico ${snap.execucao?.engine_version ?? ''}`.trim()],
    ['Código de integridade da execução', String(snap.execucao?.output_hash ?? '—').slice(0, 16)],
    ['Dados utilizados', String(fit.n)], ['Variáveis independentes', String(fit.k)], ['Nível de confiança', tk('NIVEL_CONFIANCA')]]);

  sub('2. Variáveis');
  tab([0.34, 0.16, 0.16, 0.16, 0.18], ['Variável', 'Papel', 'Unidade', 'Transformação', 'Relação esperada'], [
    [depNome, 'Dependente', depUnid ?? '—', (TRANSFORM_LABEL[input.dependent.transform] ?? 'x').replace('x', 'y'), '—'],
    // deno-lint-ignore no-explicit-any
    ...mvars.map((v: any) => [v.nome, 'Independente', v.unidade ?? '—', TRANSFORM_LABEL[v.transformacao] ?? v.transformacao, v.relacao_esperada ?? '—'])]);

  sub('3. Estatísticas descritivas');
  // deno-lint-ignore no-explicit-any
  tab([0.28, 0.12, 0.15, 0.15, 0.15, 0.15], ['Variável', 'n', 'Mínimo', 'Máximo', 'Média', 'Desvio-padrão'], (fit.variableStats ?? []).map((v: any) => [nomeVar(v.code), String(v.n), fmt(v.min), fmt(v.max), fmt(v.mean), fmt(v.stdDev)]));

  sub('4. Correlação, determinação e significância do modelo');
  tab([0.6, 0.4], ['Parâmetro', 'Valor'], [['Coeficiente de correlação (r)', fmt(fit.rRegressao, 7)], ['Coeficiente de determinação (R²)', fmt(fit.r2, 7)],
    ['R² ajustado', fmt(fit.r2Adj, 7)], ['F calculado', fmt(fit.f, 3)], ['Significância do modelo', pct(fit.fPValue)], ['Desvio-padrão (s)', fmt(fit.s, 6)]]);

  sub('5. Normalidade dos resíduos');
  const esp: Record<string, string> = { '1': '68%', '1.64': '90%', '1.96': '95%' };
  // deno-lint-ignore no-explicit-any
  tab([0.4, 0.3, 0.3], ['Intervalo', 'Normal', 'Modelo'], (fit.normality ?? []).map((n: any) => [`±${fmt(n.z, 2)} desvio-padrão`, esp[String(n.z)] ?? '—', pct(n.observed, 0)]));

  sub('6. Outliers');
  const outl = (fit.residualsStd ?? []).map((r: number, i: number) => ({ r, i })).filter((x: { r: number }) => Math.abs(x.r) > 2);
  blocks.push(P(outl.length ? `Dados com resíduo padronizado superior a 2 desvios-padrão (em módulo): ${outl.map((x: { i: number }) => `amostra ${sampleNum(fit.sampleIds[x.i], x.i)} (${fmt(x.r, 2)})`).join('; ')}.`
    : 'Nenhum dado apresentou resíduo padronizado superior a 2 desvios-padrão (em módulo).'));

  sub('7. Análise da variância');
  // deno-lint-ignore no-explicit-any
  tab([0.24, 0.2, 0.12, 0.18, 0.12, 0.14], ['Fonte', 'Soma dos quadrados', 'G.L.', 'Quadrado médio', 'F', 'Significância'], (fit.anova ?? []).map((a: any) => [
    a.source === 'REGRESSAO' ? 'Explicada' : a.source === 'RESIDUO' ? 'Não explicada' : 'Total', fmt(a.ss, 6), String(a.df), a.source === 'TOTAL' ? '—' : fmt(a.ms, 6), a.f == null ? '—' : fmt(a.f, 3), a.p == null ? '—' : pct(a.p)]));

  sub('8. Equação de regressão');
  blocks.push({ k: 'equation', texto: equacaoModelo({ nome: depNome, transform: input.dependent.transform, power: input.dependent.power }, coefs, nomes) });

  sub('9. Coeficientes e significância dos regressores');
  tab([0.28, 0.14, 0.18, 0.14, 0.12, 0.14], ['Variável', 'Transformação', 'Coeficiente', 'Erro padrão', 't calculado', 'Significância'],
    coefs.map((k: CoefLike) => [k.code === '(intercepto)' ? 'Intercepto' : nomeVar(k.code), k.code === '(intercepto)' ? '—' : TRANSFORM_LABEL[k.transform ?? 'DIRECT'] ?? '—',
      (k.beta < 0 ? '−' : '') + fmtCoef(k.beta), fmt(k.stdError, 6), fmt(k.t, 3), pct(k.pValue)]));

  if (fit.correlation?.codes?.length) {
    sub('10. Correlações entre as variáveis (escala transformada)');
    const codes: string[] = fit.correlation.codes;
    const w = 1 / (codes.length + 1);
    tab([w, ...codes.map(() => w)], ['', ...codes.map(nomeVar)], codes.map((a, i) => [nomeVar(a), ...codes.map((_, j) => fmt(fit.correlation.matrix[i][j], 4))]), 7.5);
  }

  sub('11. Resíduos e distância de Cook');
  tab([0.08, 0.16, 0.16, 0.14, 0.14, 0.16, 0.16], ['Amostra', 'Observado', 'Estimado', 'Resíduo', 'Resíduo relativo', 'Resíduo / DP', 'Cook'],
    (fit.sampleIds ?? []).map((id: string, i: number) => [sampleNum(id, i), fmt(fit.yOriginal?.[i]), fmt(fit.estimatedOriginal?.[i]), fmt(fit.residuals?.[i], 4),
      pct(fit.residualsRelative?.[i]), fmt(fit.residualsStd?.[i], 3), fmt(fit.cook?.[i], 4)]), 7.5);

  // deno-lint-ignore no-explicit-any
  const fundI: any[] = snap.fundamentacao?.itens ?? [];
  if (fundI.length) {
    sub('12. Fundamentação');
    tab([0.08, 0.6, 0.16, 0.16], ['Item', 'Descrição', 'Grau', 'Pontos'], fundI.map((i) => [String(i.item_number), i.titulo, i.grade_achieved ?? '—', String(i.points ?? 0)]));
  }

  sub('13. Gráficos');
  const obs: number[] = fit.yOriginal ?? []; const est: number[] = fit.estimatedOriginal ?? [];
  const unidY = depUnid ? ` (${depUnid})` : '';
  fig(await chartPng({ title: 'Aderência — valores observados × estimados', xLabel: `Valor estimado${unidY}`, yLabel: `Valor observado${unidY}`,
    series: [{ points: est.map((x, i) => ({ x, y: obs[i] })), kind: 'scatter' }], refLines: [{ kind: 'diagonal' }] }, deflate), 'Gráfico de aderência');
  fig(await chartPng({ title: 'Resíduos padronizados × valores estimados', xLabel: `Valor estimado${unidY}`, yLabel: 'Resíduo / desvio-padrão',
    series: [{ points: est.map((x, i) => ({ x, y: fit.residualsStd?.[i] })), kind: 'scatter' }],
    refLines: [{ kind: 'horizontal', value: 0, color: [120, 120, 120] }, { kind: 'horizontal', value: 2, dashed: true }, { kind: 'horizontal', value: -2, dashed: true }] }, deflate), 'Gráfico de resíduos');
  const relInput: RelacionamentoInput = {
    // deno-lint-ignore no-explicit-any
    coefficients: coefs.map((k: any) => ({ code: k.code, beta: Number(k.beta), transform: k.transform })),
    dependent: { transform: input.dependent.transform, power: input.dependent.power },
    // deno-lint-ignore no-explicit-any
    independents: input.independents.map((v: any) => ({ code: v.code, transform: v.transform, power: v.power, values: v.values })),
  };
  // deno-lint-ignore no-explicit-any
  const meta = Object.fromEntries(mvars.map((v: any) => [v.codigo, { relacao_esperada: v.relacao_esperada, tipo: v.tipo_variavel }]));
  const curvas = relationshipCurves(relInput, meta);
  const elast: string[][] = [];
  for (const cv of curvas) {
    // deno-lint-ignore no-explicit-any
    const v = mvars.find((m: any) => m.codigo === cv.code) ?? { nome: cv.code, unidade: null };
    const lb = chartLabels({ nome: v.nome, unidade: v.unidade }, { unidade: depUnid });
    elast.push([v.nome, fmt(cv.mean), cv.elasticity == null ? '—' : `${fmt(cv.elasticity * 100, 2)}%`]);
    fig(await chartPng({ title: `Elasticidade no ponto médio — ${v.nome}`, xLabel: lb.eixoX, yLabel: lb.eixoY,
      series: [{ points: cv.points, kind: cv.discrete ? 'scatter' : 'line' }], highlight: cv.meanPoint,
      xTicks: cv.discrete && cv.points.length <= 12 ? cv.points.map((p) => p.x) : undefined }, deflate), `Gráfico de elasticidade — ${v.nome}`);
  }
  if (elast.length) tab([0.5, 0.25, 0.25], ['Variável', 'Ponto médio', 'Elasticidade (+1%)'], elast);

  sub('14. Tabela de dados');
  const indep = input.independents as { code: string; values: number[] }[];
  const wN = 0.08; const wv = (1 - wN) / (indep.length + 1);
  tab([wN, ...indep.map(() => wv), wv], ['Amostra', ...indep.map((v) => nomeVar(v.code)), depNome],
    (input.sampleIds ?? []).map((id: string, i: number) => [sampleNum(id, i), ...indep.map((v) => fmt(v.values[i], Number.isInteger(v.values[i]) ? 0 : 2)), fmt(input.dependent.values[i])]), 7.5);

  sub('15. Estimativa do imóvel avaliando');
  const av0 = snap.projecao?.avaliando ?? {};
  tab([0.5, 0.5], ['Variável', 'Valor'], indep.map((v) => [nomeVar(v.code), fmt(av0[v.code], Number.isInteger(Number(av0[v.code])) ? 0 : 2)]));
  // deno-lint-ignore no-explicit-any
  const centros: any[] = snap.resultado_snapshot?.centros ?? [];
  if (centros.length) tab([0.22, 0.17, 0.17, 0.17, 0.13, 0.14], ['Tendência', 'Mínimo', 'Valor', 'Máximo', 'Amplitude', 'Precisão'],
    centros.map((x) => [CENTRO_LABEL[x.centro] ?? x.centro, fmt(x.limite_inferior), fmt(x.valor), fmt(x.limite_superior), `${fmt(x.amplitude_pct)}%`, x.grau_precisao ?? 'Não enquadrado']));
}
