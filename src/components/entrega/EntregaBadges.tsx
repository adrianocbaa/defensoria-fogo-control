import { cn } from '@/lib/utils';
import {
  IMPACTO_LABEL,
  RESPONSABILIDADE_CURTA,
  SITUACAO_LABEL,
  type Impacto,
  type PendenciaSituacao,
  type Responsabilidade,
} from '@/lib/entrega/constants';
import { IMPACTO_CHIP, RESPONSABILIDADE_CHIP, SITUACAO_CHIP } from '@/lib/entrega/ui';

const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

export function ImpactoBadge({ impacto, className }: { impacto: Impacto; className?: string }) {
  return <span className={cn(base, IMPACTO_CHIP[impacto], className)}>{IMPACTO_LABEL[impacto]}</span>;
}

export function ResponsabilidadeBadge({
  responsabilidade,
  className,
}: {
  responsabilidade: Responsabilidade;
  className?: string;
}) {
  return (
    <span className={cn(base, RESPONSABILIDADE_CHIP[responsabilidade], className)}>
      {RESPONSABILIDADE_CURTA[responsabilidade]}
    </span>
  );
}

export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: PendenciaSituacao;
  className?: string;
}) {
  return (
    <span className={cn(base, 'normal-case tracking-normal', SITUACAO_CHIP[situacao], className)}>
      {SITUACAO_LABEL[situacao]}
    </span>
  );
}
