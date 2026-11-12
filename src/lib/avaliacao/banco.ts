// Banco reutilizável de imóveis e dados de mercado da organização: filtros, rótulos, foto da inclusão e divergências.
// Regras puras (sem acesso a dados) para a tela de Pesquisa de mercado.

export type TipoNegocio = 'LOCACAO' | 'VENDA';
export type SituacaoDado = 'ATIVO' | 'INATIVO' | 'DESATUALIZADO' | 'DESCARTADO';

export const TIPO_NEGOCIO_LABEL: Record<string, string> = { LOCACAO: 'Locação', VENDA: 'Venda' };
export const SITUACAO_LABEL: Record<string, string> = { ATIVO: 'Ativo', INATIVO: 'Inativo', DESATUALIZADO: 'Desatualizado', DESCARTADO: 'Descartado' };
export const ORIGEM_INCLUSAO_LABEL: Record<string, string> = {
  CADASTRO_NOVO: 'Cadastrado aqui', BANCO: 'Do banco de imóveis', IMPORTACAO: 'Importado de outra avaliação', LEGADO: 'Cadastro anterior',
};

export interface BancoFiltros {
  municipio_ibge: string; uf: string; tipo_negocio: string; tipo_imovel: string; bairro: string;
  area_min: string; area_max: string; data_de: string; data_ate: string; fonte: string; status: string; q: string;
  somente_recentes: boolean; excluir_da_avaliacao: boolean;
}

export interface BancoRow {
  dado_id: string; imovel_id: string; tipo_negocio: string; natureza_dado: string; status: string;
  valor_ofertado: number | null; valor_utilizado: number | null; valor_unitario: number | null; periodicidade: string;
  data_observacao: string | null; url_anuncio: string | null; descricao: string | null;
  tipo_imovel: string; endereco: string | null; numero: string | null; complemento: string | null; bairro: string | null;
  municipio_nome: string | null; municipio_ibge: string | null; uf: string | null; area_construida: number | null; area_terreno: number | null;
  padrao: string | null; fonte: { tipo: string; nome: string } | null; atributos: { nome: string; unidade: string | null; valor: string }[];
  mais_recente: boolean; dados_do_imovel: number; data_mais_recente: string | null;
  ja_na_avaliacao: boolean; imovel_na_avaliacao: boolean; avaliacoes_uso: number; amostra_origem_id: string | null;
  origem_selecionada?: boolean; origem_habilitada?: boolean; origem_valor_utilizado?: number | null; origem_area?: number | null;
  origem_data?: string | null; origem_snapshot_em?: string | null; divergente?: boolean;
}

/** Filtros iniciais: município da avaliação atual em primeiro lugar; aluguel por padrão (avaliações de locação). */
export function filtrosIniciais(av: { municipio_ibge: string | null; uf?: string | null }): BancoFiltros {
  return { municipio_ibge: av.municipio_ibge ?? '', uf: '', tipo_negocio: 'LOCACAO', tipo_imovel: '', bairro: '', area_min: '', area_max: '',
    data_de: '', data_ate: '', fonte: '', status: '', q: '', somente_recentes: true, excluir_da_avaliacao: false };
}

