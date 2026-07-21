import { ClipboardCheck, AlertTriangle, MessageSquareText, Camera, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { RdoCounts } from '@/hooks/useRdoData';

interface Props {
  counts?: RdoCounts;
  isLoading: boolean;
}

const CARDS = [
  { key: 'relatorios' as const, label: 'Relatórios', icon: ClipboardCheck, tone: 'text-primary bg-primary/10' },
  { key: 'ocorrencias' as const, label: 'Ocorrências', icon: AlertTriangle, tone: 'text-amber-600 bg-amber-100' },
  { key: 'comentarios' as const, label: 'Comentários', icon: MessageSquareText, tone: 'text-blue-600 bg-blue-100' },
  { key: 'fotos' as const, label: 'Fotos', icon: Camera, tone: 'text-emerald-600 bg-emerald-100' },
  { key: 'videos' as const, label: 'Vídeos', icon: Video, tone: 'text-purple-600 bg-purple-100' },
];

export function RdoSummaryCards({ counts, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const value = counts?.[c.key] ?? 0;
        return (
          <div
            key={c.key}
            className="flex items-center gap-3 rounded-xl border border-home-border bg-home-surface px-4 py-3.5"
          >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c.tone)}>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-home-muted">{c.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-10" />
              ) : (
                <p className="text-xl font-semibold leading-tight text-foreground">{value}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
