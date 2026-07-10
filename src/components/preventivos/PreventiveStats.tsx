import { Shield, CheckCircle2, Clock, AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: 'primary' | 'success' | 'warning' | 'destructive';
}

const accentBar: Record<StatCardProps['accent'], string> = {
  primary: 'bg-home-sidebar-bg',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

const accentIcon: Record<StatCardProps['accent'], string> = {
  primary: 'text-home-sidebar-bg',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-home-border bg-card p-5 shadow-sm">
      <div className={cn('absolute left-0 top-0 h-full w-1', accentBar[accent])} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-home-muted">{label}</p>
          <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">{value}</p>
        </div>
        <Icon className={cn('h-5 w-5 shrink-0', accentIcon[accent])} strokeWidth={2} />
      </div>
    </div>
  );
}

interface PreventiveStatsProps {
  total: number;
  regularizados: number;
  vencendo: number;
  irregulares: number;
}

export function PreventiveStats({ total, regularizados, vencendo, irregulares }: PreventiveStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total de Núcleos" value={total} icon={Shield} accent="primary" />
      <StatCard label="Regularizados" value={regularizados} icon={CheckCircle2} accent="success" />
      <StatCard label="Vencendo" value={vencendo} icon={Clock} accent="warning" />
      <StatCard label="Irregulares" value={irregulares} icon={AlertTriangle} accent="destructive" />
    </div>
  );
}
