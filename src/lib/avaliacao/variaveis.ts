// Variáveis da pesquisa: catálogo de características, campos dinâmicos do avaliando/amostras e completude.
// Módulo puro (sem dependências) para ser testado isoladamente. A fonte da verdade dos valores é o cadastro:
// imóvel, característica do imóvel (imovel_atributos), dado de mercado ou — só para variáveis personalizadas — digitação manual.

export type Fonte = 'MERCADO' | 'IMOVEL' | 'ATRIBUTO' | 'MANUAL';
export type Papel = 'DEPENDENTE' | 'INDEPENDENTE' | 'DISPONIVEL';
export type Relacao = 'POSITIVA' | 'NEGATIVA' | 'INDEFINIDA';

export interface Atributo {
  id: string; codigo: string; nome: string; categoria?: string | null; data_type: string; unidade?: string | null;
  opcoes?: string[] | null; modelable?: boolean | null; ordem?: number | null;
}

export interface VarStatus {
  id: string; codigo: string; nome: string; papel: Papel; obrigatoria: boolean; relacao_esperada: Relacao;
  tipo_variavel: string; categorica: boolean | null; unidade: string | null; origem_tipo: string; fonte: Fonte;
  campo_origem: string | null; atributo_id: string | null; atributo_codigo: string | null; atributo_nome: string | null;
  data_type: string | null; opcoes: string[] | null; transformacoes_autorizadas: string[];
  precisa_avaliando: boolean; valor_avaliando: number | null; em_uso: boolean; no_conjunto: boolean;
  amostras_completas: number; amostras_total: number;
}
export interface AmostraStatus {
  amostra_id: string; dado_id: string; imovel_id: string; indice: number; selecionada: boolean; habilitada_modelo: boolean;
  valores: Record<string, number | null>; faltando: string[]; completa: boolean;
}
export interface VariaveisStatus {
  avaliando: { imovel_id: string | null; faltando: string[] };
  variaveis: VarStatus[];
  amostras: AmostraStatus[];
}

export interface CatalogItem {
  chave: string;
  grupo: 'MERCADO' | 'IMOVEL' | 'CARACTERISTICA';
  nome: string; codigo: string; tipo_variavel: string; unidade: string | null;
  origem_tipo: 'CAMPO_DADO_MERCADO' | 'ATRIBUTO_IMOBILIARIO' | 'MANUAL';
  campo_origem: string | null; atributo_id: string | null; categorica: boolean | null;
  fonte: Fonte; fonteLabel: string; papelSugerido: Papel; relacaoSugerida: Relacao;
}

const CAMPO_LABEL: Record<string, string> = {
  valor_utilizado: 'valor utilizado', valor_unitario: 'valor unitário', area_construida: 'área construída', area_terreno: 'área do terreno',
};
/** Características que já são campos físicos do imóvel: não entram de novo como característica dinâmica. */
const DUPLICAM_CAMPO = new Set(['AREA_CONSTRUIDA', 'AREA_TERRENO']);

/** Código interno a partir do nome: minúsculas sem acento, com sublinhado; começa por letra; até 40 caracteres. */
export function slugCodigo(nome: string): string {
  let s = String(nome ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!s) s = 'variavel';
  if (!/^[a-z]/.test(s)) s = `v_${s}`;
  return s.slice(0, 40).replace(/_+$/g, '');
}
export const codigoExibicao = (codigo: string) => String(codigo ?? '').toUpperCase();

const tipoDoAtributo = (dt: string) => (dt === 'CATEGORY' ? 'CODIGO_ALOCADO' : dt === 'BOOL' || dt === 'STATUS' ? 'DICOTOMICA' : 'QUANTITATIVA');
function relacaoSugerida(codigo: string): Relacao {
  if (/^AREA|BANHEIROS|VAGAS|QUARTOS|SUITES/.test(codigo)) return 'POSITIVA';
  if (/^DISTANCIA|IDADE/.test(codigo)) return 'NEGATIVA';
  return 'INDEFINIDA';
}

