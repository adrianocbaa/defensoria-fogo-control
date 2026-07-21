import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Camera,
  MessageSquareText,
  BarChart2,
} from 'lucide-react';
import type { RdoCalendarDay } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  string,
  { label: string; className: string; group: 'pendente' | 'aprovado' | 'outro' }
> = {
  preenchendo: {
    label: 'Em preenchimento',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    group: 'pendente',
  },
  rascunho: {
    label: 'Rascunho',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    group: 'pendente',
  },
  aprovado: {
    label: 'Aprovado',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    group: 'aprovado',
  },
  concluido: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-800 border-green-200',
    group: 'outro',
  },
  reprovado: {
    label: 'Reprovado',
    className: 'bg-red-100 text-red-800 border-red-200',
    group: 'outro',
  },
};

type FilterKey = 'todos' | 'pendentes' | 'preenchendo' | 'rascunho' | 'aprovado';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'preenchendo', label: 'Em preenchimento' },
  { key: 'rascunho', label: 'Rascunho' },
  { key: 'aprovado', label: 'Aprovado' },
];

interface RdoListViewProps {
  days: RdoCalendarDay[];
  isLoading: boolean;
  onSelectDay: (day: RdoCalendarDay) => void;
}

export function RdoListView({ days, isLoading, onSelectDay }: RdoListViewProps) {
  const [filter, setFilter] = useState<FilterKey>('todos');

  const filtered = useMemo(() => {
    const sorted = [...days].sort((a, b) => (a.data < b.data ? 1 : -1));
    if (filter === 'todos') return sorted;
    if (filter === 'pendentes') {
      return sorted.filter(
        (d) => STATUS_META[d.status]?.group === 'pendente',
      );
    }
    return sorted.filter((d) => d.status === filter);
  }, [days, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Nenhum RDO encontrado para o filtro selecionado neste mês.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {filtered.map((day) => {
            const meta =
              STATUS_META[day.status] ?? {
                label: day.status,
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                group: 'outro' as const,
              };
            const dateObj = new Date(day.data + 'T12:00:00');
            return (
              <Card
                key={day.report_id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => onSelectDay(day)}
              >
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-2 min-w-[64px]">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {format(dateObj, 'MMM', { locale: ptBR })}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {format(dateObj, 'dd')}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {format(dateObj, 'EEE', { locale: ptBR })}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        #{day.numero_seq}
                      </Badge>
                      <Badge className={cn('border', meta.className)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <Counter Icon={ClipboardCheck} value={day.activity_count} label="ativ." />
                      <Counter Icon={BarChart2} value={day.quantitativo_count} label="qtd." />
                      <Counter Icon={AlertTriangle} value={day.occurrence_count} label="ocor." />
                      <Counter Icon={Camera} value={day.photo_count} label="fotos" />
                      <Counter Icon={MessageSquareText} value={day.comment_count} label="coment." />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(day);
                    }}
                  >
                    Detalhes
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Counter({
  Icon,
  value,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {value} {label}
    </span>
  );
}
