import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, Columns3, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TicketDetailsSheet } from '@/components/TicketDetailsSheet';

type Row = {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string | null;
  location: string | null;
  assignee: string | null;
  request_type: string | null;
  process_number: string | null;
  created_at: string;
  requested_at: string | null;
  completed_at: string | null;
  finalized_at: string | null;
  services_total: number;
  services_done: number;
  servidores: string;
};

type SortKey = keyof Row;
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Impedido', 'Concluído'];
const PRIORITY_OPTIONS = ['Alta', 'Média', 'Baixa'];
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const COLUMNS_STORAGE_KEY = 'maintenance-reports.visible-columns.v1';

// Manual YYYY-MM-DD parsing to avoid UTC shift on date-only strings
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

function daysOpen(row: Row) {
  const start = parseDate(row.created_at);
  if (!start) return 0;
  const end = parseDate(row.finalized_at) ?? parseDate(row.completed_at) ?? new Date();
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    Alta: 'bg-destructive/15 text-destructive border-destructive/30',
    Média: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
    Baixa: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  };
  return map[p] ?? 'bg-muted text-muted-foreground';
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

type ColumnDef = {
  id: string;
  label: string;
  sortKey?: SortKey;
  align?: 'left' | 'right';
  defaultVisible?: boolean;
  required?: boolean;
  cell: (r: Row) => ReactNode;
  csv: (r: Row) => string | number;
};

const COLUMNS: ColumnDef[] = [
  {
    id: 'title',
    label: 'Título',
    sortKey: 'title',
    required: true,
    cell: (r) => <span className="font-medium text-foreground">{r.title}</span>,
    csv: (r) => r.title,
  },
  {
    id: 'status',
    label: 'Status',
    sortKey: 'status',
    cell: (r) => (
      <Badge variant="outline" className={cn('border font-normal', statusBadge(r.status))}>
        {r.status}
      </Badge>
    ),
    csv: (r) => r.status,
  },
  {
    id: 'priority',
    label: 'Prioridade',
    sortKey: 'priority',
    cell: (r) => (
      <Badge variant="outline" className={cn('border font-normal', priorityBadge(r.priority))}>
        {r.priority}
      </Badge>
    ),
    csv: (r) => r.priority,
  },
  {
    id: 'type',
    label: 'Tipo',
    sortKey: 'type',
    cell: (r) => <span className="text-muted-foreground">{r.type ?? '—'}</span>,
    csv: (r) => r.type ?? '',
  },
  {
    id: 'location',
    label: 'Local',
    sortKey: 'location',
    cell: (r) => <span className="text-muted-foreground">{r.location ?? '—'}</span>,
    csv: (r) => r.location ?? '',
  },
  {
    id: 'assignee',
    label: 'Responsável',
    sortKey: 'assignee',
    cell: (r) => <span className="text-muted-foreground">{r.assignee ?? '—'}</span>,
    csv: (r) => r.assignee ?? '',
  },
  {
    id: 'servidores',
    label: 'Servidor da manutenção',
    sortKey: 'servidores',
    cell: (r) => (
      <span className="text-muted-foreground">{r.servidores ? r.servidores : '—'}</span>
    ),
    csv: (r) => r.servidores ?? '',
  },
  {
    id: 'request',
    label: 'Origem',
    sortKey: 'request_type',
    cell: (r) => (
      <span className="text-muted-foreground">
        {r.request_type ?? '—'}
        {r.process_number ? (
          <span className="ml-1 text-xs text-muted-foreground/70">#{r.process_number}</span>
        ) : null}
      </span>
    ),
    csv: (r) => `${r.request_type ?? ''}${r.process_number ? ` #${r.process_number}` : ''}`,
  },
  {
    id: 'process_number',
    label: 'Nº processo',
    sortKey: 'process_number',
    defaultVisible: false,
    cell: (r) => <span className="text-muted-foreground">{r.process_number ?? '—'}</span>,
    csv: (r) => r.process_number ?? '',
  },
  {
    id: 'created_at',
    label: 'Abertura',
    sortKey: 'created_at',
    cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
    csv: (r) => formatDate(r.created_at),
  },
  {
    id: 'requested_at',
    label: 'Solicitado em',
    sortKey: 'requested_at',
    defaultVisible: false,
    cell: (r) => <span className="text-muted-foreground">{formatDate(r.requested_at)}</span>,
    csv: (r) => formatDate(r.requested_at),
  },
  {
    id: 'completed_at',
    label: 'Conclusão',
    sortKey: 'completed_at',
    cell: (r) => (
      <span className="text-muted-foreground">{formatDate(r.completed_at ?? r.finalized_at)}</span>
    ),
    csv: (r) => formatDate(r.completed_at ?? r.finalized_at),
  },
  {
    id: 'finalized_at',
    label: 'Finalizado em',
    sortKey: 'finalized_at',
    defaultVisible: false,
    cell: (r) => <span className="text-muted-foreground">{formatDate(r.finalized_at)}</span>,
    csv: (r) => formatDate(r.finalized_at),
  },
  {
    id: 'days',
    label: 'Dias',
    align: 'right',
    cell: (r) => (
      <span className="tabular-nums text-muted-foreground">{daysOpen(r)}</span>
    ),
    csv: (r) => daysOpen(r),
  },
  {
    id: 'services',
    label: 'Serviços',
    align: 'right',
    cell: (r) => (
      <span className="tabular-nums text-muted-foreground">
        {r.services_done}/{r.services_total}
      </span>
    ),
    csv: (r) => `${r.services_done}/${r.services_total}`,
  },
];

