// Regras puras dos tópicos do laudo (tela, assistente no servidor e documento): numeração hierárquica, perguntas
// guiadas pendentes, estado de cada tópico no checklist e conclusão estruturada. Não decide conteúdo técnico.

export interface Pergunta { id: string; pergunta: string; obrigatoria?: boolean; dado?: string }
export interface SecaoBase {
  codigo: string; titulo: string; nivel?: number | null; numerada?: boolean; visivel?: boolean | null;
}

/** Numeração 1, 5.4.1… só dos tópicos visíveis — ocultar um item renumera os seguintes sem lacunas. */
export function numerar<T extends SecaoBase>(secoes: T[]): Map<string, string> {
  const out = new Map<string, string>(); const c = [0, 0, 0];
  for (const s of secoes) {
    const nivel = Math.max(0, Math.min(3, Number(s.nivel ?? 1)));
    if (s.visivel === false || nivel === 0 || s.numerada === false) continue;
    c[nivel - 1] += 1; for (let i = nivel; i < 3; i++) c[i] = 0;
    out.set(s.codigo, c.slice(0, nivel).join('.'));
  }
  return out;
}

export const tituloNumerado = (numero: string | undefined, titulo: string, nivel: number) =>
  !numero ? titulo : nivel === 1 ? `${numero}. ${titulo.toLocaleUpperCase('pt-BR')}` : `${numero} ${titulo}`;

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Perguntas obrigatórias sem resposta e sem dado já registrado no sistema. */
export function perguntasPendentes(perguntas: Pergunta[] | null | undefined, respostas: Record<string, unknown> | null | undefined, fatos: Record<string, unknown>): Pergunta[] {
  return (perguntas ?? []).filter((p) => p.obrigatoria && vazio(respostas?.[p.id]) && (!p.dado || vazio(fatos[p.dado])));
}

/** Perguntas já respondidas pelo próprio sistema (mostradas como "já no sistema", sem perguntar de novo). */
export function perguntasAtendidasPeloSistema(perguntas: Pergunta[] | null | undefined, fatos: Record<string, unknown>): Pergunta[] {
  return (perguntas ?? []).filter((p) => p.dado && !vazio(fatos[p.dado]));
}

export type EstadoTopico = 'NAO_INICIADO' | 'DADOS_INSUFICIENTES' | 'TEXTO_GERADO' | 'REVISAO' | 'APROVADO' | 'DESATUALIZADO';
export const ESTADO_LABEL: Record<EstadoTopico, string> = {
  NAO_INICIADO: 'Não iniciado', DADOS_INSUFICIENTES: 'Dados insuficientes', TEXTO_GERADO: 'Texto gerado',
  REVISAO: 'Revisão necessária', APROVADO: 'Aprovado', DESATUALIZADO: 'Desatualizado após mudança',
};

export interface SecaoEstadoInput extends SecaoBase {
  classe?: string | null; conteudo?: string | null; status?: string | null; stale?: boolean | null; stale_motivo?: string | null;
  perguntas?: Pergunta[] | null; respostas?: Record<string, unknown> | null; blocos_sistema?: string[] | null;
}
export interface EstadoContexto { fatos: Record<string, unknown>; propostaPendente?: boolean; midias?: Record<string, number> }

/** Mídias exigidas por bloco de figuras (para o aviso "faltam fotos"). */
const FIGURAS_EXIGIDAS: Record<string, { categorias: string[]; aviso: string }> = {
  FIGURAS_IMOVEL: { categorias: ['FACHADA', 'FOTO_PRINCIPAL'], aviso: 'faltam fotos do imóvel' },
  FIGURAS_MAPA: { categorias: ['MAPA_LOCALIZACAO'], aviso: 'falta o mapa de localização' },
};

