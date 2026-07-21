import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNuclei } from '@/hooks/useNuclei';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRightLeft,
  Camera,
  AlertTriangle,
  Plus,
  Plane,
  CheckCircle2,
  UserCog,
  XCircle,
  RotateCcw,
  Bell,
  MapPin,
  ExternalLink,
  RefreshCw,
  History,
  Hash,
} from 'lucide-react';

type ActionType =
  | 'created'
  | 'moved'
  | 'finalized'
  | 'impediment'
  | 'impediment_resolved';

interface HistoryEvent {
  id: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketType?: string | null;
  nucleoId?: string | null;
  nucleoName?: string | null;
  action: ActionType;
  at: string; // ISO
  userName: string;
  badge?: string | null;
}

const ACTION_META: Record<
  ActionType,
  { label: string; verb: string; icon: any; bg: string; fg: string }
> = {
  created: {
    label: 'Criação',
    verb: 'criou chamado',
    icon: Plus,
    bg: 'bg-slate-100 dark:bg-slate-800',
    fg: 'text-slate-600 dark:text-slate-300',
  },
  moved: {
    label: 'Movimentação',
    verb: 'moveu chamado',
    icon: ArrowRightLeft,
    bg: 'bg-blue-100 dark:bg-blue-950',
    fg: 'text-blue-600 dark:text-blue-400',
  },
  finalized: {
    label: 'Finalização',
    verb: 'finalizou chamado',
    icon: CheckCircle2,
    bg: 'bg-emerald-100 dark:bg-emerald-950',
    fg: 'text-emerald-600 dark:text-emerald-400',
  },
  impediment: {
    label: 'Impedimento',
    verb: 'registrou impedimento no chamado',
    icon: AlertTriangle,
    bg: 'bg-amber-100 dark:bg-amber-950',
    fg: 'text-amber-600 dark:text-amber-400',
  },
  impediment_resolved: {
    label: 'Impedimento',
    verb: 'resolveu impedimento no chamado',
    icon: RotateCcw,
    bg: 'bg-amber-100 dark:bg-amber-950',
    fg: 'text-amber-600 dark:text-amber-400',
  },
};

