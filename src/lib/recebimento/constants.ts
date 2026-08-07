export type VerificacaoStatus =
  | 'nao_vistoriado'
  | 'conforme'
  | 'nao_conforme'
  | 'nao_executado'
  | 'nao_aplica';

export type VistoriaTipo = 'provisorio' | 'reinspecao' | 'definitivo';
export type VistoriaStatus = 'em_andamento' | 'concluida' | 'cancelada';

export type PendenciaSituacao =
  | 'pendente'
  | 'correcao_registrada'
  | 'reprovada'
  | 'sanada'
  | 'cancelada';

export type PendenciaClassificacao =
  | 'acabamento'
  | 'funcional'
  | 'seguranca'
  | 'acessibilidade'
  | 'instalacao'
  | 'outro';

export const STATUS_LABEL: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'Não vistoriado',
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  nao_executado: 'Não executado',
  nao_aplica: 'Não se aplica',
};

/** Classes semânticas (sem cor hardcoded fora dos tokens de estado do design system) */
export const STATUS_CLASS: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'bg-muted text-muted-foreground border-border',
  conforme: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-400',
  nao_conforme: 'bg-destructive/15 text-destructive border-destructive/40',
  nao_executado: 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-400',
  nao_aplica: 'bg-muted text-muted-foreground border-border',
};

export const STATUS_DOT: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'bg-muted-foreground/40',
  conforme: 'bg-emerald-500',
  nao_conforme: 'bg-destructive',
  nao_executado: 'bg-amber-500',
  nao_aplica: 'bg-muted-foreground/60',
};

export const VISTORIA_TIPO_LABEL: Record<VistoriaTipo, string> = {
  provisorio: 'Recebimento Provisório',
  reinspecao: 'Reinspeção',
  definitivo: 'Recebimento Definitivo',
};

export const SITUACAO_LABEL: Record<PendenciaSituacao, string> = {
  pendente: 'Pendente',
  correcao_registrada: 'Correção registrada',
  reprovada: 'Reprovada na reinspeção',
  sanada: 'Sanada',
  cancelada: 'Cancelada',
};

export const SITUACAO_CLASS: Record<PendenciaSituacao, string> = {
  pendente: 'bg-destructive/15 text-destructive border-destructive/40',
  correcao_registrada: 'bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-400',
  reprovada: 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-400',
  sanada: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-400',
  cancelada: 'bg-muted text-muted-foreground border-border',
};

export const CLASSIFICACAO_LABEL: Record<PendenciaClassificacao, string> = {
  acabamento: 'Acabamento',
  funcional: 'Funcional',
  seguranca: 'Segurança',
  acessibilidade: 'Acessibilidade',
  instalacao: 'Instalação',
  outro: 'Outro',
};

export const EVENTO_LABEL: Record<string, string> = {
  criada: 'Pendência identificada',
  descricao_alterada: 'Descrição alterada',
  correcao_registrada: 'Correção registrada',
  reinspecionada: 'Reinspecionada',
  reprovada: 'Correção reprovada',
  sanada: 'Pendência sanada',
  cancelada: 'Pendência cancelada',
};

export const ABERTAS: PendenciaSituacao[] = ['pendente', 'correcao_registrada', 'reprovada'];

export function vistoriaTitulo(v: { tipo: string; sequencia: number }) {
  if (v.tipo === 'reinspecao') {
    return `Reinspeção nº ${String(v.sequencia).padStart(2, '0')}`;
  }
  return VISTORIA_TIPO_LABEL[v.tipo as VistoriaTipo] ?? v.tipo;
}
