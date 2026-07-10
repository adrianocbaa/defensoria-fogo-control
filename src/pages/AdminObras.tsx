import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { WorksStats } from '@/components/obras/WorksStats';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useUserRole } from '@/hooks/useUserRole';
import { useObraActionPermissions } from '@/hooks/useObraActionPermissions';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calcularFinanceiroMedicao } from '@/lib/medicaoCalculo';
import { resolveItensEfetivos, MEDICAO_SNAPSHOT_COLUMNS } from '@/lib/medicaoSnapshot';
import { useMedicoesFinanceiro } from '@/hooks/useMedicoesFinanceiro';
import { MedicaoProgressBar } from '@/components/MedicaoProgressBar';
import * as LoadingStates from '@/components/LoadingStates';
import {
  Plus, Eye, Edit, Search, Trash2, Ruler, ClipboardList, ClipboardCheck,
  BarChart3, Map as MapIcon, List, LayoutDashboard, MoreHorizontal,
  ArrowUp, ArrowDown, ChevronsUpDown, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ObraDetails } from '@/components/ObraDetails';
import { useObras as useObrasFull } from '@/hooks/useObras';
import type { Obra as ObraFull } from '@/data/mockObras';
import { cn } from '@/lib/utils';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  status: string;
  tipo: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado?: number;
  porcentagem_execucao: number;
  created_at: string;
  previsao_termino?: string;
  data_inicio?: string;
  fiscal_id?: string | null;
  rdo_habilitado?: boolean;
}

