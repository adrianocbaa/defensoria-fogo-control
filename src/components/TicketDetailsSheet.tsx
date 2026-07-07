import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, MapPin, User } from 'lucide-react';

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  completed: boolean;
  status: string;
  location: string | null;
  scheduled_date: string | null;
  updated_at: string;
  created_at: string;
};

type TicketDetail = {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string | null;
  location: string | null;
  assignee: string | null;
  request_type: string | null;
  process_number: string | null;
  observations: string[] | null;
  created_at: string;
  requested_at: string | null;
  completed_at: string | null;
  finalized_at: string | null;
  services: ServiceRow[];
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value?: string | null) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Pendente: 'bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300',
    'Em andamento': 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
    Impedido: 'bg-destructive/15 text-destructive border-destructive/30',
    Concluído: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  };
  return map[s] ?? 'bg-muted text-muted-foreground';
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    Alta: 'bg-destructive/15 text-destructive border-destructive/30',
    Média: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
    Baixa: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  };
  return map[p] ?? 'bg-muted text-muted-foreground';
}

export function TicketDetailsSheet({
  ticketId,
  open,
  onOpenChange,
}: {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ticketId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTicket(null);
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select(
          'id,title,status,priority,type,location,assignee,request_type,process_number,observations,created_at,requested_at,completed_at,finalized_at,maintenance_ticket_services(id,title,description,order_index,completed,status,location,scheduled_date,updated_at,created_at)',
        )
        .eq('id', ticketId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Erro ao carregar detalhes do ticket:', error);
        setTicket(null);
      } else if (data) {
        const services = ((data as any).maintenance_ticket_services ?? []) as ServiceRow[];
        setTicket({
          ...(data as any),
          observations: (data as any).observations ?? null,
          services: services.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ticketId]);

  const pendingServices = ticket?.services.filter((s) => !s.completed) ?? [];
  const doneServices = ticket?.services.filter((s) => s.completed) ?? [];
  const lastUpdate = ticket?.services.reduce<string | null>((acc, s) => {
    if (!s.updated_at) return acc;
    if (!acc) return s.updated_at;
    return new Date(s.updated_at) > new Date(acc) ? s.updated_at : acc;
  }, null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto sm:max-w-xl">
        {loading || !ticket ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {loading ? 'Carregando detalhes...' : 'Nenhum dado encontrado.'}
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('border font-normal', statusBadge(ticket.status))}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline" className={cn('border font-normal', priorityBadge(ticket.priority))}>
                  {ticket.priority}
                </Badge>
                {ticket.type && (
                  <Badge variant="secondary" className="font-normal">
                    {ticket.type}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-lg leading-tight">{ticket.title}</SheetTitle>
              <SheetDescription>
                Aberto em {formatDate(ticket.created_at)}
                {ticket.process_number ? ` · Processo #${ticket.process_number}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoField icon={<User className="h-3.5 w-3.5" />} label="Responsável" value={ticket.assignee} />
              <InfoField icon={<MapPin className="h-3.5 w-3.5" />} label="Local" value={ticket.location} />
              <InfoField label="Origem" value={ticket.request_type} />
              <InfoField label="Solicitado em" value={formatDate(ticket.requested_at)} />
              <InfoField label="Concluído em" value={formatDate(ticket.completed_at)} />
              <InfoField label="Finalizado em" value={formatDate(ticket.finalized_at)} />
              <InfoField
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Último apontamento"
                value={formatDateTime(lastUpdate)}
                fullWidth
              />
            </div>

            {ticket.observations && ticket.observations.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h3 className="mb-2 text-sm font-medium">Observações</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {ticket.observations.map((o, i) => (
                      <li key={i} className="rounded border bg-muted/30 px-2 py-1">{o}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Separator className="my-4" />

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Serviços pendentes
                  <span className="ml-2 text-xs text-muted-foreground">
                    {pendingServices.length} de {ticket.services.length}
                  </span>
                </h3>
              </div>
              {pendingServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço pendente.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingServices.map((s) => (
                    <ServiceItem key={s.id} service={s} />
                  ))}
                </ul>
              )}
            </section>

            {doneServices.length > 0 && (
              <section className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Serviços concluídos
                  <span className="ml-2 text-xs">({doneServices.length})</span>
                </h3>
                <ul className="space-y-2">
                  {doneServices.map((s) => (
                    <ServiceItem key={s.id} service={s} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoField({
  icon,
  label,
  value,
  fullWidth,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn('rounded border bg-muted/20 px-3 py-2', fullWidth && 'col-span-2')}>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm text-foreground">{value || '—'}</div>
    </div>
  );
}

function ServiceItem({ service }: { service: ServiceRow }) {
  return (
    <li className="flex gap-2 rounded border bg-card p-2 text-sm">
      {service.completed ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className={cn('font-medium text-foreground', service.completed && 'line-through opacity-70')}>
          {service.title}
        </div>
        {service.description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{service.description}</div>
        )}
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {service.status && <span>Status: {service.status}</span>}
          {service.location && <span>· {service.location}</span>}
          {service.scheduled_date && <span>· Agendado: {formatDate(service.scheduled_date)}</span>}
          {service.updated_at && <span>· Atualizado: {formatDateTime(service.updated_at)}</span>}
        </div>
      </div>
    </li>
  );
}