export function estadoTopico(s: SecaoEstadoInput, ctx: EstadoContexto): { estado: EstadoTopico; detalhe: string | null; automatico: boolean } {
  const automatico = s.classe === 'FIXO' || s.classe === 'ESTRUTURADO';
  if (s.stale) return { estado: 'DESATUALIZADO', detalhe: s.stale_motivo ?? 'dados usados por este tópico mudaram', automatico };
  if (s.status === 'APROVADA') return { estado: 'APROVADO', detalhe: automatico ? 'automático' : null, automatico };
  const faltas: string[] = [];
  const pend = perguntasPendentes(s.perguntas, s.respostas, ctx.fatos);
  if (pend.length) faltas.push(pend.length === 1 ? '1 pergunta sem resposta' : `${pend.length} perguntas sem resposta`);
  for (const b of s.blocos_sistema ?? []) {
    const req = FIGURAS_EXIGIDAS[b];
    if (req && ctx.midias && !req.categorias.some((c) => (ctx.midias![c] ?? 0) > 0)) faltas.push(req.aviso);
  }
  if (ctx.propostaPendente) return { estado: 'TEXTO_GERADO', detalhe: 'proposta do assistente aguardando revisão', automatico };
  const semTexto = !String(s.conteudo ?? '').trim();
  if (faltas.length) return { estado: 'DADOS_INSUFICIENTES', detalhe: faltas.join('; '), automatico };
  if (semTexto && s.classe !== 'ESTRUTURADO') return { estado: 'NAO_INICIADO', detalhe: null, automatico };
  return { estado: 'REVISAO', detalhe: automatico ? 'automático — conferir e aprovar' : null, automatico };
}

/** Conclusão estruturada (antes de qualquer redação): só marcadores e campos já calculados/confirmados. */
export function conclusaoEstruturada(tokens: Record<string, string | null | undefined>, tipo: string | null | undefined): { rotulo: string; valor: string }[] {
  const t = (k: string) => (tokens[k] ?? null);
  const rotuloProposto = tipo === 'NOVA_LOCACAO' ? 'Valor proposto pelo locador' : tipo === 'RENOVACAO' ? 'Valor proposto para renovação' : 'Valor contratual reajustado';
  const linhas: [string, string | null][] = [
    ['Finalidade', t('TIPO_AVALIACAO')],
    ['Valor contratual atual', tipo === 'NOVA_LOCACAO' ? null : t('VALOR_CONTRATO_ATUAL')],
    [rotuloProposto, t('VALOR_PROPOSTO')],
    ['Valor de mercado (tendência central adotada)', t('VALOR_MERCADO') && t('CENTRO_ADOTADO') ? `${t('VALOR_MERCADO')} (${t('CENTRO_ADOTADO')})` : t('VALOR_MERCADO')],
    ['Intervalo de confiança', t('LIMITE_INFERIOR') && t('LIMITE_SUPERIOR') ? `${t('LIMITE_INFERIOR')} a ${t('LIMITE_SUPERIOR')}` : null],
    ['Campo de arbítrio', t('CAMPO_INFERIOR') && t('CAMPO_SUPERIOR') ? `${t('CAMPO_INFERIOR')} a ${t('CAMPO_SUPERIOR')}` : null],
    ['Valor final adotado', t('VALOR_FINAL') ? `${t('VALOR_FINAL')}${t('ORIGEM_VALOR') ? ` (${t('ORIGEM_VALOR')})` : ''}` : null],
    ['Valor administrativo comparado', t('VALOR_ADMINISTRATIVO_REFERENCIA')],
    ['Diferença absoluta', t('DIFERENCA_ABSOLUTA')],
    ['Diferença percentual', t('DIFERENCA_PERCENTUAL')],
    ['Posição do valor administrativo', t('POSICAO_COMPATIBILIDADE')],
    ['Situação', t('CONCLUSAO')],
    ['Grau de fundamentação', t('GRAU_FUNDAMENTACAO')],
    ['Grau de precisão', t('GRAU_PRECISAO')],
  ];
  return linhas.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '').map(([rotulo, valor]) => ({ rotulo, valor: String(valor) }));
}

/** Fatos que cada tópico assistido mostra ao usuário e entrega ao assistente (chaves de `fatosLaudo`). */
export const FATOS_POR_TOPICO: Record<string, string[]> = {
  OBJETO: ['imovel.tipo_imovel', 'imovel.endereco', 'imovel.area_construida', 'avaliacao.numero_contrato'],
  OBJETIVO: ['avaliacao.tipo'], FINALIDADE: ['avaliacao.tipo', 'avaliacao.numero_contrato'],
  VISTORIA: ['capa.data_vistoria', 'midias.total_fotos'],
  DOCUMENTACAO: ['documentos.lista'],
  PRESSUPOSTOS: ['imovel.area_construida', 'documentos.lista'],
  LOCALIZACAO: ['imovel.endereco', 'imovel.bairro', 'imovel.municipio'],
  MELHORAMENTOS: ['imovel.endereco', 'imovel.municipio'],
  CARACTERIZACAO_IMOVEL: ['imovel.tipo_imovel', 'imovel.area_construida', 'imovel.area_terreno', 'imovel.padrao', 'imovel.ambientes', 'imovel.atributos', 'imovel.descricao', 'midias.ambientes'],
  DIAGNOSTICO_MERCADO: ['pesquisa.municipios', 'pesquisa.total_coletado', 'pesquisa.total_utilizado', 'pesquisa.tipologias', 'pesquisa.area_min', 'pesquisa.area_max', 'pesquisa.variaveis', 'pesquisa.municipios_comparaveis', 'pesquisa.justificativa_comparaveis'],
  SELECAO_DADOS: ['pesquisa.total_coletado', 'pesquisa.total_utilizado', 'pesquisa.nao_utilizadas', 'pesquisa.variaveis'],
  COMPATIBILIDADE: [], CONCLUSAO: [],
};