const PERIOD_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: '7', label: 'Últimos 7 dias', days: 7 },
  { value: '15', label: 'Últimos 15 dias', days: 15 },
  { value: '30', label: 'Últimos 30 dias', days: 30 },
  { value: '90', label: 'Últimos 90 dias', days: 90 },
  { value: 'all', label: 'Todo o período', days: null },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string, todayKey: string, yesterdayKey: string) {
  if (key === todayKey) return 'Hoje';
  if (key === yesterdayKey) return 'Ontem';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

interface Props {
  onOpenTicket?: (ticketId: string) => void;
}

export function MaintenanceHistory({ onOpenTicket }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [view, setView] = useState<'timeline' | 'table'>('timeline');

  // Filters
  const [period, setPeriod] = useState<string>('7');
  const [ticketQuery, setTicketQuery] = useState('');
  const [user, setUser] = useState('all');
  const [action, setAction] = useState<'all' | ActionType>('all');
  const [nucleo, setNucleo] = useState('all');
  const [type, setType] = useState('all');
  const [visibleCount, setVisibleCount] = useState(50);

  const { nuclei } = useNuclei();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const days = PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? null;
      const since = days
        ? new Date(Date.now() - days * 86400_000).toISOString()
        : null;

      const ticketsQ = supabase
        .from('maintenance_tickets')
        .select(
          'id, title, type, nucleo_id, created_at, finalized_at, user_id',
        )
        .order('created_at', { ascending: false })
        .limit(10000);

      const historyQ = supabase
        .from('maintenance_ticket_status_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10000);

      const impedimentsQ = supabase
        .from('maintenance_ticket_impediments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);

      const [ticketsR, historyR, impR, profilesR] = await Promise.all([
        ticketsQ,
        historyQ,
        impedimentsQ,
        supabase.from('profiles').select('id, full_name, email').limit(10000),
      ]);

      const tickets = (ticketsR.data ?? []) as any[];
      const historyRows = (historyR.data ?? []) as any[];
      const impRows = (impR.data ?? []) as any[];
      const profileMap = new Map<string, string>();
      for (const p of (profilesR.data ?? []) as any[]) {
        profileMap.set(p.id, p.full_name || p.email || 'Usuário');
      }

      const nucleoMap = new Map<string, string>();
      for (const n of nuclei) nucleoMap.set(n.id, n.name);

      const ticketMap = new Map<string, any>();
      const numberByTicket = new Map<string, string>();
      // Sort ASC to build stable sequential number by creation
      const asc = [...tickets].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      asc.forEach((t, idx) => {
        ticketMap.set(t.id, t);
        numberByTicket.set(t.id, String(idx + 1).padStart(4, '0'));
      });

      const acc: HistoryEvent[] = [];

      for (const t of tickets) {
        if (!since || t.created_at >= since) {
          acc.push({
            id: `created-${t.id}`,
            ticketId: t.id,
            ticketNumber: numberByTicket.get(t.id) || t.id.slice(0, 6),
            ticketTitle: t.title,
            ticketType: t.type,
            nucleoId: t.nucleo_id,
            nucleoName: t.nucleo_id ? nucleoMap.get(t.nucleo_id) : null,
            action: 'created',
            at: t.created_at,
            userName: profileMap.get(t.user_id) || 'Usuário',
            badge: t.title,
          });
        }
        if (t.finalized_at && (!since || t.finalized_at >= since)) {
          acc.push({
            id: `finalized-${t.id}`,
            ticketId: t.id,
            ticketNumber: numberByTicket.get(t.id) || t.id.slice(0, 6),
            ticketTitle: t.title,
            ticketType: t.type,
            nucleoId: t.nucleo_id,
            nucleoName: t.nucleo_id ? nucleoMap.get(t.nucleo_id) : null,
            action: 'finalized',
            at: t.finalized_at,
            userName: 'Sistema',
            badge: null,
          });
        }
      }

      for (const h of historyRows) {
        if (!h.from_status) continue; // skip initial creation entry (already covered)
        if (since && h.changed_at < since) continue;
        const t = ticketMap.get(h.ticket_id);
        acc.push({
          id: `hist-${h.id}`,
          ticketId: h.ticket_id,
          ticketNumber: numberByTicket.get(h.ticket_id) || h.ticket_id.slice(0, 6),
          ticketTitle: t?.title ?? 'Chamado',
          ticketType: t?.type,
          nucleoId: t?.nucleo_id,
          nucleoName: t?.nucleo_id ? nucleoMap.get(t.nucleo_id) : null,
          action: 'moved',
          at: h.changed_at,
          userName: h.changed_by_name || 'Usuário',
          badge: `para ${h.to_status}`,
        });
      }

      for (const imp of impRows) {
        const t = ticketMap.get(imp.ticket_id);
        if (!since || imp.created_at >= since) {
          acc.push({
            id: `imp-${imp.id}`,
            ticketId: imp.ticket_id,
            ticketNumber:
              numberByTicket.get(imp.ticket_id) || imp.ticket_id.slice(0, 6),
            ticketTitle: t?.title ?? 'Chamado',
            ticketType: t?.type,
            nucleoId: t?.nucleo_id,
            nucleoName: t?.nucleo_id ? nucleoMap.get(t.nucleo_id) : null,
            action: 'impediment',
            at: imp.created_at,
            userName: imp.created_by_name || 'Sistema',
            badge: imp.motivo,
          });
        }
        if (imp.resolved_at && (!since || imp.resolved_at >= since)) {
          acc.push({
            id: `imp-res-${imp.id}`,
            ticketId: imp.ticket_id,
            ticketNumber:
              numberByTicket.get(imp.ticket_id) || imp.ticket_id.slice(0, 6),
            ticketTitle: t?.title ?? 'Chamado',
            ticketType: t?.type,
            nucleoId: t?.nucleo_id,
            nucleoName: t?.nucleo_id ? nucleoMap.get(t.nucleo_id) : null,
            action: 'impediment_resolved',
            at: imp.resolved_at,
            userName: imp.resolved_by_name || 'Sistema',
            badge: null,
          });
        }
      }

      acc.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setEvents(acc);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, nuclei.length]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.userName && set.add(e.userName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.ticketType && set.add(e.ticketType));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = ticketQuery.trim().toLowerCase();
    return events.filter((e) => {
      if (q && !e.ticketNumber.toLowerCase().includes(q) &&
          !e.ticketTitle.toLowerCase().includes(q)) return false;
      if (user !== 'all' && e.userName !== user) return false;
      if (action !== 'all' && e.action !== action) return false;
      if (nucleo !== 'all' && e.nucleoId !== nucleo) return false;
      if (type !== 'all' && e.ticketType !== type) return false;
      return true;
    });
  }, [events, ticketQuery, user, action, nucleo, type]);

  const visible = filtered.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(50);
  }, [ticketQuery, user, action, nucleo, type, period]);

  const today = new Date();
  const yesterday = new Date(Date.now() - 86400_000);
  const todayKey = dayKey(today.toISOString());
  const yesterdayKey = dayKey(yesterday.toISOString());

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEvent[]>();
    for (const ev of visible) {
      const k = dayKey(ev.at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return Array.from(map.entries());
  }, [visible]);

  const clearFilters = () => {
    setPeriod('7');
    setTicketQuery('');
    setUser('all');
    setAction('all');
    setNucleo('all');
    setType('all');
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Histórico de Atendimentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte o registro completo de ações e movimentações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <div className="inline-flex items-center rounded-lg border bg-card p-1">
            <button
              onClick={() => setView('timeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'timeline'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'table'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tabela
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Período
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Buscar Chamado
            </label>
            <div className="relative">
              <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                placeholder="Nº ou título..."
                value={ticketQuery}
                onChange={(e) => setTicketQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Usuário
            </label>
            <Select value={user} onValueChange={setUser}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueUsers.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Ação
            </label>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as any)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="created">Criação</SelectItem>
                <SelectItem value="moved">Movimentação</SelectItem>
                <SelectItem value="finalized">Finalização</SelectItem>
                <SelectItem value="impediment">Impedimento</SelectItem>
                <SelectItem value="impediment_resolved">
                  Impedimento resolvido
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Núcleo
            </label>
            <Select value={nucleo} onValueChange={setNucleo}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os núcleos</SelectItem>
                {nuclei.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {uniqueTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro encontrado</p>
          <p className="text-sm mt-1">
            Ajuste os filtros para ver mais movimentações.
          </p>
        </div>
      ) : view === 'timeline' ? (
        <div className="space-y-8">
          {grouped.map(([key, list]) => {
            const isToday = key === todayKey;
            const isYest = key === yesterdayKey;
            return (
              <section key={key}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-base font-semibold">
                    {isToday
                      ? 'Hoje'
                      : isYest
                        ? 'Ontem'
                        : dayLabel(key, todayKey, yesterdayKey)}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    • {formatDate(list[0].at)}
                  </span>
                </div>
                <div className="space-y-2">
                  {list.map((ev) => {
                    const meta = ACTION_META[ev.action];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={ev.id}
                        className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-3 md:px-4 hover:shadow-sm transition-shadow"
                      >
                        <span className="w-14 text-sm font-medium text-muted-foreground tabular-nums">
                          {formatTime(ev.at)}
                        </span>
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${meta.fg}`} />
                        </span>
                        <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold">{ev.userName}</span>
                          <span className="text-muted-foreground">
                            {meta.verb}
                          </span>
                          <span className="font-medium text-primary">
                            #{ev.ticketNumber}
                          </span>
                          {ev.badge && (
                            <Badge
                              variant="secondary"
                              className="font-normal"
                            >
                              {ev.badge}
                            </Badge>
                          )}
                          {ev.nucleoName && (
                            <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {ev.nucleoName}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onOpenTicket?.(ev.ticketId)}
                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Abrir chamado"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Data/Hora</th>
                <th className="text-left px-4 py-2.5">Usuário</th>
                <th className="text-left px-4 py-2.5">Ação</th>
                <th className="text-left px-4 py-2.5">Chamado</th>
                <th className="text-left px-4 py-2.5">Núcleo</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((ev) => {
                const meta = ACTION_META[ev.action];
                return (
                  <tr key={ev.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDate(ev.at)} {formatTime(ev.at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{ev.userName}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="font-normal">
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-medium">
                        #{ev.ticketNumber}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        · {ev.ticketTitle}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {ev.nucleoName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onOpenTicket?.(ev.ticketId)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > visibleCount && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + 50)}
          >
            Carregar mais registros
          </Button>
        </div>
      )}
    </div>
  );
}
