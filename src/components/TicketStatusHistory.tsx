import { ArrowRight, Clock, PlusCircle } from 'lucide-react';
import { useTicketStatusHistory } from '@/hooks/useTicketStatusHistory';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  ticketId?: string | null;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusBadgeClasses(s: string | null) {
  const map: Record<string, string> = {
    Pendente: 'bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300',
    'Em andamento': 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
    Impedido: 'bg-destructive/15 text-destructive border-destructive/30',
    Concluído: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  };
  return (s && map[s]) || 'bg-muted text-muted-foreground border-border';
}

export function TicketStatusHistory({ ticketId }: Props) {
  const { items, loading } = useTicketStatusHistory(ticketId);

  if (!ticketId) return null;
  if (loading && items.length === 0) {
    return <p className="text-xs text-muted-foreground">Carregando histórico…</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma movimentação registrada.</p>;
  }

  // Show newest first
  const ordered = [...items].reverse();

  return (
    <ol className="space-y-2">
      {ordered.map((entry) => {
        const isInitial = !entry.from_status;
        return (
          <li
            key={entry.id}
            className="rounded-md border bg-muted/30 p-3 text-xs"
          >
            <div className="flex items-start gap-2">
              {isInitial ? (
                <PlusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isInitial ? (
                    <>
                      <span className="text-muted-foreground">Tarefa criada como</span>
                      <Badge variant="outline" className={cn('border font-normal', statusBadgeClasses(entry.to_status))}>
                        {entry.to_status}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className={cn('border font-normal', statusBadgeClasses(entry.from_status))}>
                        {entry.from_status}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className={cn('border font-normal', statusBadgeClasses(entry.to_status))}>
                        {entry.to_status}
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatDateTime(entry.changed_at)}
                  {entry.changed_by_name ? ` · por ${entry.changed_by_name}` : ''}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