export const FATO_LABEL: Record<string, string> = {
  'imovel.tipo_imovel': 'Tipo do imóvel', 'imovel.endereco': 'Endereço', 'imovel.bairro': 'Bairro', 'imovel.municipio': 'Município',
  'imovel.area_construida': 'Área construída (m²)', 'imovel.area_terreno': 'Área do terreno (m²)', 'imovel.padrao': 'Padrão construtivo',
  'imovel.ambientes': 'Ambientes', 'imovel.atributos': 'Atributos cadastrados', 'imovel.descricao': 'Descrição cadastrada',
  'avaliacao.tipo': 'Finalidade', 'avaliacao.numero_contrato': 'Contrato', 'capa.data_vistoria': 'Data da vistoria',
  'midias.total_fotos': 'Fotos do imóvel', 'midias.ambientes': 'Ambientes fotografados', 'documentos.lista': 'Documentos registrados',
  'pesquisa.municipios': 'Municípios da pesquisa', 'pesquisa.total_coletado': 'Dados coletados', 'pesquisa.total_utilizado': 'Dados utilizados no modelo',
  'pesquisa.nao_utilizadas': 'Dados não utilizados', 'pesquisa.tipologias': 'Tipologias', 'pesquisa.area_min': 'Menor área (m²)', 'pesquisa.area_max': 'Maior área (m²)',
  'pesquisa.variaveis': 'Variáveis analisadas', 'pesquisa.municipios_comparaveis': 'Municípios comparáveis', 'pesquisa.justificativa_comparaveis': 'Justificativa dos comparáveis',
};

// ---------------------------------------------------------------- fatos do laudo (sistema → tela e assistente)
const n2 = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null
  : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
const TIPO_AV: Record<string, string> = { REAJUSTE: 'Reajuste contratual', NOVA_LOCACAO: 'Nova locação', RENOVACAO: 'Renovação/prorrogação contratual' };

export interface FatosBrutos {
  avaliacao?: { tipo?: string | null; numero_contrato?: string | null } | null;
  // deno-lint-ignore no-explicit-any
  imovel?: Record<string, any> | null;
  ambientes?: { nome?: string | null; tipo?: string | null; quantidade?: number | null; area?: number | null }[];
  atributos?: { nome: string; unidade?: string | null; valor_numeric?: number | null; valor_text?: string | null; valor_bool?: boolean | null; valor_category?: string | null }[];
  midias?: { categoria: string }[];
  documentos?: string[];
  capa?: Record<string, string | null | undefined> | null;
  // deno-lint-ignore no-explicit-any
  amostras?: { utilizada: boolean; dados: any }[];
  totalUtilizado?: number | null;
  variaveis?: string[];
  comparaveis?: { municipio_nome: string; uf?: string | null; status?: string | null; justificativa?: string | null }[];
}

