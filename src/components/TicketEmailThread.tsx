import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MailOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmailRow = {
  id: string;
  direction: string;
  from_addr: string | null;
  to_addrs: string[] | null;
  subject: string | null;
  body_text: string | null;
  created_at: string;
};

function formatDT(v: string) {
  try {
    return new Date(v).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return v;
  }
}

export function TicketEmailThread({ ticketId }: { ticketId: string }) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_ticket_emails')
        .select('id,direction,from_addr,to_addrs,subject,body_text,created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) console.error('Erro ao carregar thread:', error);
      setRows((data as EmailRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando conversa...
      </div>
    );
  }

  if (!rows.length) {
    return <p className="text-xs text-muted-foreground">Nenhum e-mail registrado para esta tarefa.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const isIn = r.direction === 'inbound';
        return (
          <li
            key={r.id}
            className={cn(
              'rounded border px-3 py-2 text-sm',
              isIn ? 'bg-muted/30 border-border' : 'bg-primary/5 border-primary/20',
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {isIn ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                {isIn ? 'Recebido' : 'Enviado'}
                
              </div>
              <span className="text-[11px] text-muted-foreground">{formatDT(r.created_at)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {isIn ? <>De: <span className="text-foreground">{r.from_addr ?? '—'}</span></> : (
                <>Para: <span className="text-foreground">{(r.to_addrs ?? []).join(', ') || '—'}</span></>
              )}
            </div>
            {r.subject && (
              <div className="mt-1 text-sm font-medium text-foreground truncate">{r.subject}</div>
            )}
            {r.body_text && (
              <div className="mt-1 whitespace-pre-wrap text-xs text-foreground/90 line-clamp-6">
                {r.body_text}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