const toNum = (s: string) => { const t = s.trim(); if (!t) return null; const n = Number(t.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

/** Converte os filtros da tela para o formato do servidor, sem campos vazios; números em formato brasileiro são aceitos. */
export function filtrosParaServidor(f: BancoFiltros): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { somente_recentes: f.somente_recentes };
  if (f.excluir_da_avaliacao) out.excluir_da_avaliacao = true;
  for (const k of ['municipio_ibge', 'uf', 'tipo_negocio', 'tipo_imovel', 'bairro', 'data_de', 'data_ate', 'fonte', 'status', 'q'] as const) {
    const v = f[k].trim(); if (v) out[k] = v;
  }
  const amin = toNum(f.area_min); const amax = toNum(f.area_max);
  if (amin !== null) out.area_min = String(amin);
  if (amax !== null) out.area_max = String(amax);
  return out;
}

export function rotuloEndereco(x: { endereco?: string | null; numero?: string | null; complemento?: string | null; tipo_imovel?: string | null }): string {
  return [x.endereco, x.numero, x.complemento].filter((p) => p && String(p).trim()).join(', ') || x.tipo_imovel || 'Imóvel sem endereço';
}

/** "dd/mm/aaaa" a partir de "aaaa-mm-dd", sem conversão de fuso. */
export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

/** Aviso quando o dado escolhido não é o mais recente do imóvel. */
export function avisoDadoRecente(r: Pick<BancoRow, 'mais_recente' | 'dados_do_imovel' | 'data_mais_recente'>): string | null {
  if (r.mais_recente || r.dados_do_imovel <= 1) return null;
  return r.data_mais_recente ? `Há dado mais recente deste imóvel (${fmtData(r.data_mais_recente)}).` : 'Há outro dado de mercado mais recente deste imóvel.';
}

/** Registros que podem ser marcados em "Selecionar todos" (os que já estão na avaliação ficam de fora). */
export function selecionaveis(rows: Pick<BancoRow, 'dado_id' | 'ja_na_avaliacao'>[]): string[] {
  return rows.filter((r) => !r.ja_na_avaliacao).map((r) => r.dado_id);
}

/** Origem territorial sugerida: mesmo município → LOCAL; município diferente → município comparável. */
export function origemTerritorialPadrao(avIbge: string | null | undefined, imovelIbge: string | null | undefined): 'LOCAL' | 'MUNICIPIO_COMPARAVEL' {
  return !avIbge || !imovelIbge || avIbge === imovelIbge ? 'LOCAL' : 'MUNICIPIO_COMPARAVEL';
}

type Rec = Record<string, unknown> | null | undefined;
export interface Foto { dado?: Rec; imovel?: Rec; localizacao?: Rec }

const CAMPOS: { grupo: 'dado' | 'imovel' | 'localizacao'; campo: string; rotulo: string }[] = [
  { grupo: 'dado', campo: 'valor_utilizado', rotulo: 'valor utilizado' },
  { grupo: 'dado', campo: 'valor_ofertado', rotulo: 'valor ofertado' },
  { grupo: 'dado', campo: 'data_observacao', rotulo: 'data da pesquisa' },
  { grupo: 'dado', campo: 'natureza_dado', rotulo: 'natureza' },
  { grupo: 'dado', campo: 'tipo_negocio', rotulo: 'finalidade' },
  { grupo: 'imovel', campo: 'area_construida', rotulo: 'área construída' },
  { grupo: 'imovel', campo: 'area_terreno', rotulo: 'área do terreno' },
  { grupo: 'imovel', campo: 'tipo_imovel', rotulo: 'tipo' },
  { grupo: 'imovel', campo: 'endereco', rotulo: 'endereço' },
  { grupo: 'imovel', campo: 'numero', rotulo: 'número' },
  { grupo: 'imovel', campo: 'complemento', rotulo: 'complemento' },
  { grupo: 'imovel', campo: 'bairro', rotulo: 'bairro' },
  { grupo: 'localizacao', campo: 'latitude', rotulo: 'localização' },
  { grupo: 'localizacao', campo: 'longitude', rotulo: 'localização' },
];
const norm = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) ? n : String(v);
};

/** Campos técnicos que mudaram no cadastro desde a foto (sem repetir rótulos). */
export function camposAlterados(foto: Foto | null | undefined, atual: Foto | null | undefined): string[] {
  if (!foto || !atual || !foto.dado) return [];
  const out: string[] = [];
  for (const c of CAMPOS) {
    const a = norm((foto[c.grupo] ?? {})[c.campo as never]);
    const b = norm((atual[c.grupo] ?? {})[c.campo as never]);
    if (a !== b && !out.includes(c.rotulo)) out.push(c.rotulo);
  }
  return out;
}

/**
 * O que a tabela de amostras mostra. Avaliação concluída: a foto usada no laudo (conjunto congelado; na falta, a foto da inclusão).
 * Avaliação ativa: o cadastro atual, com o aviso dos campos alterados desde a inclusão.
 */
export function exibicaoAmostra(
  amostra: { snapshot_inclusao?: Foto | null; dados_mercado?: (Rec & { imoveis?: Rec }) | null },
  fotoConjunto: Foto | null | undefined,
  concluida: boolean,
): { fonte: 'CADASTRO' | 'FOTO_CONJUNTO' | 'FOTO_INCLUSAO'; dado: Rec; imovel: Rec; alterados: string[]; comparadoCom: 'CONJUNTO' | 'INCLUSAO' | null } {
  const atual: Foto = { dado: amostra.dados_mercado ?? null, imovel: amostra.dados_mercado?.imoveis ?? null };
  if (concluida) {
    const f = fotoConjunto?.dado ? fotoConjunto : amostra.snapshot_inclusao?.dado ? amostra.snapshot_inclusao : null;
    if (f) return { fonte: f === fotoConjunto ? 'FOTO_CONJUNTO' : 'FOTO_INCLUSAO', dado: f.dado ?? null, imovel: f.imovel ?? null, alterados: [], comparadoCom: null };
  }
  const base = fotoConjunto?.dado ? fotoConjunto : amostra.snapshot_inclusao?.dado ? amostra.snapshot_inclusao : null;
  return { fonte: 'CADASTRO', dado: atual.dado, imovel: atual.imovel, alterados: camposAlterados(base, atual),
    comparadoCom: base ? (base === fotoConjunto ? 'CONJUNTO' : 'INCLUSAO') : null };
}
