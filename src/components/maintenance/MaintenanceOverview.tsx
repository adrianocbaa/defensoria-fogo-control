import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Loader2, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMaintenanceTickets, type MaintenanceTicket } from '@/hooks/useMaintenanceTickets';
import { useAvailableTravels } from '@/hooks/useAvailableTravels';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { cn } from '@/lib/utils';

const STATUS_ORDER: MaintenanceTicket['status'][] = ['Pendente', 'Em andamento', 'Impedido', 'Concluído'];
const STATUS_COLORS: Record<MaintenanceTicket['status'], string> = {
  'Pendente': 'bg-slate-400',
  'Em andamento': 'bg-blue-500',
  'Impedido': 'bg-orange-500',
  'Concluído': 'bg-emerald-500',
};

interface MaintenanceOverviewProps {
  onNavigate?: (section: string) => void;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function MaintenanceOverview({ onNavigate }: MaintenanceOverviewProps) {
  const { tickets, loading } = useMaintenanceTickets();
  const { travels } = useAvailableTravels();
  const { managers } = useMaintenanceManagers();

  const stats = useMemo(() => {
    const all = STATUS_ORDER.flatMap((s) => tickets[s] ?? []);
    const now = new Date();
    const abertos = tickets['Pendente']?.length ?? 0;
    const emAndamento = tickets['Em andamento']?.length ?? 0;
    const impedidos = tickets['Impedido']?.length ?? 0;
    const concluidos = tickets['Concluído']?.length ?? 0;

    // Atrasado: não finalizado, sem update há mais de 7 dias
    const atrasados = all.filter(
      (t) => t.status !== 'Concluído' && daysBetween(now, new Date(t.updated_at)) > 7,
    ).length;

    const total = all.length || 1;
    const taxa = Math.round((concluidos / total) * 100);

    // Requer atenção: impedidos + atrasados + prioridade Alta ainda abertos
    const attention = all
      .filter(
        (t) =>
          t.status === 'Impedido' ||
          (t.status !== 'Concluído' && daysBetween(now, new Date(t.updated_at)) > 7) ||
          (t.priority === 'Alta' && t.status !== 'Concluído'),
      )
      .slice(0, 6);

    // Comprovações pendentes: concluídos sem confirmation_file_url e não finalizados
    const comprovacoes = all.filter(
      (t) => t.status === 'Concluído' && !t.confirmation_file_url,
    ).length;

    // Carga da equipe
    const carga = new Map<string, number>();
    all.forEach((t) => {
      if (t.status === 'Concluído') return;
      (t.manager_ids ?? []).forEach((id) => carga.set(id, (carga.get(id) ?? 0) + 1));
    });
    const cargaList = Array.from(carga.entries())
      .map(([id, count]) => ({
        id,
        name: managers.find((m) => m.id === id)?.nome ?? 'Servidor',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Fluxo Kanban percent
    const fluxo = STATUS_ORDER.map((s) => ({
      status: s,
      count: tickets[s]?.length ?? 0,
    }));

    return {
      abertos,
      emAndamento,
      impedidos,
      concluidos,
      atrasados,
      taxa,
      attention,
      comprovacoes,
      cargaList,
      fluxo,
    };
  }, [tickets, managers]);

  const proximasViagens = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return travels
      .filter((t) => t.data_ida && new Date(t.data_ida) >= today)
      .sort((a, b) => (a.data_ida ?? '').localeCompare(b.data_ida ?? ''))
      .slice(0, 5);
  }, [travels]);

  const kpis = [
    { label: 'Chamados Abertos', value: stats.abertos, icon: AlertCircle, tone: 'text-slate-600', bar: 'bg-slate-400' },
    { label: 'Em Andamento', value: stats.emAndamento, icon: Loader2, tone: 'text-blue-600', bar: 'bg-blue-500' },
    { label: 'Impedidos', value: stats.impedidos, icon: AlertCircle, tone: 'text-orange-600', bar: 'bg-orange-500' },
    { label: 'Em Atraso', value: stats.atrasados, icon: Clock, tone: 'text-red-600', bar: 'bg-red-500' },
    { label: 'Concluídos', value: stats.concluidos, icon: CheckCircle2, tone: 'text-emerald-600', bar: 'bg-emerald-500' },
    { label: 'Taxa de Resolução', value: `${stats.taxa}%`, icon: TrendingUp, tone: 'text-primary', bar: 'bg-primary' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando indicadores…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={cn('absolute left-0 top-0 h-full w-1', k.bar)} />
            <CardContent className="pl-4 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <p className={cn('mt-1 text-2xl font-bold', k.tone)}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Requer atenção */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-amber-50 p-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-base">Requer Atenção</CardTitle>
              <Badge variant="secondary">{stats.attention.length}</Badge>
            </div>
            <Button variant="link" size="sm" onClick={() => onNavigate?.('tickets')}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum chamado precisa de atenção agora.
              </p>
            ) : (
              stats.attention.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      {t.priority === 'Alta' && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Crítico</Badge>
                      )}
                      {t.status === 'Impedido' && (
                        <Badge className="h-5 bg-orange-500 px-1.5 text-[10px] text-white hover:bg-orange-500">
                          Impedido
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.type} • {t.location}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate?.('tickets')}>
                    Ver
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Comprovações pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comprovações Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.comprovacoes}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chamados concluídos aguardando anexo de confirmação.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => onNavigate?.('tickets')}
            >
              Revisar chamados
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fluxo Kanban */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fluxo do Kanban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {stats.fluxo.map((f) => {
                const total = stats.fluxo.reduce((s, x) => s + x.count, 0) || 1;
                const pct = (f.count / total) * 100;
                return (
                  <div
                    key={f.status}
                    className={cn('h-full', STATUS_COLORS[f.status])}
                    style={{ width: `${pct}%` }}
                    title={`${f.status}: ${f.count}`}
                  />
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.fluxo.map((f) => (
                <div key={f.status} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLORS[f.status])} />
                  <span className="text-sm text-foreground">{f.status}</span>
                  <span className="ml-auto text-sm font-semibold">{f.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Carga da equipe */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Carga da Equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.cargaList.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sem chamados atribuídos.
              </p>
            ) : (
              stats.cargaList.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      c.count >= 8 && 'bg-red-100 text-red-700',
                      c.count >= 5 && c.count < 8 && 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {c.count} {c.count === 1 ? 'chamado' : 'chamados'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximas viagens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Próximas Viagens</CardTitle>
          </div>
          <Button variant="link" size="sm" onClick={() => onNavigate?.('travel')}>
            Ver calendário
          </Button>
        </CardHeader>
        <CardContent>
          {proximasViagens.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma viagem programada.
            </p>
          ) : (
            <ul className="divide-y">
              {proximasViagens.map((v) => (
                <li key={v.id} className="flex items-center gap-4 py-2">
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {v.data_ida?.split('-').slice(1).reverse().join('/')}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.destino}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.servidor} • {v.motivo}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
