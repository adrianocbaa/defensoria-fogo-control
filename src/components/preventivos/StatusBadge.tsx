import { cn } from '@/lib/utils';

export type PreventivosStatus = 'green' | 'orange' | 'red' | 'gray';

const MAP: Record<PreventivosStatus, { label: string; className: string }> = {
  green: { label: 'REGULARIZADO', className: 'bg-success/15 text-success' },
  orange: { label: 'VENCENDO', className: 'bg-warning/15 text-warning' },
  red: { label: 'IRREGULAR', className: 'bg-destructive/15 text-destructive' },
  gray: { label: 'SEM INFORMAÇÃO', className: 'bg-muted text-muted-foreground' },
};

export function StatusBadge({ status }: { status: PreventivosStatus }) {
  const { label, className } = MAP[status];
  return (
    <span className={cn('inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider', className)}>
      {label}
    </span>
  );
}
