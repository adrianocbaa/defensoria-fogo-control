import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type {
  Impacto,
  PendenciaSituacao,
  Responsabilidade,
  Resultado,
  VerificacaoStatus,
} from './constants';

export const STATUS_ICON: Record<VerificacaoStatus, LucideIcon> = {
  nao_vistoriado: Circle,
  conforme: CheckCircle2,
  pendencia: AlertTriangle,
  nao_aplica: Ban,
};

export const STATUS_FG: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'text-muted-foreground',
  conforme: 'text-emerald-600 dark:text-emerald-400',
  pendencia: 'text-destructive',
  nao_aplica: 'text-muted-foreground',
};

export const STATUS_CHIP: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'bg-muted text-muted-foreground',
  conforme: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  pendencia: 'bg-destructive/15 text-destructive',
  nao_aplica: 'bg-muted text-muted-foreground',
};

export const STATUS_SOLID: Record<Exclude<VerificacaoStatus, 'nao_vistoriado'>, string> = {
  conforme: 'bg-emerald-600 text-white hover:bg-emerald-700',
  pendencia: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  nao_aplica: 'bg-slate-500 text-white hover:bg-slate-600',
};

export const IMPACTO_CHIP: Record<Impacto, string> = {
  impeditiva: 'bg-destructive/15 text-destructive',
  nao_impeditiva: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

export const SITUACAO_CHIP: Record<PendenciaSituacao, string> = {
  pendente: 'bg-destructive/12 text-destructive',
  correcao_registrada: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  reprovada: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  sanada: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cancelada: 'bg-muted text-muted-foreground',
};

export const SITUACAO_ICON: Record<PendenciaSituacao, LucideIcon> = {
  pendente: AlertTriangle,
  correcao_registrada: Clock,
  reprovada: ShieldAlert,
  sanada: CheckCircle2,
  cancelada: Ban,
};

export const RESPONSABILIDADE_CHIP: Record<Responsabilidade, string> = {
  contratada: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  dif_engenharia: 'bg-primary/12 text-primary',
  administracao: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  terceiro: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
};

/** Paleta do card de resultado (destaque grande). */
export const RESULTADO_TONE: Record<
  Resultado,
  { card: string; titulo: string; badge: string }
> = {
  apto: {
    card: 'border-emerald-500/60 bg-emerald-500/10',
    titulo: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-600 text-white',
  },
  apto_com_ressalvas: {
    card: 'border-amber-500/70 bg-amber-400/15',
    titulo: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-500 text-white',
  },
  nao_apto: {
    card: 'border-destructive/60 bg-destructive/10',
    titulo: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  incompleta: {
    card: 'border-border bg-muted/40',
    titulo: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
};
