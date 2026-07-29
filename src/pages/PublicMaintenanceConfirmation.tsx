import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2, Mail, RotateCcw, ImageIcon, Wrench } from 'lucide-react';

type ServicePhoto = { id?: string; url: string; path?: string; description?: string };
type TicketService = {
  title: string;
  description: string | null;
  execution_photos: ServicePhoto[] | null;
};

type TicketInfo = {
  id: string;
  ticket_number: number | null;
  title: string;
  status: string;
  completed_at: string | null;
  confirmed_at: string | null;
  finalization_note: string | null;
  location: string | null;
  reference_photos: ServicePhoto[] | null;
  services: TicketService[] | null;
};

export default function PublicMaintenanceConfirmation() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Link inválido ou incompleto.');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_maintenance_ticket_by_token', {
        p_token: token,
      });
      if (error) {
        setError(error.message);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError('Link inválido ou expirado.');
      } else {
        const row: any = Array.isArray(data) ? data[0] : data;
        if (row?.error === 'not_found') {
          setError('Este link não existe, expirou ou o chamado já foi reaberto.');
        } else if (!row?.id) {
          setError('Não foi possível localizar os dados deste chamado.');
        } else {
          setTicket(row as TicketInfo);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async (accept: boolean) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.rpc('confirm_maintenance_service', {
      p_token: token,
      p_accept: accept,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(accept ? 'accept' : 'reject');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">Não foi possível abrir a confirmação</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Link inválido.'}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Se você recebeu este link por e-mail, responda a mensagem original informando o número do chamado para que a equipe de manutenção possa verificar.
          </p>
        </div>
      </div>
    );
  }

  if (ticket.confirmed_at || done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          {done === 'reject' ? (
            <RotateCcw className="mx-auto mb-3 h-10 w-10 text-warning" />
          ) : (
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
          )}
          <h1 className="text-lg font-semibold text-foreground">
            {done === 'reject' ? 'Chamado reaberto' : 'Serviço confirmado'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done === 'reject'
              ? 'A equipe de manutenção foi notificada e o chamado voltou para acompanhamento.'
              : 'Obrigado! O atendimento foi registrado e seguirá para arquivamento.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <section className="mx-auto max-w-xl rounded-lg border bg-card shadow-sm">
        <div className="border-b bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Mail className="h-3.5 w-3.5" /> SiDIF · Manutenção
          </div>
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            Chamado #{String(ticket.ticket_number ?? '').padStart(4, '0')} — {ticket.title}
          </h1>
          {ticket.location && (
            <p className="mt-1 text-sm text-muted-foreground">Local: {ticket.location}</p>
          )}
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">
            A equipe de manutenção informou que o serviço foi concluído. Confirme se o atendimento
            atendeu à sua solicitação:
          </p>

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            <p>
              Ao confirmar, o chamado será arquivado. Se o serviço não resolveu a solicitação, o chamado será reaberto para nova análise da equipe responsável.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Observação (opcional)
            </label>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: serviço executado conforme solicitado."
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => submit(false)}
              disabled={submitting}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}
              Não foi resolvido
            </Button>
            <Button onClick={() => submit(true)} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Confirmar que foi resolvido
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