const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id);

function loadVisibleColumns(): string[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE;
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE;
    const known = new Set(COLUMNS.map((c) => c.id));
    const filtered = parsed.filter((id) => known.has(id));
    // Ensure required columns are always present
    COLUMNS.forEach((c) => {
      if (c.required && !filtered.includes(c.id)) filtered.push(c.id);
    });
    return filtered.length > 0 ? filtered : DEFAULT_VISIBLE;
  } catch {
    return DEFAULT_VISIBLE;
  }
}

export function MaintenanceReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleIds, setVisibleIds] = useState<string[]>(() => loadVisibleColumns());
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleIds));
    } catch {
      // ignore
    }
  }, [visibleIds]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => visibleIds.includes(c.id)),
    [visibleIds],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ticketsRes, managersRes] = await Promise.all([
        supabase
          .from('maintenance_tickets')
          .select('id,title,status,priority,type,location,assignee,request_type,process_number,manager_id,manager_ids,created_at,requested_at,completed_at,finalized_at,maintenance_ticket_services(id,completed,manager_id,manager_ids)')
          .order('created_at', { ascending: false })
          .limit(10000),
        supabase.from('maintenance_managers').select('id,nome').limit(10000),
      ]);
      if (cancelled) return;
      if (ticketsRes.error) {
        console.error('Erro ao carregar relatório:', ticketsRes.error);
        setRows([]);
      } else {
        const managerNameById = new Map<string, string>(
          (managersRes.data ?? []).map((m: any) => [m.id as string, (m.nome as string) ?? '']),
        );
        setRows(
          (ticketsRes.data ?? []).map((t: any) => {
            const services = (t.maintenance_ticket_services ?? []) as {
              completed: boolean;
              manager_id?: string | null;
              manager_ids?: string[] | null;
            }[];
            const ids = new Set<string>();
            const push = (v?: string | null) => {
              if (v) ids.add(v);
            };
            push(t.manager_id);
            (t.manager_ids ?? []).forEach(push);
            services.forEach((s) => {
              push(s.manager_id);
              (s.manager_ids ?? []).forEach(push);
            });
            const servidores = Array.from(ids)
              .map((id) => managerNameById.get(id))
              .filter((n): n is string => !!n && n.trim() !== '')
              .sort((a, b) => a.localeCompare(b, 'pt-BR'))
              .join(', ');

            return {
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              type: t.type,
              location: t.location,
              assignee: t.assignee,
              request_type: t.request_type,
              process_number: t.process_number,
              created_at: t.created_at,
              requested_at: t.requested_at,
              completed_at: t.completed_at,
              finalized_at: t.finalized_at,
              services_total: services.length,
              services_done: services.filter((s) => s.completed).length,
              servidores,
            };
          }),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const days = period === 'all' ? null : Number(period);
    const cutoff = days ? Date.now() - days * 86400000 : null;

    return rows
      .filter((r) => {
        if (status !== 'all' && r.status !== status) return false;
        if (priority !== 'all' && r.priority !== priority) return false;
        if (cutoff) {
          const d = parseDate(r.created_at);
          if (!d || d.getTime() < cutoff) return false;
        }
        if (q) {
          const hay = [r.title, r.type, r.location, r.assignee, r.process_number, r.servidores]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rows, search, status, priority, period, sortKey, sortDir]);

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    STATUS_OPTIONS.forEach((s) => (byStatus[s] = 0));
    filtered.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    });
    return byStatus;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleColumn = (id: string) => {
    setVisibleIds((prev) => {
      const col = COLUMNS.find((c) => c.id === id);
      if (col?.required) return prev;
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const resetColumns = () => setVisibleIds(DEFAULT_VISIBLE);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setPeriod('all');
  };

  const exportXlsx = async () => {
    const cols = visibleColumns;
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SIDIF';
    wb.created = new Date();
    const ws = wb.addWorksheet('Tarefas', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Column definitions (header + width)
    ws.columns = cols.map((c) => ({
      header: c.label,
      key: c.id,
      width: Math.min(
        40,
        Math.max(
          12,
          c.label.length + 2,
          ...filtered.slice(0, 200).map((r) => String(c.csv(r) ?? '').length + 2),
        ),
      ),
      style: { alignment: { horizontal: c.align === 'right' ? 'right' : 'left' } },
    }));

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    // Body rows
    filtered.forEach((r) => {
      ws.addRow(Object.fromEntries(cols.map((c) => [c.id, c.csv(r)])));
    });

    // Zebra striping
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          };
        });
      }
    });

    // AutoFilter across full data range
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(2, filtered.length + 1), column: cols.length },
    };

    // Metadata sheet with applied filters
    const meta = wb.addWorksheet('Filtros aplicados');
    meta.columns = [
      { header: 'Filtro', key: 'k', width: 24 },
      { header: 'Valor', key: 'v', width: 60 },
    ];
    meta.getRow(1).font = { bold: true };
    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
    meta.addRows([
      { k: 'Gerado em', v: new Date().toLocaleString('pt-BR') },
      { k: 'Busca', v: search || '(nenhuma)' },
      { k: 'Status', v: status === 'all' ? 'Todos' : status },
      { k: 'Prioridade', v: priority === 'all' ? 'Todas' : priority },
      { k: 'Período', v: periodLabel },
      {
        k: 'Ordenação',
        v: `${cols.find((c) => c.sortKey === sortKey)?.label ?? sortKey} (${sortDir === 'asc' ? 'crescente' : 'decrescente'})`,
      },
      { k: 'Colunas exportadas', v: cols.map((c) => c.label).join(', ') },
      { k: 'Registros', v: `${filtered.length} de ${rows.length}` },
    ]);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-tarefas-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 font-medium text-foreground hover:text-primary"
    >
      {label}
      <ArrowUpDown
        className={cn('h-3 w-3 transition-opacity', sortKey === k ? 'opacity-100' : 'opacity-40')}
      />
    </button>
  );

  const activeFilterCount =
    (status !== 'all' ? 1 : 0) +
    (priority !== 'all' ? 1 : 0) +
    (period !== 'all' ? 1 : 0) +
    (search ? 1 : 0);

  const colSpan = Math.max(1, visibleColumns.length);

  return (
    <div className="flex h-full flex-col">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="px-4 py-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Relatórios
              </h1>
              <p className="text-sm text-muted-foreground">
                Visão em planilha das tarefas cadastradas — {filtered.length} de {rows.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="mr-1 h-4 w-4" />
                    Colunas
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {visibleColumns.length}/{COLUMNS.length}
                    </Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-0">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-medium">Colunas visíveis</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={resetColumns}
                    >
                      Restaurar
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-auto py-1">
                    {COLUMNS.map((c) => {
                      const checked = visibleIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50',
                            c.required && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={c.required}
                            onCheckedChange={() => toggleColumn(c.id)}
                          />
                          <span>{c.label}</span>
                          {c.required && (
                            <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                              fixa
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={exportXlsx} disabled={filtered.length === 0}>
                Exportar Excel
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_repeat(3,minmax(0,180px))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, tipo, local, responsável, servidor, processo..."
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {STATUS_OPTIONS.map((s) => (
              <Badge key={s} variant="outline" className={cn('border', statusBadge(s))}>
                {s}: {totals[s] ?? 0}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-[1] bg-muted/60 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              {visibleColumns.map((c) => (
                <th
                  key={c.id}
                  className={cn('border-b px-3 py-2', c.align === 'right' && 'text-right')}
                >
                  {c.sortKey ? <SortHeader label={c.label} k={c.sortKey} /> : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando tarefas...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada com os filtros atuais.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenTicketId(r.id)}
                  className={cn(
                    'cursor-pointer border-b transition-colors hover:bg-muted/40',
                    idx % 2 === 1 && 'bg-muted/20',
                  )}
                >
                  {visibleColumns.map((c) => (
                    <td
                      key={c.id}
                      className={cn('border-b px-3 py-2', c.align === 'right' && 'text-right')}
                    >
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <TicketDetailsSheet
        ticketId={openTicketId}
        open={openTicketId !== null}
        onOpenChange={(v) => !v && setOpenTicketId(null)}
      />
    </div>
  );
}