const statusColors: Record<string, string> = {
  planejamento: 'bg-orange-100 text-orange-800 border-orange-200',
  planejada: 'bg-orange-100 text-orange-800 border-orange-200',
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-200',
  concluida: 'bg-green-100 text-green-800 border-green-200',
  paralisada: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<string, string> = {
  planejamento: 'Planejada',
  planejada: 'Planejada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  paralisada: 'Paralisada',
};

const statusDot: Record<string, string> = {
  planejamento: 'bg-orange-500',
  planejada: 'bg-orange-500',
  em_andamento: 'bg-blue-500',
  concluida: 'bg-green-500',
  paralisada: 'bg-red-500',
};

type SortKey = 'nome' | 'municipio' | 'status' | 'tipo' | 'execucao' | 'prazo' | 'valor' | 'fiscal';
type SortDir = 'asc' | 'desc';

function ObraProgressCell({ obraId, rdo_habilitado, rdoProgresso, fallbackProgresso }: {
  obraId: string;
  rdo_habilitado?: boolean;
  rdoProgresso?: number | null;
  fallbackProgresso?: number;
}) {
  const { dados } = useMedicoesFinanceiro(obraId);
  const hasRdo = rdo_habilitado && rdoProgresso != null;
  const hasMarcoes = dados.marcos.length > 0;

  if (!hasRdo && !hasMarcoes) {
    const p = fallbackProgresso && fallbackProgresso > 0 ? fallbackProgresso : null;
    if (!p) return <span className="text-sm text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-2 min-w-[160px]">
        <Progress value={p} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground w-10 text-right">{p.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px] py-0.5">
      {hasRdo && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground w-7">RDO</span>
          <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(rdoProgresso!, 100)}%` }} />
          </div>
          <span className="text-xs font-medium w-10 text-right">{rdoProgresso!.toFixed(1)}%</span>
        </div>
      )}
      {hasMarcoes && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground w-7">Med</span>
          <MedicaoProgressBar
            marcos={dados.marcos}
            totalContrato={dados.totalContrato}
            height={8}
            color="green"
            className="flex-1"
          />
          <span className="text-xs font-medium w-10 text-right">{dados.percentualExecutado.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function SortHeader({ label, active, dir, onClick, className }: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-home-muted hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function formatDateBR(d?: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-').map((v) => Number(v));
  if (!y || !m || !day) return '—';
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function AdminObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('todos');
  const [obraValores, setObraValores] = useState<Record<string, number>>({});
  const [obraProgressos, setObraProgressos] = useState<Record<string, number>>({});
  const [obraRdoProgressos, setObraRdoProgressos] = useState<Record<string, number | null>>({});
  const [fiscalNames, setFiscalNames] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const userRole = useUserRole();
  const navigate = useNavigate();
  const { obras: obrasFull } = useObrasFull();
  const [selectedObra, setSelectedObra] = useState<ObraFull | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (obraId: string) => {
    const found = obrasFull.find((o) => o.id === obraId) || null;
    setSelectedObra(found);
    setDetailsOpen(true);
  };

  const obraIds = useMemo(() => obras.map((o) => o.id), [obras]);
  const { getPermission } = useObraActionPermissions(obraIds);

  const fetchObras = async () => {
    try {
      setLoading(true);
      let query = supabase.from('obras').select('*');

      if (userRole.isContratada && !userRole.canEdit) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setObras([]);
          setLoading(false);
          return;
        }
        const { data: accessData, error: accessError } = await supabase
          .from('user_obra_access')
          .select('obra_id')
          .eq('user_id', user.id);
        if (accessError) throw accessError;
        const ids = accessData?.map((a) => a.obra_id) || [];
        if (ids.length === 0) {
          setObras([]);
          setLoading(false);
          return;
        }
        query = query.in('id', ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      const obrasWithExec = (data || []).map((obra: any) => {
        const valorFinal = Number(obra.valor_total) + Number(obra.valor_aditivado || 0);
        const valorPago = Number(obra.valor_executado || 0);
        const porcentagemExecucao = valorFinal > 0 ? (valorPago / valorFinal) * 100 : 0;
        return { ...obra, porcentagem_execucao: Number(porcentagemExecucao.toFixed(2)) };
      });

      const statusOrder = { em_andamento: 1, planejamento: 2, paralisada: 3, concluida: 4 } as const;
      const sorted = [...obrasWithExec].sort((a, b) => {
        const sa = (statusOrder as any)[a.status] || 99;
        const sb = (statusOrder as any)[b.status] || 99;
        if (sa !== sb) return sa - sb;
        const da = a.previsao_termino ? new Date(a.previsao_termino).getTime() : Infinity;
        const db = b.previsao_termino ? new Date(b.previsao_termino).getTime() : Infinity;
        return da - db;
      });

      setObras(sorted);

      const ids = sorted.map((o) => o.id);

      // Fiscais
      const fiscalIds = [...new Set(sorted.map((o) => o.fiscal_id).filter(Boolean))] as string[];
      if (fiscalIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', fiscalIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p.display_name || ''; });
        setFiscalNames(map);
      }

      const [rdoProgressData, aditivoData, medicaoData, orcamentoFinanceiroData] = await Promise.all([
        supabase.rpc('get_rdo_progress_batch', { p_obra_ids: ids }),
        supabase.from('aditivo_sessions').select('id, obra_id').in('obra_id', ids).eq('status', 'bloqueada'),
        supabase.from('medicao_sessions')
          .select('id, obra_id, sequencia, periodo_inicio, periodo_fim, data_vistoria, data_relatorio')
          .in('obra_id', ids),
        supabase.from('orcamento_items')
          .select('obra_id, total_contrato, item, eh_administracao_local')
          .in('obra_id', ids).limit(10000),
      ]);

      let aditivoItemsData: any = { data: [], error: null };
      let medicaoItemsData: any = { data: [], error: null };

      if (aditivoData.data && aditivoData.data.length > 0) {
        aditivoItemsData = await supabase.from('aditivo_items')
          .select('aditivo_id, total, item_code, qtd')
          .in('aditivo_id', aditivoData.data.map((s) => s.id));
      }
      if (medicaoData.data && medicaoData.data.length > 0) {
        medicaoItemsData = await supabase.from('medicao_items')
          .select(`medicao_id, total, item_code, pct, ${MEDICAO_SNAPSHOT_COLUMNS}`)
          .in('medicao_id', medicaoData.data.map((s) => s.id));
        if (medicaoItemsData.data) medicaoItemsData.data = resolveItensEfetivos(medicaoItemsData.data);
      }

      const rdoProgressMap = new Map<string, number>();
      if (rdoProgressData.data) {
        (rdoProgressData.data as any[]).forEach((row: any) => rdoProgressMap.set(row.obra_id, Number(row.progress)));
      }

      const valores: Record<string, number> = {};
      const progressos: Record<string, number> = {};
      const rdoProgs: Record<string, number | null> = {};

      for (const obra of sorted) {
        const r = rdoProgressMap.get(obra.id);
        rdoProgs[obra.id] = r !== undefined ? r : null;

        const obraOrc = orcamentoFinanceiroData.data?.filter((it: any) => it.obra_id === obra.id) || [];
        const obraAdSess = aditivoData.data?.filter((s: any) => s.obra_id === obra.id) || [];
        const adSessIds = obraAdSess.map((s: any) => s.id);
        const obraAdItems = aditivoItemsData.data?.filter((it: any) => adSessIds.includes(it.aditivo_id)) || [];
        const obraMedSess = (medicaoData.data?.filter((s: any) => s.obra_id === obra.id) || [])
          .sort((a: any, b: any) => a.sequencia - b.sequencia);
        const medSessIds = obraMedSess.map((s: any) => s.id);
        const obraMedItems = medicaoItemsData.data?.filter((it: any) => medSessIds.includes(it.medicao_id)) || [];

        const resultado = calcularFinanceiroMedicao(
          obraOrc, obraAdItems, obraMedSess, obraMedItems,
          Number(obra.valor_total || 0), Number(obra.valor_aditivado || 0),
        );
        valores[obra.id] = resultado.totalContrato;
        progressos[obra.id] = resultado.percentualExecutado;
      }

      setObraValores(valores);
      setObraProgressos(progressos);
      setObraRdoProgressos(rdoProgs);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      toast.error('Erro ao carregar obras');
      setObras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObras(); }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    obras.forEach((o) => {
      if (o.data_inicio) {
        const y = parseInt(o.data_inicio.split('-')[0], 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [obras]);

  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    obras.forEach((o) => s.add((o.status || '').toLowerCase() === 'planejamento' ? 'planejada' : o.status));
    return Array.from(s);
  }, [obras]);

  const counts = useMemo(() => {
    const c = { total: obras.length, em_andamento: 0, concluida: 0, planejada: 0, paralisada: 0 };
    obras.forEach((o) => {
      const s = (o.status || '').toLowerCase() === 'planejamento' ? 'planejada' : o.status;
      if (s in c) (c as any)[s] += 1;
    });
    return c;
  }, [obras]);

  const filteredObras = useMemo(() => {
    let list = obras;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((o) =>
        o.nome.toLowerCase().includes(q) ||
        o.municipio.toLowerCase().includes(q) ||
        o.tipo.toLowerCase().includes(q),
      );
    }
    if (statusFilter.length > 0) {
      list = list.filter((o) => {
        const s = (o.status || '').toLowerCase() === 'planejamento' ? 'planejada' : o.status;
        return statusFilter.includes(s);
      });
    }
    if (yearFilter !== 'todos') {
      list = list.filter((o) => o.data_inicio?.split('-')[0] === yearFilter);
    }
    return list;
  }, [obras, searchTerm, statusFilter, yearFilter]);

  const sortedObras = useMemo(() => {
    if (!sortKey) return filteredObras;
    const arr = [...filteredObras];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'nome': va = a.nome || ''; vb = b.nome || ''; return va.localeCompare(vb) * dir;
        case 'municipio': va = a.municipio || ''; vb = b.municipio || ''; return va.localeCompare(vb) * dir;
        case 'tipo': va = a.tipo || ''; vb = b.tipo || ''; return va.localeCompare(vb) * dir;
        case 'status': va = statusLabels[a.status] || ''; vb = statusLabels[b.status] || ''; return va.localeCompare(vb) * dir;
        case 'execucao': va = obraRdoProgressos[a.id] ?? obraProgressos[a.id] ?? -1; vb = obraRdoProgressos[b.id] ?? obraProgressos[b.id] ?? -1; return (va - vb) * dir;
        case 'prazo': va = a.previsao_termino ? new Date(a.previsao_termino).getTime() : Infinity; vb = b.previsao_termino ? new Date(b.previsao_termino).getTime() : Infinity; return (va - vb) * dir;
        case 'valor': va = obraValores[a.id] ?? 0; vb = obraValores[b.id] ?? 0; return (va - vb) * dir;
        case 'fiscal': va = a.fiscal_id ? (fiscalNames[a.fiscal_id] || '') : ''; vb = b.fiscal_id ? (fiscalNames[b.fiscal_id] || '') : ''; return va.localeCompare(vb) * dir;
      }
    });
    return arr;
  }, [filteredObras, sortKey, sortDir, obraValores, obraProgressos, obraRdoProgressos, fiscalNames]);

  const totalPages = Math.max(1, Math.ceil(sortedObras.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paginated = sortedObras.slice(startIdx, startIdx + pageSize);

  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, yearFilter, pageSize]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const toggleStatusFilter = (s: string) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]));
  };

  const clearAll = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setYearFilter('todos');
  };

  const hasActiveFilters = !!searchTerm || statusFilter.length > 0 || yearFilter !== 'todos';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('obras').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Obra excluída com sucesso!');
      setDeleteTarget(null);
      fetchObras();
    } catch (e) {
      console.error('Erro ao excluir obra:', e);
      toast.error('Erro ao excluir obra');
    }
  };

  const renderHeader = ({ openMenu }: { openMenu: () => void }) => (
    <WorksPageHeader
      onOpenMenu={openMenu}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      breadcrumb="Dashboard / Obras"
      title="Gerenciar Obras"
      subtitle="Visualize, filtre e acompanhe todas as obras cadastradas"
    />
  );

  return (
    <ObrasLayout header={renderHeader}>
      <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* Navegação do módulo */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/obras">
                <MapIcon className="h-4 w-4" />
                Mapa de Obras
              </Link>
            </Button>
            {!userRole.isContratada && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/dashboard">
                  <BarChart3 className="h-4 w-4" />
                  Estatísticas
                </Link>
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" className="gap-2" disabled>
                    <LayoutDashboard className="h-4 w-4" />
                    Painel de Obras
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em desenvolvimento</TooltipContent>
            </Tooltip>
            <Button variant="default" size="sm" className="gap-2 pointer-events-none">
              <List className="h-4 w-4" />
              Gerenciar Obras
            </Button>
          </div>

          <PermissionGuard requiresEdit showMessage={false}>
            <Button asChild size="sm" className="gap-2">
              <Link to="/admin/obras/nova">
                <Plus className="h-4 w-4" />
                Nova Obra
              </Link>
            </Button>
          </PermissionGuard>
        </div>

        {/* KPIs */}
        <WorksStats
          total={counts.total}
          emAndamento={counts.em_andamento}
          concluidas={counts.concluida}
          planejadas={counts.planejada}
          paralisadas={counts.paralisada}
          activeStatus={statusFilter as any}
          onToggleStatus={(s) => toggleStatusFilter(s)}
        />

        {/* Filtros */}
        <div className="rounded-xl border border-home-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-home-muted" />
              <Input
                placeholder="Buscar por nome, município ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-home-muted whitespace-nowrap">Ano início:</span>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chips ativos */}
          {(hasActiveFilters || statusFilter.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-home-border pt-3">
              {statusFilter.map((s) => (
                <span key={s} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', statusColors[s])}>
                  Status: {statusLabels[s] || s}
                  <button type="button" onClick={() => toggleStatusFilter(s)} aria-label="Remover"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {yearFilter !== 'todos' && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Ano: {yearFilter}
                  <button type="button" onClick={() => setYearFilter('todos')} aria-label="Remover"><X className="h-3 w-3" /></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Busca: {searchTerm}
                  <button type="button" onClick={() => setSearchTerm('')} aria-label="Remover"><X className="h-3 w-3" /></button>
                </span>
              )}
              <button type="button" onClick={clearAll} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                Limpar todos
              </button>
              <span className="ml-auto text-xs text-home-muted">
                {sortedObras.length} de {obras.length} obras exibidas
              </span>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="rounded-xl border border-home-border bg-card">
          {loading ? (
            <div className="p-6"><LoadingStates.TableSkeleton /></div>
          ) : sortedObras.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-home-muted">
                {hasActiveFilters ? 'Nenhuma obra encontrada com os filtros aplicados.' : 'Nenhuma obra cadastrada ainda.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearAll} className="mt-4">Limpar filtros</Button>
              ) : (
                <PermissionGuard requiresEdit showMessage={false}>
                  <Button asChild className="mt-4">
                    <Link to="/admin/obras/nova"><Plus className="h-4 w-4 mr-2" />Cadastrar primeira obra</Link>
                  </Button>
                </PermissionGuard>
              )}
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]"><SortHeader label="Nome da Obra" active={sortKey==='nome'} dir={sortDir} onClick={() => toggleSort('nome')} /></TableHead>
                    <TableHead><SortHeader label="Município" active={sortKey==='municipio'} dir={sortDir} onClick={() => toggleSort('municipio')} /></TableHead>
                    <TableHead><SortHeader label="Status" active={sortKey==='status'} dir={sortDir} onClick={() => toggleSort('status')} /></TableHead>
                    <TableHead><SortHeader label="Tipo" active={sortKey==='tipo'} dir={sortDir} onClick={() => toggleSort('tipo')} /></TableHead>
                    <TableHead className="min-w-[200px]"><SortHeader label="Execução" active={sortKey==='execucao'} dir={sortDir} onClick={() => toggleSort('execucao')} /></TableHead>
                    <TableHead><SortHeader label="Prazo" active={sortKey==='prazo'} dir={sortDir} onClick={() => toggleSort('prazo')} /></TableHead>
                    <TableHead className="text-right"><SortHeader label="Valor" active={sortKey==='valor'} dir={sortDir} onClick={() => toggleSort('valor')} className="ml-auto" /></TableHead>
                    <TableHead><SortHeader label="Fiscal" active={sortKey==='fiscal'} dir={sortDir} onClick={() => toggleSort('fiscal')} /></TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-home-muted">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((obra) => {
                    const statusKey = (obra.status || '').toLowerCase() === 'planejamento' ? 'planejada' : obra.status;
                    const fiscal = obra.fiscal_id ? fiscalNames[obra.fiscal_id] : '';
                    const perm = getPermission(obra.id, obra.status);
                    return (
                      <TableRow key={obra.id}>
                        <TableCell className="font-medium">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[260px] truncate">{obra.nome}</div>
                            </TooltipTrigger>
                            <TooltipContent>{obra.nome}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm text-home-muted">{obra.municipio}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('gap-1.5 font-medium', statusColors[statusKey])}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[statusKey])} />
                            {statusLabels[statusKey] || obra.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{obra.tipo}</TableCell>
                        <TableCell>
                          <ObraProgressCell
                            obraId={obra.id}
                            rdo_habilitado={obra.rdo_habilitado}
                            rdoProgresso={obraRdoProgressos[obra.id]}
                            fallbackProgresso={obraProgressos[obra.id]}
                          />
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDateBR(obra.previsao_termino)}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {obraValores[obra.id] !== undefined ? formatCurrency(obraValores[obra.id]) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{fiscal || <span className="text-home-muted">Não informado</span>}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary"
                              onClick={() => handleViewDetails(obra.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Mais ações">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => navigate(`/medicao/${obra.id}`)}>
                                  <Ruler className="h-4 w-4 mr-2" />Medição
                                </DropdownMenuItem>
                                {obra.rdo_habilitado !== false && (
                                  <DropdownMenuItem onClick={() => navigate(`/obras/${obra.id}/rdo/resumo`)}>
                                    <ClipboardList className="h-4 w-4 mr-2" />RDO
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => navigate(`/obras/${obra.id}/checklist`)}>
                                  <ClipboardCheck className="h-4 w-4 mr-2" />Checklist
                                </DropdownMenuItem>
                                {perm.canEdit && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate(`/admin/obras/${obra.id}/editar`)}>
                                      <Edit className="h-4 w-4 mr-2" />Editar
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {perm.canDelete && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget({ id: obra.id, nome: obra.nome })}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col gap-3 border-t border-home-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-home-muted">
                <span>
                  Exibindo {sortedObras.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, sortedObras.length)} de {sortedObras.length} obras
                </span>
                <div className="flex items-center gap-2">
                  <span>Por página:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <span className="text-sm text-home-muted">Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
              </div>
            </div>
            </>
          )}
        </div>

        <PermissionGuard requiresEdit={false}>
          <div className="text-sm text-home-muted bg-muted p-4 rounded-lg">
            <strong>Informação:</strong> Você tem permissão de visualização
            {userRole.isContratada && ' das obras atribuídas a você'}.
            Para criar, editar ou excluir obras, é necessário ter permissão de Editor ou Administrador.
          </div>
        </PermissionGuard>
      </div>
      </TooltipProvider>

      <ObraDetails
        obra={selectedObra}
        isOpen={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelectedObra(null); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a obra <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita e pode falhar se houver registros vinculados (medições, RDOs, aditivos, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ObrasLayout>
  );
}