/** Catálogo exibido em "Adicionar variável": mercado, cadastro físico e características modeláveis. */
export function catalogo(atributos: Atributo[]): CatalogItem[] {
  const out: CatalogItem[] = [
    { chave: 'campo:valor_utilizado', grupo: 'MERCADO', nome: 'Valor mensal', codigo: 'valor_mensal', tipo_variavel: 'QUANTITATIVA', unidade: 'R$/mês',
      origem_tipo: 'CAMPO_DADO_MERCADO', campo_origem: 'valor_utilizado', atributo_id: null, categorica: null, fonte: 'MERCADO',
      fonteLabel: 'Dado de mercado · valor utilizado', papelSugerido: 'DEPENDENTE', relacaoSugerida: 'INDEFINIDA' },
    { chave: 'campo:valor_unitario', grupo: 'MERCADO', nome: 'Valor unitário', codigo: 'valor_unitario', tipo_variavel: 'QUANTITATIVA', unidade: 'R$/m²',
      origem_tipo: 'CAMPO_DADO_MERCADO', campo_origem: 'valor_unitario', atributo_id: null, categorica: null, fonte: 'MERCADO',
      fonteLabel: 'Dado de mercado · valor unitário', papelSugerido: 'DEPENDENTE', relacaoSugerida: 'INDEFINIDA' },
    { chave: 'campo:area_construida', grupo: 'IMOVEL', nome: 'Área construída', codigo: 'area_construida', tipo_variavel: 'QUANTITATIVA', unidade: 'm²',
      origem_tipo: 'CAMPO_DADO_MERCADO', campo_origem: 'area_construida', atributo_id: null, categorica: null, fonte: 'IMOVEL',
      fonteLabel: 'Cadastro do imóvel · área construída', papelSugerido: 'INDEPENDENTE', relacaoSugerida: 'POSITIVA' },
    { chave: 'campo:area_terreno', grupo: 'IMOVEL', nome: 'Área do terreno', codigo: 'area_terreno', tipo_variavel: 'QUANTITATIVA', unidade: 'm²',
      origem_tipo: 'CAMPO_DADO_MERCADO', campo_origem: 'area_terreno', atributo_id: null, categorica: null, fonte: 'IMOVEL',
      fonteLabel: 'Cadastro do imóvel · área do terreno', papelSugerido: 'INDEPENDENTE', relacaoSugerida: 'POSITIVA' },
  ];
  const attrs = [...atributos].filter((a) => a.modelable !== false && a.data_type !== 'TEXT' && !DUPLICAM_CAMPO.has(a.codigo))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
  for (const a of attrs) {
    const tipo = tipoDoAtributo(a.data_type);
    out.push({
      chave: `atributo:${a.codigo}`, grupo: 'CARACTERISTICA', nome: a.nome, codigo: slugCodigo(a.codigo), tipo_variavel: tipo,
      unidade: a.unidade ?? null, origem_tipo: 'ATRIBUTO_IMOBILIARIO', campo_origem: null, atributo_id: a.id,
      categorica: tipo === 'CODIGO_ALOCADO' ? true : null, fonte: 'ATRIBUTO', fonteLabel: `Característica do imóvel · ${a.nome}`,
      papelSugerido: 'INDEPENDENTE', relacaoSugerida: relacaoSugerida(a.codigo),
    });
  }
  return out;
}

/** Variável já existente que corresponde ao item do catálogo (reconhece variáveis antigas com a mesma origem). */
export function variavelDoItem(item: CatalogItem, vars: Pick<VarStatus, 'id' | 'codigo' | 'campo_origem' | 'atributo_id'>[]) {
  return vars.find((v) => (item.campo_origem && v.campo_origem === item.campo_origem)
    || (item.atributo_id && v.atributo_id === item.atributo_id && !v.campo_origem) || v.codigo === item.codigo) ?? null;
}

export function transformacoesPadrao(papel: Papel, tipo: string): string[] {
  if (tipo === 'DICOTOMICA') return ['DIRECT'];
  return papel === 'DEPENDENTE' ? ['DIRECT', 'LN'] : ['DIRECT', 'LN', 'INVERSE'];
}

export interface NovaVariavel {
  nome: string; codigo: string; tipo_variavel: string; unidade: string | null; origem_tipo: string; campo_origem: string | null;
  atributo_id: string | null; categorica: boolean | null; papel: Papel; relacao_esperada: Relacao; obrigatoria: boolean; transformacoes_autorizadas: string[];
}
/** Registro da variável a partir do item escolhido: o avaliador decide só papel, relação e obrigatoriedade. */
export function novaVariavelDoItem(item: CatalogItem, papel: Papel, relacao: Relacao, obrigatoria: boolean): NovaVariavel {
  return {
    nome: item.nome, codigo: item.codigo, tipo_variavel: item.tipo_variavel, unidade: item.unidade, origem_tipo: item.origem_tipo,
    campo_origem: item.campo_origem, atributo_id: item.atributo_id, categorica: item.categorica, papel,
    relacao_esperada: papel === 'INDEPENDENTE' ? relacao : 'INDEFINIDA', obrigatoria, transformacoes_autorizadas: transformacoesPadrao(papel, item.tipo_variavel),
  };
}

