import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2, ClipboardList, RotateCcw, ImageOff } from 'lucide-react';

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

function PhotoTile({
  photo,
  alt,
  className,
}: {
  photo: ServicePhoto;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground ${className ?? ''}`}>
        <ImageOff className="h-5 w-5" />
        <span className="text-[10px]">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <img
      src={photo.url}
      alt={photo.description || alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className ?? ''}`}
    />
  );
}

function InstitutionalHeader({ ticket }: { ticket?: TicketInfo | null }) {
  return (
    <header className="bg-primary p-6 text-primary-foreground">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Chamado SiDIF</p>
          <h1 className="text-2xl font-bold">
            #{String(ticket?.ticket_number ?? '').padStart(4, '0') || '—'}
          </h1>
        </div>
        <div className="rounded-lg bg-primary-foreground/20 p-2">
          <ClipboardList className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium">{ticket?.title ?? 'Confirmação de serviço'}</p>
        {ticket?.location && <p className="text-xs opacity-70">{ticket.location}</p>}
      </div>
    </header>
  );
}

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

  useEffect(() => {
    document.title = ticket?.ticket_number
      ? `Confirmação do chamado #${String(ticket.ticket_number).padStart(4, '0')} — SiDIF`
      : 'Confirmação de serviço — SiDIF';
  }, [ticket]);

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
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen justify-center bg-muted/40 sm:py-8">
        <div className="flex w-full max-w-md flex-col bg-background shadow-lg sm:max-w-2xl sm:rounded-2xl sm:overflow-hidden">
          <InstitutionalHeader />
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <XCircle className="mb-3 h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Não foi possível abrir a confirmação</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Link inválido.'}</p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Se você recebeu este link por e-mail, responda a mensagem original informando o número do chamado para que a equipe de manutenção possa verificar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ticket.confirmed_at || done) {
    return (
      <div className="flex min-h-screen justify-center bg-muted/40 sm:py-8">
        <div className="flex w-full max-w-md flex-col bg-background shadow-lg sm:max-w-2xl sm:rounded-2xl sm:overflow-hidden">
          <InstitutionalHeader ticket={ticket} />
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            {done === 'reject' ? (
              <RotateCcw className="mb-3 h-10 w-10 text-primary" />
            ) : (
              <CheckCircle2 className="mb-3 h-10 w-10 text-primary" />
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {done === 'reject' ? 'Chamado reaberto' : 'Serviço confirmado'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {done === 'reject'
                ? 'A equipe de manutenção foi notificada e o chamado voltou para acompanhamento.'
                : 'Obrigado! O atendimento foi registrado e seguirá para arquivamento.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const services = (ticket.services || []).filter(Boolean);
  const referencePhotos = ticket.reference_photos || [];
  const executionPhotos = services.flatMap((s) => s.execution_photos || []);

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 sm:py-8">
      <main className="relative flex w-full max-w-md flex-col bg-background shadow-lg sm:max-w-2xl sm:rounded-2xl sm:overflow-hidden">
        <InstitutionalHeader ticket={ticket} />

        <div className="space-y-6 p-5 sm:p-8">
          <p className="text-sm text-muted-foreground">
            A equipe do Núcleo de Manutenção informou que o serviço foi concluído. Confira as evidências e formalize o aceite ou a reabertura do chamado.
          </p>

          {ticket.finalization_note && (
            <div className="rounded-r-lg border-l-4 border-primary bg-primary/5 p-4">
              <h2 className="mb-1 text-xs font-bold uppercase text-primary">Observações da equipe</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {ticket.finalization_note}
              </p>
            </div>
          )}

          {(executionPhotos.length > 0 || referencePhotos.length > 0) && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase text-foreground">Evidências do serviço</h2>

              {executionPhotos.length > 0 && (
                <div className="space-y-3">
                  {executionPhotos.map((p, i) => (
                    <div key={p.id ?? `exec-${i}`} className="relative">
                      <span className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                        DEPOIS
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video overflow-hidden rounded-xl border bg-muted"
                      >
                        <PhotoTile photo={p} alt={`Execução ${i + 1}`} />
                      </a>
                      {p.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {referencePhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {referencePhotos.map((p, i) => (
                    <div key={p.id ?? `ref-${i}`} className="relative opacity-70 transition-opacity hover:opacity-100">
                      <span className="absolute left-2 top-2 z-10 rounded bg-foreground px-2 py-1 text-[10px] font-bold text-background">
                        ANTES
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video overflow-hidden rounded-xl border bg-muted"
                      >
                        <PhotoTile photo={p} alt={`Referência ${i + 1}`} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {services.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase text-foreground">Serviços executados</h2>
              <ol className="space-y-2">
                {services.map((s, i) => (
                  <li key={i} className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-sm font-semibold text-foreground">{i + 1}. {s.title}</div>
                    {s.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {services.length === 0 && executionPhotos.length === 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              A equipe não registrou serviços detalhados neste chamado; a descrição do atendimento consta nas observações acima.
            </div>
          )}

          <section className="space-y-3">
            <label htmlFor="comments" className="block text-sm font-semibold text-foreground">
              Observações do solicitante
            </label>
            <Textarea
              id="comments"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional: descreva qualquer detalhe..."
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground">
              Ao confirmar, você valida a execução do serviço e o chamado será arquivado. Se não resolveu, ele volta para nova análise da equipe.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t bg-background/95 p-4 backdrop-blur-md">
          <Button
            variant="outline"
            onClick={() => submit(false)}
            disabled={submitting}
            className="h-14 flex-1 rounded-2xl border-2 text-sm font-bold"
          >
            {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}
            Não resolvido
          </Button>
          <Button
            onClick={() => submit(true)}
            disabled={submitting}
            className="h-14 flex-[2] rounded-2xl text-sm font-bold shadow-lg"
          >
            {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Chamado resolvido
          </Button>
        </div>
      </main>
    </div>
  );
}
