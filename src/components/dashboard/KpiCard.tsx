import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  progress?: number;
  onClick?: () => void;
}

const TONES = {
  default: 'bg-card border-border',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
  danger: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900',
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
};

const ICON_TONES = {
  default: 'text-muted-foreground',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  success: 'text-emerald-600',
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  progress,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 flex flex-col gap-2 transition-shadow',
        TONES[tone],
        onClick && 'cursor-pointer hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className={cn('h-4 w-4 shrink-0', ICON_TONES[tone])} />
      </div>
      <div className="text-2xl font-bold tracking-tight leading-none">{value}</div>
      {typeof progress === 'number' && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