export function fonteLabel(v: Pick<VarStatus, 'fonte' | 'campo_origem' | 'atributo_nome'>): string {
  if (v.fonte === 'MERCADO') return `Dado de mercado · ${CAMPO_LABEL[v.campo_origem ?? ''] ?? v.campo_origem}`;
  if (v.fonte === 'IMOVEL') return `Cadastro do imóvel · ${CAMPO_LABEL[v.campo_origem ?? ''] ?? v.campo_origem}`;
  if (v.fonte === 'ATRIBUTO') return `Característica do imóvel · ${v.atributo_nome ?? ''}`.trim();
  return 'Digitação manual';
}

// ---------- Campos dinâmicos ----------
export type Alvo = 'AVALIANDO' | 'AMOSTRA';
export interface CampoDinamico { variavel: VarStatus; editavel: boolean; obrigatoria: boolean }
/** Avaliando: só o que precisa de valor nele (nunca a resposta de mercado). Amostra: todas as variáveis. */
export function camposDinamicos(st: Pick<VariaveisStatus, 'variaveis'> | null | undefined, alvo: Alvo): CampoDinamico[] {
  return (st?.variaveis ?? []).filter((v) => (alvo === 'AVALIANDO' ? v.precisa_avaliando : true))
    .map((v) => ({ variavel: v, editavel: v.fonte === 'ATRIBUTO' || v.fonte === 'MANUAL', obrigatoria: !!v.obrigatoria }));
}

