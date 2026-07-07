import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useTicketImpedimentsFor } from '@/hooks/useTicketImpediments';

interface TicketImpedimentsHistoryProps {
  ticketId?: string | null;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function TicketImpedimentsHistory({ ticketId }: TicketImpedimentsHistoryProps) {
  const { items, loading } = useTicketImpedimentsFor(ticketId);

  if (!ticketId) return null;
  if (loading && items.length === 0) {
    return <p className="text-xs text-muted-foreground">Carregando histórico…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum impedimento registrado para esta tarefa.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((imp) => {
        const active = !imp.resolved_at;
        return (
          <li
            key={imp.id}
            className={`rounded-md border p-3 text-xs ${
              active
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-start gap-2">
              {active ? (
                <AlertOctagon className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" />
              )}
              <div className="flex-1 space-y-1">
                <p className="whitespace-pre-wrap text-foreground">{imp.motivo}</p>
                <p className="text-[11px] text-muted-foreground">
                  Registrado em {formatDateTime(imp.created_at)}
                  {imp.created_by_name ? ` por ${imp.created_by_name}` : ''}
                </p>
                {imp.resolved_at && (
                  <p className="text-[11px] text-muted-foreground">
                    Resolvido em {formatDateTime(imp.resolved_at)}
                    {imp.resolved_by_name ? ` por ${imp.resolved_by_name}` : ''}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
