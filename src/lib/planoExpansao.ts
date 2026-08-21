// Domínio do Plano de Expansão (metas estratégicas de infraestrutura)

export type CategoriaMeta = 'empreendimento' | 'econucleo';
export type JornadaTipo = 'nova_locacao' | 'licitacao' | 'built_to_suit' | 'econucleo';
export type SituacaoMeta =
  | 'pendente'
  | 'em_desenvolvimento'
  | 'em_andamento'
  | 'concluida'
  | 'suspensa';
export type NivelAtencao = 'normal' | 'atencao' | 'critico';
export type StatusPlano = 'mantido' | 'incluido' | 'retirado';

export interface PlanoRevisao {
  id: string;
  nome: string;
  ano_vigencia: string;
  vigente: boolean;
  observacao?: string | null;
}

export interface PlanoMeta {
  id: string;
  revisao_id: string | null;
  categoria: CategoriaMeta;
  municipio: string;
  nucleo_nome: string | null;
  tipo_intervencao: string;
  jornada: JornadaTipo;
  etapa_index: number;
  etapa_atual: string | null;
  progresso: number;
  previsao_conclusao: string | null;
  situacao: SituacaoMeta;
  nivel_atencao: NivelAtencao;
  motivo_atencao: string | null;
  estagio_econucleo: number | null;
  obra_id: string | null;
  sei_numero: string | null;
  observacoes: string | null;
  status_plano: StatusPlano;
  justificativa: string | null;
  documento_ref: string | null;
  data_inclusao: string | null;
  data_retirada: string | null;
  ativo: boolean;
  ordem: number;
  updated_at?: string;
}

export interface PlanoHistorico {
  id: string;
  meta_id: string;
  data: string;
  titulo: string;
  descricao: string | null;
}

/** Jornadas padronizadas por estratégia de contratação */
export const JORNADAS: Record<JornadaTipo, { label: string; etapas: string[] }> = {
  nova_locacao: {
    label: 'Nova Locação',
    etapas: ['Imóvel', 'Locação', 'Layout', 'Projetos', 'Contratação', 'Reforma', 'Entrega'],
  },
  licitacao: {
    label: 'Construção por Licitação',
    etapas: ['Terreno', 'Projetos', 'Orçamento', 'Licitação', 'Contrato', 'Obra', 'Entrega'],
  },
  built_to_suit: {
    label: 'Construção sob Medida (Built-to-Suit)',
    etapas: ['Modelagem', 'Estudos', 'Contratação', 'Projetos', 'Execução', 'Entrega'],
  },
  econucleo: {
    label: 'Econúcleo',
    etapas: ['Terreno', 'Projeto Básico', 'Projeto Executivo', 'Contratação', 'Construção', 'Entrega'],
  },
};

export const TIPOS_INTERVENCAO = [
  'Nova locação',
  'Construção por licitação',
  'Construção sob medida',
  'Reforma existente',
  'Nova sede convênio',
  'Econúcleo',
];

export const SITUACAO_LABEL: Record<SituacaoMeta, string> = {
  pendente: 'Pendente',
  em_desenvolvimento: 'Em desenvolvimento',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  suspensa: 'Suspensa',
};

export const SITUACAO_CLASS: Record<SituacaoMeta, string> = {
  pendente: 'bg-muted text-muted-foreground border-transparent',
  em_desenvolvimento: 'bg-sky-50 text-sky-700 border-sky-200',
  em_andamento: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  concluida: 'bg-emerald-600 text-white border-transparent',
  suspensa: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ATENCAO_LABEL: Record<NivelAtencao, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  critico: 'Crítico',
};

export const ATENCAO_CLASS: Record<NivelAtencao, string> = {
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  atencao: 'bg-amber-50 text-amber-700 border-amber-200',
  critico: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ESTAGIOS_ECONUCLEO = [
  {
    valor: 1,
    titulo: 'Dependência de Terreno',
    descricao: 'Projetos básicos prontos, sem terreno disponível',
  },
  {
    valor: 2,
    titulo: 'Em Desenvolvimento',
    descricao: 'Terreno disponível + projetos básicos concluídos',
  },
  {
    valor: 3,
    titulo: 'Fase Avançada',
    descricao: 'Projetos executivos concluídos',
  },
] as const;

export function etapasDaMeta(meta: Pick<PlanoMeta, 'jornada'>): string[] {
  return JORNADAS[meta.jornada]?.etapas ?? JORNADAS.nova_locacao.etapas;
}

/** Progresso derivado da etapa concluída, quando não informado manualmente */
export function progressoPorEtapa(jornada: JornadaTipo, etapaIndex: number): number {
  const total = JORNADAS[jornada]?.etapas.length ?? 1;
  if (total <= 1) return 0;
  return Math.round((etapaIndex / (total - 1)) * 100);
}

/** Parse seguro de datas YYYY-MM-DD (sem deslocamento de fuso) */
export function parseDateBR(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateBR(value?: string | null): string {
  const d = parseDateBR(value);
  return d ? d.toLocaleDateString('pt-BR') : '—';
}