/** Número digitado no padrão brasileiro: "1.234,56", "127,82", "127.82". Vazio = null; inválido = NaN. */
export function parseDecimalBR(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  let s = String(raw).replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Valor resolvido (numérico) → texto do formulário conforme o tipo da característica. */
export function valorParaFormulario(v: Pick<VarStatus, 'fonte' | 'data_type' | 'opcoes'>, valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  if (v.fonte === 'ATRIBUTO') {
    if (v.data_type === 'CATEGORY') return v.opcoes?.[Number(valor) - 1] ?? '';
    if (v.data_type === 'BOOL') return Number(valor) === 1 ? 'true' : 'false';
    if (v.data_type === 'STATUS') return Number(valor) === 1 ? 'POSSUI' : 'NAO_POSSUI';
  }
  return String(valor).replace('.', ',');
}

const OPCAO_LABEL: Record<string, string> = { true: 'Sim', false: 'Não', POSSUI: 'Possui', NAO_POSSUI: 'Não possui', NAO_VERIFICADO: 'Não verificado' };
export function exibirValor(v: Pick<VarStatus, 'fonte' | 'data_type' | 'opcoes' | 'unidade'>, valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  const f = valorParaFormulario(v, valor);
  if (v.fonte === 'ATRIBUTO' && v.data_type && v.data_type !== 'NUMERIC') return OPCAO_LABEL[f] ?? (f || '—');
  const n = Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return v.unidade ? `${n} ${v.unidade}` : n;
}
const exibirTexto = (v: VarStatus, s: string) => {
  if (!s) return '—';
  if (v.fonte === 'ATRIBUTO' && v.data_type && v.data_type !== 'NUMERIC') return OPCAO_LABEL[s] ?? s;
  const n = parseDecimalBR(s);
  return n === null || Number.isNaN(n) ? s : exibirValor(v, n);
};

export interface AlteracaoDinamica {
  entity_type: 'imovel_atributo' | 'variavel_valor'; entity_id: string; campo: string; valor: string | number | null;
  rotulo: string; de: string; para: string; contexto?: Record<string, unknown>;
}
export interface DestinoDinamico { imovel_id: string | null; dado_id?: string | null; amostra_id?: string | null; modo?: 'COMPARTILHADO' | 'CLONAR' }

/** Somente o que mudou; cada valor vai para a sua fonte (característica do imóvel ou valor manual da variável). */
export function alteracoesDinamicas(campos: CampoDinamico[], original: Record<string, number | null | undefined>,
  form: Record<string, string>, destino: DestinoDinamico): { alteracoes: AlteracaoDinamica[]; invalidos: string[] } {
  const alteracoes: AlteracaoDinamica[] = []; const invalidos: string[] = [];
  for (const { variavel: v, editavel } of campos) {
    if (!editavel || !(v.id in form)) continue;
    const antes = valorParaFormulario(v, original[v.id]);
    const raw = String(form[v.id] ?? '').trim();
    const numerico = v.fonte === 'MANUAL' || v.data_type === 'NUMERIC';
    let novo: string | number | null = raw || null;
    if (numerico && raw) {
      const n = parseDecimalBR(raw);
      if (n === null || Number.isNaN(n) || n < 0) { invalidos.push(v.nome); continue; }
      novo = n;
    }
    const anteriorNorm = numerico ? (antes ? parseDecimalBR(antes) : null) : (antes || null);
    if (anteriorNorm === novo) continue;
    const base = { rotulo: v.nome, de: exibirTexto(v, antes), para: exibirTexto(v, raw) };
    if (v.fonte === 'ATRIBUTO') {
      if (!destino.imovel_id || !v.atributo_codigo) continue;
      const contexto: Record<string, unknown> = {};
      if (destino.dado_id) contexto.dado_id = destino.dado_id;
      if (destino.modo) contexto.modo = destino.modo;
      alteracoes.push({ entity_type: 'imovel_atributo', entity_id: destino.imovel_id, campo: v.atributo_codigo,
        valor: novo === null ? null : String(novo), ...base, ...(Object.keys(contexto).length ? { contexto } : {}) });
    } else {
      alteracoes.push({ entity_type: 'variavel_valor', entity_id: v.id, campo: 'valor', valor: novo, ...base,
        ...(destino.amostra_id ? { contexto: { amostra_id: destino.amostra_id } } : {}) });
    }
  }
  return { alteracoes, invalidos };
}

/** Obrigatórias sem valor no formulário (a amostra pode ser salva incompleta, mas fica marcada). */
export function obrigatoriasVazias(campos: CampoDinamico[], form: Record<string, string>, referencias: Record<string, unknown> = {}): string[] {
  return campos.filter((c) => c.obrigatoria).filter((c) => {
    if (c.editavel) return !String(form[c.variavel.id] ?? '').trim();
    const r = referencias[c.variavel.id];
    return r === null || r === undefined || r === '';
  }).map((c) => c.variavel.nome);
}

// ---------- Completude e congelamento ----------
export const nomesFaltando = (st: Pick<VariaveisStatus, 'variaveis'>, ids: string[]) =>
  ids.map((id) => st.variaveis.find((v) => v.id === id)?.nome ?? 'variável').filter(Boolean);

export interface Bloqueio { amostra_id: string | null; indice: number; faltando: string[] }
/** Amostras selecionadas e habilitadas no modelo que não têm todas as variáveis obrigatórias. */
export function bloqueiosCongelamento(st: VariaveisStatus | null | undefined): Bloqueio[] {
  if (!st) return [];
  return st.amostras.filter((a) => a.selecionada && a.habilitada_modelo && !a.completa)
    .map((a) => ({ amostra_id: a.amostra_id, indice: a.indice, faltando: nomesFaltando(st, a.faltando) }));
}
const juntar = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
export function mensagemCongelamento(bloqueios: Pick<Bloqueio, 'indice' | 'faltando'>[]): string {
  if (!bloqueios.length) return '';
  const partes = bloqueios.slice(0, 5).map((b) => `Amostra ${b.indice} sem ${juntar(b.faltando)}`);
  const resto = bloqueios.length > 5 ? `; e mais ${bloqueios.length - 5} amostra(s)` : '';
  return `Não é possível congelar o conjunto: ${partes.join('; ')}${resto}.`;
}
/** Detalhe devolvido pelo servidor ao recusar o congelamento: [{"amostra": 12, "faltando": ["Área privativa"]}]. */
export function bloqueiosDoServidor(details: unknown): Bloqueio[] {
  try {
    const arr = typeof details === 'string' ? JSON.parse(details) : details;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && Number.isFinite(Number(x.amostra)) && Array.isArray(x.faltando))
      .map((x) => ({ amostra_id: null, indice: Number(x.amostra), faltando: x.faltando.map(String).slice(0, 20) }));
  } catch { return []; }
}
