import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  CalendarDays,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plane,
  AlertTriangle,
  X,
  Edit,
} from 'lucide-react';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Travel } from '@/types/travel';

import { EditTravelModal } from './EditTravelModal';
import { ViewTravelModal } from './ViewTravelModal';
import { ViewTaskModal } from './ViewTaskModal';
import { CreateTravelModal } from './CreateTravelModal';

import { toast } from '@/hooks/use-toast';
import { useMaintenanceTickets, MaintenanceTicket } from '@/hooks/useMaintenanceTickets';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useTravelDaysUsage } from '@/hooks/useTravelDaysUsage';

type ViewMode = 'month' | 'week' | 'list' | 'day';
type TravelStatus = 'programada' | 'andamento' | 'concluida' | 'sem_previsao';

const STATUS_STYLES: Record<
  TravelStatus,
  { pill: string; dot: string; label: string; softText: string; softBg: string }
> = {
  programada: {
    pill: 'bg-blue-500 text-white border-blue-600',
    dot: 'bg-blue-500',
    label: 'Programada',
    softText: 'text-blue-700',
    softBg: 'bg-blue-50',
  },
  andamento: {
    pill: 'bg-orange-500 text-white border-orange-600',
    dot: 'bg-orange-500',
    label: 'Em andamento',
    softText: 'text-orange-700',
    softBg: 'bg-orange-50',
  },
  concluida: {
    pill: 'bg-emerald-500 text-white border-emerald-600',
    dot: 'bg-emerald-500',
    label: 'Concluída',
    softText: 'text-emerald-700',
    softBg: 'bg-emerald-50',
  },
  sem_previsao: {
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-400',
    label: 'Sem previsão',
    softText: 'text-amber-700',
    softBg: 'bg-amber-50',
  },
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function computeStatus(travel: Travel): TravelStatus {
  if (!travel.data_ida || !travel.data_volta) return 'sem_previsao';
  const today = startOfToday();
  const start = parseISO(travel.data_ida);
  const end = parseISO(travel.data_volta);
  if (end < today) return 'concluida';
  if (start > today) return 'programada';
  return 'andamento';
}

export function TravelCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [travels, setTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showViewTaskModal, setShowViewTaskModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [listPage, setListPage] = useState(1);
  const listPageSize = 10;

  const { tickets } = useMaintenanceTickets();
  const { managers } = useMaintenanceManagers();
  const currentMonthKey = `${currentMonth.getFullYear()}-${String(
    currentMonth.getMonth() + 1,
  ).padStart(2, '0')}`;
  const {
    usage: monthUsage,
    limit: dailyLimit,
    refetch: refetchUsage,
  } = useTravelDaysUsage(currentMonthKey);

  const getTravelServidorNames = (travel: Travel): string[] => {
    if (travel.manager_ids && travel.manager_ids.length > 0) {
      const names = travel.manager_ids
        .map((id) => managers.find((m) => m.id === id)?.nome)
        .filter(Boolean) as string[];
      if (names.length > 0) return names;
    }
    if (travel.servidor) {
      return travel.servidor
        .split(/\s*\/\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getTravelServidorLabel = (travel: Travel) => {
    const names = getTravelServidorNames(travel);
    if (names.length === 0) return travel.servidor || '—';
    return names.map((n) => n.trim().split(/\s+/)[0]).join(' / ');
  };

  const fetchTravels = async () => {
    try {
      const { data, error } = await supabase
        .from('travels')
        .select('*')
        .order('data_ida', { ascending: true });
      if (error) throw error;
      setTravels(data || []);
    } catch (error) {
      console.error('Erro ao buscar viagens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar viagens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      refetchUsage();
    }
  };

  useEffect(() => {
    fetchTravels();
  }, []);

  // ---------- helpers de calendário ----------
  const getTravelsForDate = (date: Date) =>
    travels.filter((t) => {
      if (!t.data_ida || !t.data_volta) return false;
      return isWithinInterval(date, {
        start: parseISO(t.data_ida),
        end: parseISO(t.data_volta),
      });
    });

  const getTravelPosition = (travel: Travel, date: Date) => {
    if (!travel.data_ida || !travel.data_volta)
      return { show: false, position: 'middle' as const };
    const start = parseISO(travel.data_ida);
    const end = parseISO(travel.data_volta);
    if (!isWithinInterval(date, { start, end }))
      return { show: false, position: 'middle' as const };
    if (isSameDay(start, end)) return { show: true, position: 'single' as const };
    if (isSameDay(date, start)) return { show: true, position: 'start' as const };
    if (isSameDay(date, end)) return { show: true, position: 'end' as const };
    return { show: true, position: 'middle' as const };
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, new Date(year, month, 0).getDate() - i);
      days.push({ date, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    const totalCells = Math.ceil(days.length / 7) * 7;
    let next = 1;
    while (days.length < totalCells) {
      days.push({ date: new Date(year, month + 1, next++), isCurrentMonth: false });
    }
    return days;
  };

  const getWeekDays = () => {
    const today = new Date();
    const day = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, isCurrentMonth: true };
    });
  };

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let programadas = 0;
    let emAndamento = 0;
    let concluidas = 0;
    travels.forEach((t) => {
      const st = computeStatus(t);
      if (!t.data_ida || !t.data_volta) return;
      const start = parseISO(t.data_ida);
      const end = parseISO(t.data_volta);
      const inMonth =
        isWithinInterval(start, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(end, { start: monthStart, end: monthEnd });
      if (st === 'programada' && inMonth) programadas++;
      if (st === 'andamento') emAndamento++;
      if (st === 'concluida' && isWithinInterval(end, { start: monthStart, end: monthEnd }))
        concluidas++;
    });
    const totalUsed = Object.values(monthUsage).reduce((a, b) => a + b, 0);
    const totalLimit = Math.max(1, managers.length) * dailyLimit;
    return { programadas, emAndamento, concluidas, totalUsed, totalLimit };
  }, [travels, currentMonth, monthUsage, managers.length, dailyLimit]);

  const managersNearLimit = useMemo(
    () =>
      managers
        .map((m) => ({ ...m, used: monthUsage[m.id] ?? 0 }))
        .filter((m) => m.used >= dailyLimit - 2),
    [managers, monthUsage, dailyLimit],
  );

  // ---------- interação ----------
  const openTravelDrawer = (travel: Travel) => {
    setSelectedTravel(travel);
    setDrawerOpen(true);
  };

  const handleViewTask = (task: MaintenanceTicket) => {
    setSelectedTask(task);
    setShowViewTaskModal(true);
  };

  const findTicketForTravel = (travelId: string) => {
    const all = Object.values(tickets).flat() as MaintenanceTicket[];
    return all.find((t) => t.travel_id === travelId) || null;
  };

  // ---------- LISTA ----------
  const listRows = useMemo(() => {
    return [...travels].sort((a, b) => {
      const da = a.data_ida ? parseISO(a.data_ida).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.data_ida ? parseISO(b.data_ida).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [travels]);
  const totalPages = Math.max(1, Math.ceil(listRows.length / listPageSize));
  const pageStart = (listPage - 1) * listPageSize;
  const pageRows = listRows.slice(pageStart, pageStart + listPageSize);

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Carregando viagens...</p>
        </div>
      </div>
    );
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const daysToRender = viewMode === 'week' ? getWeekDays() : getDaysInMonth();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header institucional */}
      <div className="px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Viagens Técnicas</h1>
            <p className="text-sm text-muted-foreground">
              Sistema de Monitoramento de Manutenção Predial e Infraestrutura
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Nav mês */}
            <div className="inline-flex items-center rounded-lg border bg-card shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium min-w-[120px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Toggle view */}
            <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
              {(['month', 'week', 'list', 'day'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`text-xs font-medium px-3 h-7 rounded-md transition-colors ${
                    viewMode === v
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : v === 'list' ? 'Lista' : 'Dia'}
                </button>
              ))}
            </div>

            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Nova Viagem
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <KpiCard
            label="Viagens Programadas"
            value={kpis.programadas}
            accent="border-l-blue-500 text-blue-700"
          />
          <KpiCard
            label="Em Andamento"
            value={kpis.emAndamento}
            accent="border-l-orange-500 text-orange-700"
          />
          <KpiCard
            label={`Concluídas (${format(currentMonth, 'MMM', { locale: ptBR })})`}
            value={kpis.concluidas}
            accent="border-l-emerald-500 text-emerald-700"
          />
          <KpiCard
            label="Limite de Diárias"
            value={
              <span className="text-foreground">
                {kpis.totalUsed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                <span className="text-base font-normal text-muted-foreground">
                  /{kpis.totalLimit}
                </span>
              </span>
            }
            accent="border-l-slate-400 text-foreground"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-6 pb-6">
        {viewMode === 'list' ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">Servidor</TableHead>
                  <TableHead className="font-semibold">Cidade</TableHead>
                  <TableHead className="font-semibold">Serviço</TableHead>
                  <TableHead className="font-semibold">Chamado</TableHead>
                  <TableHead className="font-semibold">Ida</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Nenhuma viagem cadastrada.
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((t) => {
                  const ticket = t.ticket_id ? findTicketForTravel(t.id) : null;
                  const st = computeStatus(t);
                  const names = getTravelServidorNames(t);
                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => openTravelDrawer(t)}
                    >
                      <TableCell className="font-medium">
                        {names.join(', ') || t.servidor || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.destino}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[280px]">
                        {t.motivo || '—'}
                      </TableCell>
                      <TableCell>
                        {ticket ? (
                          <button
                            className="text-blue-600 hover:underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTask(ticket);
                            }}
                          >
                            #{(ticket.process_number || ticket.id).toString().slice(0, 6)}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.data_ida ? format(parseISO(t.data_ida), 'dd/MM/yyyy') : 'Sem previsão'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_STYLES[st].softBg} ${STATUS_STYLES[st].softText}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[st].dot}`} />
                          {STATUS_STYLES[st].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* paginação */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Exibindo {listRows.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + listPageSize, listRows.length)} de {listRows.length} registros
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setListPage((p) => Math.max(1, p - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === listPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setListPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setListPage((p) => Math.min(totalPages, p + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            {/* Calendário */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/30">
                {dayNames.map((d) => (
                  <div
                    key={d}
                    className="p-3 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className={`grid grid-cols-7`}>
                {daysToRender.map(({ date, isCurrentMonth }, index) => {
                  const dayTravels = getTravelsForDate(date);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div
                      key={index}
                      className={`relative min-h-[112px] border-r border-b last:border-r-0 p-2 transition-colors ${
                        isCurrentMonth ? 'bg-background hover:bg-muted/20' : 'bg-muted/10'
                      } ${isToday ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`inline-flex items-center justify-center h-7 min-w-7 px-1.5 text-xs font-semibold rounded-full ${
                            isToday
                              ? 'bg-blue-500 text-white'
                              : isCurrentMonth
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        {isToday && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                            Hoje
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayTravels.map((travel, i) => {
                          const pos = getTravelPosition(travel, date);
                          if (!pos.show) return null;
                          const st = computeStatus(travel);
                          const pill = STATUS_STYLES[st].pill;
                          return (
                            <div
                              key={travel.id}
                              className={`relative text-[11px] cursor-pointer transition-all hover:opacity-90 h-6 flex items-center border ${pill} ${
                                pos.position === 'start'
                                  ? 'rounded-l-md rounded-r-none'
                                  : pos.position === 'end'
                                    ? 'rounded-r-md rounded-l-none'
                                    : pos.position === 'middle'
                                      ? 'rounded-none'
                                      : 'rounded-md'
                              } px-2`}
                              style={{
                                marginLeft:
                                  pos.position === 'start' || pos.position === 'single' ? 0 : -1,
                                marginRight:
                                  pos.position === 'end' || pos.position === 'single' ? 0 : -1,
                                zIndex: 10 + i,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openTravelDrawer(travel);
                              }}
                              title={`${getTravelServidorNames(travel).join(', ') || travel.servidor} - ${travel.destino}`}
                            >
                              {pos.position === 'start' || pos.position === 'single' ? (
                                <div className="flex items-center gap-1 min-w-0 w-full">
                                  <span className="font-medium truncate flex-1">
                                    {getTravelServidorLabel(travel)}
                                  </span>
                                  <span className="opacity-90 text-[10px] truncate max-w-[80px]">
                                    {travel.destino}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-full h-full" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel lateral */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card shadow-sm p-4">
                <div>
                  <h3 className="text-base font-semibold leading-tight">Controle de Diárias</h3>
                  <p className="text-xs text-muted-foreground">
                    Utilização individual por servidor
                  </p>
                </div>

                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-3">
                    Nenhum servidor cadastrado.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {managers.map((m) => {
                      const used = monthUsage[m.id] ?? 0;
                      const pct = Math.min(100, (used / dailyLimit) * 100);
                      const exceeded = used > dailyLimit;
                      const near = !exceeded && used >= dailyLimit - 2;
                      const bar = exceeded
                        ? 'bg-red-500'
                        : near
                          ? 'bg-orange-500'
                          : 'bg-blue-500';
                      return (
                        <div key={m.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground truncate">
                              {m.nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {used.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/
                              {dailyLimit} diárias
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full ${bar} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {managersNearLimit.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                      Alerta de Limite
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800/90 leading-relaxed">
                    {managersNearLimit
                      .map((m) => m.nome)
                      .slice(0, 2)
                      .join(', ')}{' '}
                    poss{managersNearLimit.length > 1 ? 'uem' : 'ui'} saldo de diárias crítico
                    para novas solicitações.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Viagens sem previsão */}
        {travels.some((t) => !t.data_ida || !t.data_volta) && viewMode !== 'list' && (
          <div className="mt-6 bg-card rounded-xl border shadow-sm p-4">
            <h3 className="text-base font-semibold mb-1">Viagens sem previsão</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Viagens cadastradas sem data de ida/volta definida
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {travels
                .filter((t) => !t.data_ida || !t.data_volta)
                .map((travel) => (
                  <div
                    key={travel.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => openTravelDrawer(travel)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getTravelServidorNames(travel).join(', ') || travel.servidor}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{travel.destino}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-amber-700 border-amber-200 bg-amber-50 whitespace-nowrap"
                    >
                      Sem previsão
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer lateral — Detalhamento */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedTravel && (
            <TravelDrawerContent
              travel={selectedTravel}
              managers={managers}
              dailyLimit={dailyLimit}
              monthUsage={monthUsage}
              ticket={selectedTravel.ticket_id ? findTicketForTravel(selectedTravel.id) : null}
              onEdit={() => {
                setDrawerOpen(false);
                setShowEditModal(true);
              }}
              onOpenTicket={(t) => {
                setDrawerOpen(false);
                handleViewTask(t);
              }}
              onClose={() => setDrawerOpen(false)}
              getTravelServidorNames={getTravelServidorNames}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Modais */}
      {selectedTravel && (
        <>
          <ViewTravelModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            travel={selectedTravel}
            onEdit={() => {
              setShowViewModal(false);
              setShowEditModal(true);
            }}
          />
          <EditTravelModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            travel={selectedTravel}
            onTravelUpdated={() => {
              fetchTravels();
              setShowEditModal(false);
            }}
            onTravelDeleted={() => {
              fetchTravels();
              setShowEditModal(false);
            }}
          />
        </>
      )}

      <CreateTravelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTravelCreated={() => {
          fetchTravels();
          setShowCreateModal(false);
        }}
      />

      {selectedTask && (
        <ViewTaskModal
          ticket={{
            ...selectedTask,
            createdAt: new Date(selectedTask.created_at).toLocaleDateString('pt-BR'),
            requestType: selectedTask.request_type,
            processNumber: selectedTask.process_number,
            icon: null,
          }}
          open={showViewTaskModal}
          onOpenChange={setShowViewTaskModal}
        />
      )}
    </div>
  );
}

// ============================================================================
// KPI Card
// ============================================================================
function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-card shadow-sm px-4 py-3 border-l-4 ${accent}`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-wide`}>{label}</p>
      <p className="text-3xl font-bold mt-1 leading-none">{value}</p>
    </div>
  );
}

// ============================================================================
// Drawer content
// ============================================================================
function TravelDrawerContent({
  travel,
  managers,
  dailyLimit,
  monthUsage,
  ticket,
  onEdit,
  onOpenTicket,
  onClose,
  getTravelServidorNames,
}: {
  travel: Travel;
  managers: { id: string; nome: string }[];
  dailyLimit: number;
  monthUsage: Record<string, number>;
  ticket: MaintenanceTicket | null;
  onEdit: () => void;
  onOpenTicket: (t: MaintenanceTicket) => void;
  onClose: () => void;
  getTravelServidorNames: (t: Travel) => string[];
}) {
  const names = getTravelServidorNames(travel);
  const primaryName = names[0] || travel.servidor || '—';
  const primaryManager = managers.find((m) => m.nome === primaryName);
  const diarias = travel.diarias ?? 0;
  const valorUnitario = 220;
  const totalAcumulado = diarias * valorUnitario;
  const usedAnual = primaryManager ? monthUsage[primaryManager.id] ?? 0 : 0;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="text-lg font-semibold">Detalhamento da Viagem</SheetTitle>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {primaryName} – {travel.destino}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <DrawerField label="Servidor solicitante" value={primaryName} />
        <DrawerField label="Cidade de destino" value={travel.destino} />
        <DrawerField label="Serviço solicitado" value={travel.motivo || '—'} />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Chamado vinculado
          </p>
          {ticket ? (
            <button
              onClick={() => onOpenTicket(ticket)}
              className="text-blue-600 hover:underline font-medium"
            >
              #{(ticket.process_number || ticket.id).toString().slice(0, 6)} – {ticket.title}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Sem chamado vinculado</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DrawerField
            label="Data ida"
            value={travel.data_ida ? format(parseISO(travel.data_ida), 'dd/MM/yyyy') : '—'}
          />
          <DrawerField
            label="Data volta"
            value={travel.data_volta ? format(parseISO(travel.data_volta), 'dd/MM/yyyy') : '—'}
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            Controle Financeiro de Diárias
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Diárias Solicitadas:</span>
            <span className="font-semibold">
              {diarias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Diárias
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor Unitário (Cesta):</span>
            <span className="font-semibold">R$ {valorUnitario.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Acumulado:</span>
            <span className="font-semibold text-emerald-700">
              R$ {totalAcumulado.toFixed(2).replace('.', ',')}
            </span>
          </div>
          {primaryManager && (
            <div className="flex justify-between text-sm pt-1 border-t border-border/60">
              <span className="text-muted-foreground">Saldo do Servidor (mês):</span>
              <span
                className={`font-semibold ${usedAnual >= dailyLimit - 2 ? 'text-orange-600' : 'text-foreground'}`}
              >
                {usedAnual}/{dailyLimit} diárias utilizadas
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t px-6 py-4 space-y-2">
        <Button
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4" />
          Editar Cadastro
        </Button>
      </div>
    </div>
  );
}

function DrawerField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