/** Fatos objetivos já registrados no sistema, em texto, com as chaves usadas pelas perguntas dos tópicos. */
export function montarFatos(b: FatosBrutos): Record<string, string> {
  const f: Record<string, string | null> = {};
  const im = b.imovel ?? {};
  f['avaliacao.tipo'] = b.avaliacao?.tipo ? TIPO_AV[b.avaliacao.tipo] ?? b.avaliacao.tipo : null;
  f['avaliacao.numero_contrato'] = b.avaliacao?.numero_contrato ?? null;
  f['imovel.tipo_imovel'] = im.tipo_imovel ?? null;
  f['imovel.endereco'] = [im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || null;
  f['imovel.bairro'] = im.bairro ?? null;
  f['imovel.municipio'] = im.municipio_nome ? `${im.municipio_nome}${im.uf ? `/${im.uf}` : ''}` : null;
  f['imovel.area_construida'] = n2(im.area_construida);
  f['imovel.area_terreno'] = n2(im.area_terreno);
  f['imovel.padrao'] = im.padrao ?? null;
  f['imovel.descricao'] = im.descricao ?? null;
  f['imovel.ambientes'] = (b.ambientes ?? []).map((a) => [a.quantidade && a.quantidade > 1 ? `${a.quantidade} ` : '', a.nome ?? a.tipo ?? 'ambiente', a.area ? ` (${n2(a.area)} m²)` : ''].join('')).join('; ') || null;
  f['imovel.atributos'] = (b.atributos ?? []).map((a) => {
    const v = a.valor_numeric != null ? `${n2(a.valor_numeric)}${a.unidade ? ` ${a.unidade}` : ''}` : a.valor_bool != null ? (a.valor_bool ? 'sim' : 'não') : a.valor_category ?? a.valor_text;
    return v ? `${a.nome}: ${v}` : null;
  }).filter(Boolean).join('; ') || null;
  const cats = (b.midias ?? []).map((m) => m.categoria);
  const fotos = cats.filter((c) => !['MAPA_LOCALIZACAO', 'DOCUMENTO', 'AMOSTRA_MERCADO', 'PLANTA'].includes(c));
  f['midias.total_fotos'] = fotos.length ? String(fotos.length) : null;
  f['midias.ambientes'] = [...new Set(fotos.filter((c) => !['FOTO_PRINCIPAL', 'FACHADA', 'OUTRA'].includes(c)))].map((c) => c.toLowerCase()).join(', ') || null;
  f['documentos.lista'] = (b.documentos ?? []).filter(Boolean).join('; ') || null;
  f['capa.data_vistoria'] = b.capa?.data_vistoria ? String(b.capa.data_vistoria).split('-').reverse().join('/') : null;
  const am = b.amostras ?? [];
  const usadas = am.filter((a) => a.utilizada);
  const base = usadas.length ? usadas : am;
  // deno-lint-ignore no-explicit-any
  const areas = base.map((a) => Number(a.dados?.imovel?.area_construida)).filter((x: any) => Number.isFinite(x) && x > 0);
  f['pesquisa.total_coletado'] = am.length ? String(am.length) : null;
  f['pesquisa.total_utilizado'] = b.totalUtilizado != null ? String(b.totalUtilizado) : usadas.length ? String(usadas.length) : null;
  f['pesquisa.nao_utilizadas'] = am.length ? String(am.length - (b.totalUtilizado ?? usadas.length)) : null;
  f['pesquisa.tipologias'] = [...new Set(base.map((a) => a.dados?.imovel?.tipo_imovel).filter(Boolean))].join(', ') || null;
  f['pesquisa.municipios'] = [...new Set(base.map((a) => a.dados?.imovel?.municipio_nome ? `${a.dados.imovel.municipio_nome}${a.dados.imovel.uf ? `/${a.dados.imovel.uf}` : ''}` : null).filter(Boolean))].join(', ') || null;
  f['pesquisa.area_min'] = areas.length ? n2(Math.min(...areas)) : null;
  f['pesquisa.area_max'] = areas.length ? n2(Math.max(...areas)) : null;
  f['pesquisa.variaveis'] = (b.variaveis ?? []).join(', ') || null;
  const comp = (b.comparaveis ?? []).filter((c) => c.status !== 'REJEITADO' && c.status !== 'RECUSADO');
  f['pesquisa.municipios_comparaveis'] = comp.map((c) => `${c.municipio_nome}${c.uf ? `/${c.uf}` : ''}`).join(', ') || null;
  f['pesquisa.justificativa_comparaveis'] = comp.length ? comp.map((c) => c.justificativa).filter(Boolean).join(' ') || null : 'não se aplica (pesquisa sem dados de outros municípios)';
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && v !== '')) as Record<string, string>;
}

/** Contexto do assistente: classe da seção, mapeada aos tipos de conteúdo de IA já auditados. */
export function aiContextoDaSecao(codigo: string): 'PROPERTY_DESCRIPTION' | 'MARKET_DIAGNOSIS' | 'COMPATIBILITY' | 'CONCLUSION' | 'REPORT_SECTION' {
  if (['CARACTERIZACAO_IMOVEL', 'LOCALIZACAO', 'MELHORAMENTOS', 'VISTORIA'].includes(codigo)) return 'PROPERTY_DESCRIPTION';
  if (['DIAGNOSTICO_MERCADO', 'SELECAO_DADOS'].includes(codigo)) return 'MARKET_DIAGNOSIS';
  if (codigo === 'COMPATIBILIDADE') return 'COMPATIBILITY';
  if (codigo === 'CONCLUSAO') return 'CONCLUSION';
  return 'REPORT_SECTION';
}
