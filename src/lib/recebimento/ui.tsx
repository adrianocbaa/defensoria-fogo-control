import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  MinusCircle,
  type LucideIcon,
} from 'lucide-react';
import type { PendenciaSituacao, VerificacaoStatus } from './constants';

/** Ícone por status de verificação (a cor nunca é o único diferenciador). */
export const STATUS_ICON: Record<VerificacaoStatus, LucideIcon> = {
  nao_vistoriado: Circle,
  conforme: CheckCircle2,
  nao_conforme: AlertTriangle,
  nao_executado: MinusCircle,
  nao_aplica: Ban,
};

/** Cor do ícone/texto do status. */
export const STATUS_FG: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'text-muted-foreground',
  conforme: 'text-emerald-600 dark:text-emerald-400',
  nao_conforme: 'text-destructive',
  nao_executado: 'text-amber-600 dark:text-amber-400',
  nao_aplica: 'text-muted-foreground',
};

/** Chip preenchido (pílula) usado nas linhas de verificação. */
export const STATUS_CHIP: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'bg-muted text-muted-foreground',
  conforme: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  nao_conforme: 'bg-destructive/15 text-destructive',
  nao_executado: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  nao_aplica: 'bg-muted text-muted-foreground',
};

/** Botões grandes do seletor de status (bottom sheet mobile). */
export const STATUS_SOLID: Record<Exclude<VerificacaoStatus, 'nao_vistoriado'>, string> = {
  conforme: 'bg-emerald-600 text-white hover:bg-emerald-700',
  nao_conforme: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  nao_executado: 'bg-amber-500 text-white hover:bg-amber-600',
  nao_aplica: 'bg-slate-500 text-white hover:bg-slate-600',
};

/** Barra lateral de status usada nos cards de ambiente/serviço. */
export type AccentTone = 'conforme' | 'andamento' | 'pendencia' | 'nao_executado' | 'neutro';

export const ACCENT_BAR: Record<AccentTone, string> = {
  conforme: 'bg-emerald-600',
  andamento: 'bg-sky-500',
  pendencia: 'bg-destructive',
  nao_executado: 'bg-amber-500',
  neutro: 'bg-slate-400/60',
};

export const SITUACAO_ICON: Record<PendenciaSituacao, LucideIcon> = {
  pendente: AlertTriangle,
  correcao_registrada: Clock,
  reprovada: AlertTriangle,
  sanada: CheckCircle2,
  cancelada: Ban,
};

/** Pílula de situação da pendência (fundo suave, sem borda). */
export const SITUACAO_CHIP: Record<PendenciaSituacao, string> = {
  pendente: 'bg-destructive/12 text-destructive',
  correcao_registrada: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  reprovada: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  sanada: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  cancelada: 'bg-muted text-muted-foreground',
};

export function formatarData(iso?: string | null) {
  if (!iso) return '';
  const base = iso.slice(0, 10);
  const [y, m, d] = base.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
