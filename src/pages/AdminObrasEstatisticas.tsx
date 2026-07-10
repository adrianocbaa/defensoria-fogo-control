import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as LoadingStates from '@/components/LoadingStates';
import {
  BarChart3, Map as MapIcon, List, LayoutDashboard, Download, Filter, Trash2, Star, Save, AlertTriangle,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useObras as useObrasFull } from '@/hooks/useObras';
import { calcularFinanceiroMedicao } from '@/lib/medicaoCalculo';
import { resolveItensEfetivos, MEDICAO_SNAPSHOT_COLUMNS } from '@/lib/medicaoSnapshot';
import {
  calcularRiscoObra, normalizarStatus,
  rotuloClassificacao, corClassificacao, corDotClassificacao,
  type ClassificacaoRisco, type ResultadoRisco,
} from '@/lib/obrasEstatisticas';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ObraStat {
  id: string;
  nome: string;
  municipio: string;
  tipo: string;
  status: string;
  data_inicio?: string | null;
  previsao_termino?: string | null;
  data_termino_real?: string | null;
  valor_total: number;
  valor_aditivado?: number | null;
  rdo_habilitado: boolean;
  fiscal_id?: string | null;
  avancoFisico: number | null;
  avancoFinanceiro: number | null;
  totalContrato: number;
  valorExecutado: number;
  ultimoRdo: string | null;
  temMedicaoBloqueada: boolean;
  risco: ResultadoRisco;
}

interface FiltrosState {
  busca: string;
  status: string[];
  riscos: ClassificacaoRisco[];
  tipo: string;
  ano: string;
}

const FILTROS_VAZIO: FiltrosState = { busca: '', status: [], riscos: [], tipo: 'todos', ano: 'todos' };
const SCOPE = 'obras_estatisticas';

const CORES_RISCO: Record<ClassificacaoRisco, string> = {
  baixo: '#22c55e', medio: '#eab308', alto: '#ef4444',
  concluida: '#94a3b8', nao_iniciada: '#cbd5e1', insuficiente: '#cbd5e1',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const formatDateBR = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-').map(Number);
  if (!y || !m || !day) return '—';
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

export function AdminObrasEstatisticas() {
  const userRole = useUserRole();
  const { obras: obrasFull } = useObrasFull();
  const [linhas, setLinhas] = useState<ObraStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_VAZIO);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [novoNomeFiltro, setNovoNomeFiltro] = useState('');
  const [novoPadrao, setNovoPadrao] = useState(false);
  const savedFilters = useSavedFilters<FiltrosState>(SCOPE);

  // Aplicar filtro padrão ao carregar
  const [aplicouPadrao, setAplicouPadrao] = useState(false);
  useEffect(() => {
    if (!aplicouPadrao && savedFilters.items.length > 0) {
      const padrao = savedFilters.items.find((f) => f.is_default);
      if (padrao) setFiltros({ ...FILTROS_VAZIO, ...padrao.filters });
      setAplicouPadrao(true);
    }
  }, [savedFilters.items, aplicouPadrao]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let query = supabase.from('obras').select('*');

        if (userRole.isContratada && !userRole.canEdit) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { setLinhas([]); setLoading(false); return; }
          const { data: acc } = await supabase.from('user_obra_access').select('obra_id').eq('user_id', user.id);
          const ids = (acc || []).map((a) => a.obra_id);
          if (ids.length === 0) { setLinhas([]); setLoading(false); return; }
          query = query.in('id', ids);
        }

        const { data: obrasData, error } = await query;
        if (error) throw error;
        const ids = (obrasData || []).map((o: any) => o.id);
        if (ids.length === 0) { setLinhas([]); setLoading(false); return; }

        const [rdoProgress, aditivoSess, medicaoSess, orcamento, rdoLastRes] = await Promise.all([
          supabase.rpc('get_rdo_progress_batch', { p_obra_ids: ids }),
          supabase.from('aditivo_sessions').select('id, obra_id').in('obra_id', ids).eq('status', 'bloqueada'),
          supabase.from('medicao_sessions')
            .select('id, obra_id, sequencia, status, periodo_inicio, periodo_fim, data_vistoria, data_relatorio')
            .in('obra_id', ids),
          supabase.from('orcamento_items')
            .select('obra_id, total_contrato, item, eh_administracao_local')
            .in('obra_id', ids).limit(10000),
          supabase.from('rdo_reports').select('obra_id, data').in('obra_id', ids).limit(10000),
        ]);

        const aditivoIds = (aditivoSess.data || []).map((s: any) => s.id);
        const medicaoIds = (medicaoSess.data || []).map((s: any) => s.id);
        const [aditivoItemsRes, medicaoItemsRes] = await Promise.all([
          aditivoIds.length ? supabase.from('aditivo_items').select('aditivo_id, total, item_code, qtd').in('aditivo_id', aditivoIds) : Promise.resolve({ data: [] } as any),
          medicaoIds.length ? supabase.from('medicao_items').select(`medicao_id, total, item_code, pct, ${MEDICAO_SNAPSHOT_COLUMNS}`).in('medicao_id', medicaoIds) : Promise.resolve({ data: [] } as any),
        ]);

        const medicaoItems = resolveItensEfetivos(medicaoItemsRes.data || []) as any[];
        const rdoMap = new Map<string, number>();
        (rdoProgress.data || []).forEach((r: any) => rdoMap.set(r.obra_id, Number(r.progress)));

        const ultimoRdoMap = new Map<string, string>();
        (rdoLastRes.data || []).forEach((r: any) => {
          const prev = ultimoRdoMap.get(r.obra_id);
          if (!prev || r.data > prev) ultimoRdoMap.set(r.obra_id, r.data);
        });

        const bloqueadaObrasSet = new Set<string>();
        const sessObraMap = new Map<string, string>();
        (medicaoSess.data || []).forEach((s: any) => {
          sessObraMap.set(s.id, s.obra_id);
          if (s.status === 'bloqueada') bloqueadaObrasSet.add(s.obra_id);
        });

        const rows: ObraStat[] = (obrasData || []).map((obra: any) => {
          const obraOrc = (orcamento.data || []).filter((it: any) => it.obra_id === obra.id);
          const obraAdSess = (aditivoSess.data || []).filter((s: any) => s.obra_id === obra.id);
          const adIds = obraAdSess.map((s: any) => s.id);
          const obraAdItems = (aditivoItemsRes.data || []).filter((it: any) => adIds.includes(it.aditivo_id));
          const obraMedSess = (medicaoSess.data || []).filter((s: any) => s.obra_id === obra.id).sort((a: any, b: any) => a.sequencia - b.sequencia);
          const medSessIds = obraMedSess.map((s: any) => s.id);
          const obraMedItems = medicaoItems.filter((it: any) => medSessIds.includes(it.medicao_id));

          const resultado = calcularFinanceiroMedicao(
            obraOrc, obraAdItems, obraMedSess, obraMedItems,
            Number(obra.valor_total || 0), Number(obra.valor_aditivado || 0),
          );

          const avancoFisico = rdoMap.has(obra.id) ? rdoMap.get(obra.id)! : null;
          const avancoFinanceiro = resultado.totalContrato > 0
            ? Math.min(100, Math.max(0, resultado.percentualExecutado))
            : null;

          const risco = calcularRiscoObra({
            obra: {
              id: obra.id, nome: obra.nome, status: obra.status,
              data_inicio: obra.data_inicio, previsao_termino: obra.previsao_termino,
              data_termino_real: obra.data_termino_real,
            },
            avancoFisico, avancoFinanceiro,
            ultimoRdo: ultimoRdoMap.get(obra.id) || null,
            rdoDesabilitado: obra.rdo_habilitado === false,
            temMedicaoBloqueada: bloqueadaObrasSet.has(obra.id),
          });

          return {
            id: obra.id, nome: obra.nome, municipio: obra.municipio, tipo: obra.tipo, status: obra.status,
            data_inicio: obra.data_inicio, previsao_termino: obra.previsao_termino, data_termino_real: obra.data_termino_real,
            valor_total: Number(obra.valor_total || 0), valor_aditivado: Number(obra.valor_aditivado || 0),
            rdo_habilitado: obra.rdo_habilitado !== false, fiscal_id: obra.fiscal_id,
            avancoFisico, avancoFinanceiro,
            totalContrato: resultado.totalContrato, valorExecutado: resultado.valorAcumulado,
            ultimoRdo: ultimoRdoMap.get(obra.id) || null,
            temMedicaoBloqueada: bloqueadaObrasSet.has(obra.id),
            risco,
          };
        });

        setLinhas(rows);
      } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
        toast.error('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userRole.isContratada, userRole.canEdit]);

  // Anos disponíveis
  const anos = useMemo(() => {
    const set = new Set<number>();
    linhas.forEach((r) => {
      if (r.data_inicio) {
        const y = parseInt(r.data_inicio.split('-')[0], 10);
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [linhas]);

  const tipos = useMemo(() => Array.from(new Set(linhas.map((l) => l.tipo).filter(Boolean))).sort(), [linhas]);

  const filtradas = useMemo(() => {
    return linhas.filter((r) => {
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        if (![r.nome, r.municipio, r.tipo].some((v) => v?.toLowerCase().includes(q))) return false;
      }
      if (filtros.status.length > 0) {
        const s = normalizarStatus(r.status);
        if (!filtros.status.includes(s)) return false;
      }
      if (filtros.riscos.length > 0 && !filtros.riscos.includes(r.risco.classificacao)) return false;
      if (filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false;
      if (filtros.ano !== 'todos' && r.data_inicio?.split('-')[0] !== filtros.ano) return false;
      return true;
    });
  }, [linhas, filtros]);

  const kpis = useMemo(() => {
    const totalObras = filtradas.length;
    const valorContratado = filtradas.reduce((s, r) => s + r.totalContrato, 0);
    const valorExecutado = filtradas.reduce((s, r) => s + r.valorExecutado, 0);
    const emAndamento = filtradas.filter((r) => normalizarStatus(r.status) === 'em_andamento').length;
    const paralisadas = filtradas.filter((r) => normalizarStatus(r.status) === 'paralisada').length;
    const concluidas = filtradas.filter((r) => normalizarStatus(r.status) === 'concluida').length;
    const alto = filtradas.filter((r) => r.risco.classificacao === 'alto').length;
    return { totalObras, valorContratado, valorExecutado, emAndamento, paralisadas, concluidas, alto };
  }, [filtradas]);

  const distribRisco = useMemo(() => {
    const c: Record<ClassificacaoRisco, number> = { baixo: 0, medio: 0, alto: 0, concluida: 0, nao_iniciada: 0, insuficiente: 0 };
    filtradas.forEach((r) => { c[r.risco.classificacao] += 1; });
    return (Object.keys(c) as ClassificacaoRisco[])
      .filter((k) => c[k] > 0)
      .map((k) => ({ name: rotuloClassificacao[k], value: c[k], key: k }));
  }, [filtradas]);

  const distribStatus = useMemo(() => {
    const c: Record<string, number> = {};
    filtradas.forEach((r) => {
      const s = normalizarStatus(r.status);
      c[s] = (c[s] || 0) + 1;
    });
    const labels: Record<string, string> = {
      em_andamento: 'Em andamento', paralisada: 'Paralisada', concluida: 'Concluída', planejada: 'Planejada',
    };
    return Object.entries(c).map(([k, v]) => ({ name: labels[k] || k, quantidade: v }));
  }, [filtradas]);

  const alertas = useMemo(() => {
    const list: { obra: ObraStat; tipo: string; mensagem: string; nivel: 'alto' | 'medio' | 'info' }[] = [];
    filtradas.forEach((r) => {
      const status = normalizarStatus(r.status);
      if (status === 'paralisada') list.push({ obra: r, tipo: 'Paralisada', mensagem: 'Obra paralisada', nivel: 'alto' });
      if (r.risco.diasAtraso != null && r.risco.diasAtraso > 15) list.push({ obra: r, tipo: 'Atraso', mensagem: `Atrasada há ${r.risco.diasAtraso} dias`, nivel: 'alto' });
      else if (r.risco.diasAtraso != null && r.risco.diasAtraso >= 1) list.push({ obra: r, tipo: 'Atraso', mensagem: `${r.risco.diasAtraso} dia(s) de atraso`, nivel: 'medio' });
      if (r.avancoFisico != null && r.avancoFinanceiro != null && r.avancoFinanceiro - r.avancoFisico >= 15) {
        list.push({ obra: r, tipo: 'Divergência', mensagem: `Financeiro ${(r.avancoFinanceiro - r.avancoFisico).toFixed(1)}p.p. acima do físico`, nivel: 'alto' });
      }
      if (status === 'em_andamento' && r.ultimoRdo == null && !r.rdo_habilitado === false) {
        // já coberto pela observação, evita duplicar
      }
    });
    return list.slice(0, 60);
  }, [filtradas]);

  const toggleRisco = (r: ClassificacaoRisco) => {
    setFiltros((f) => ({ ...f, riscos: f.riscos.includes(r) ? f.riscos.filter((v) => v !== r) : [...f.riscos, r] }));
  };
  const toggleStatus = (s: string) => {
    setFiltros((f) => ({ ...f, status: f.status.includes(s) ? f.status.filter((v) => v !== s) : [...f.status, s] }));
  };

  const exportarCSV = () => {
    const header = ['Obra', 'Município', 'Tipo', 'Status', 'Início', 'Previsão término', 'Físico %', 'Financeiro %', 'Valor contratado', 'Valor executado', 'Risco', 'Score', 'Dias de atraso', 'Observações'];
    const linhasCsv = filtradas.map((r) => [
      r.nome, r.municipio, r.tipo, normalizarStatus(r.status),
      r.data_inicio || '', r.previsao_termino || '',
      r.avancoFisico != null ? r.avancoFisico.toFixed(1).replace('.', ',') : '',
      r.avancoFinanceiro != null ? r.avancoFinanceiro.toFixed(1).replace('.', ',') : '',
      r.totalContrato.toFixed(2).replace('.', ','), r.valorExecutado.toFixed(2).replace('.', ','),
      rotuloClassificacao[r.risco.classificacao], r.risco.score,
      r.risco.diasAtraso ?? '', r.risco.observacoes.join(' | '),
    ]);
    const csv = [header, ...linhasCsv]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obras-estatisticas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const salvarFiltro = async () => {
    const criado = await savedFilters.create(novoNomeFiltro, filtros, novoPadrao);
    if (criado) {
      setSaveDialogOpen(false);
      setNovoNomeFiltro('');
      setNovoPadrao(false);
    }
  };

  const aplicarFiltroSalvo = (id: string) => {
    const f = savedFilters.items.find((i) => i.id === id);
    if (f) setFiltros({ ...FILTROS_VAZIO, ...f.filters });
  };

  const renderHeader = ({ openMenu }: { openMenu: () => void }) => (
    <WorksPageHeader
      onOpenMenu={openMenu}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      breadcrumb="Dashboard / Obras / Estatísticas"
      title="Estatísticas de Obras"
      subtitle="Semáforo de risco, distribuição por status e alertas ativos"
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
                <Link to="/obras"><MapIcon className="h-4 w-4" />Mapa de Obras</Link>
              </Button>
              <Button variant="default" size="sm" className="gap-2 pointer-events-none">
                <BarChart3 className="h-4 w-4" />Estatísticas
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" size="sm" className="gap-2" disabled>
                      <LayoutDashboard className="h-4 w-4" />Painel de Obras
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Em desenvolvimento</TooltipContent>
              </Tooltip>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/admin/obras"><List className="h-4 w-4" />Gerenciar Obras</Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportarCSV}>
                <Download className="h-4 w-4" />Exportar CSV
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Obras" value={kpis.totalObras} bar="bg-primary" />
            <KpiCard label="Em andamento" value={kpis.emAndamento} bar="bg-blue-500" />
            <KpiCard label="Paralisadas" value={kpis.paralisadas} bar="bg-red-500" />
            <KpiCard label="Concluídas" value={kpis.concluidas} bar="bg-green-500" />
            <KpiCard label="Risco alto" value={kpis.alto} bar="bg-red-600" />
            <KpiCard label="Executado / Contratado" value={
              kpis.valorContratado > 0
                ? `${((kpis.valorExecutado / kpis.valorContratado) * 100).toFixed(1)}%`
                : '—'
            } sub={`${formatCurrency(kpis.valorExecutado)} / ${formatCurrency(kpis.valorContratado)}`} bar="bg-emerald-500" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-home-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Distribuição por risco</h3>
              <div className="h-[260px]">
                {distribRisco.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-home-muted">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribRisco} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name}: ${e.value}`}>
                        {distribRisco.map((d) => <Cell key={d.key} fill={CORES_RISCO[d.key]} />)}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-home-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Obras por status</h3>
              <div className="h-[260px]">
                {distribStatus.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-home-muted">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="rounded-xl border border-home-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <Label className="text-xs text-home-muted">Buscar</Label>
                <Input placeholder="Nome, município ou tipo..." value={filtros.busca}
                  onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-home-muted">Tipo</Label>
                <Select value={filtros.tipo} onValueChange={(v) => setFiltros((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-home-muted">Ano</Label>
                <Select value={filtros.ano} onValueChange={(v) => setFiltros((f) => ({ ...f, ano: v }))}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {anos.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-home-muted">Filtros salvos</Label>
                <div className="flex items-center gap-2">
                  <Select onValueChange={aplicarFiltroSalvo} value="">
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Aplicar..." /></SelectTrigger>
                    <SelectContent>
                      {savedFilters.items.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-home-muted">Nenhum filtro salvo</div>
                      )}
                      {savedFilters.items.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.is_default ? '★ ' : ''}{f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Salvar filtro atual"><Save className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Salvar filtros atuais</DialogTitle>
                        <DialogDescription>Salvo apenas para você (fica no seu perfil).</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Nome</Label>
                          <Input value={novoNomeFiltro} onChange={(e) => setNovoNomeFiltro(e.target.value)}
                            maxLength={80} placeholder="Ex.: Alto risco em andamento" />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={novoPadrao} onCheckedChange={(v) => setNovoPadrao(!!v)} />
                          Marcar como padrão
                        </label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={salvarFiltro}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFiltros(FILTROS_VAZIO)} className="gap-2">
                <Filter className="h-4 w-4" />Limpar
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-home-border pt-3">
              <span className="text-xs text-home-muted">Risco:</span>
              {(['baixo', 'medio', 'alto'] as ClassificacaoRisco[]).map((r) => (
                <button key={r} type="button" onClick={() => toggleRisco(r)}
                  className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    filtros.riscos.includes(r) ? corClassificacao[r] : 'border-home-border bg-background text-home-muted hover:bg-muted')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', corDotClassificacao[r])} />
                  {rotuloClassificacao[r]}
                </button>
              ))}
              <span className="ml-3 text-xs text-home-muted">Status:</span>
              {(['em_andamento', 'paralisada', 'planejada', 'concluida']).map((s) => (
                <button key={s} type="button" onClick={() => toggleStatus(s)}
                  className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    filtros.status.includes(s) ? 'border-primary bg-primary/10 text-primary' : 'border-home-border bg-background text-home-muted hover:bg-muted')}>
                  {s.replace('_', ' ')}
                </button>
              ))}
              {savedFilters.items.some((f) => f.is_default) && (
                <span className="ml-auto text-xs text-home-muted">
                  Filtro padrão aplicado ao entrar
                </span>
              )}
            </div>
          </div>

          {/* Lista de alertas */}
          {alertas.length > 0 && (
            <div className="rounded-xl border border-home-border bg-card">
              <div className="border-b border-home-border px-4 py-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Alertas ativos ({alertas.length})
                </h3>
              </div>
              <ul className="divide-y divide-home-border max-h-[280px] overflow-y-auto">
                {alertas.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.obra.nome}</div>
                      <div className="text-xs text-home-muted">{a.obra.municipio}</div>
                    </div>
                    <Badge variant="outline" className={cn(
                      a.nivel === 'alto' ? 'border-red-200 bg-red-50 text-red-700'
                        : a.nivel === 'medio' ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700',
                    )}>{a.tipo}</Badge>
                    <span className="text-xs text-home-muted min-w-0 truncate">{a.mensagem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabela */}
          <div className="rounded-xl border border-home-border bg-card">
            {loading ? (
              <div className="p-6"><LoadingStates.TableSkeleton /></div>
            ) : filtradas.length === 0 ? (
              <div className="p-10 text-center text-home-muted">Nenhuma obra corresponde aos filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Físico</TableHead>
                      <TableHead className="text-right">Financeiro</TableHead>
                      <TableHead className="text-right">Contrato</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((r) => {
                      const cls = r.risco.classificacao;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <Link to={`/admin/obras`} className="hover:underline">{r.nome}</Link>
                            <div className="text-xs text-home-muted">{r.tipo}</div>
                          </TableCell>
                          <TableCell className="text-sm text-home-muted">{r.municipio}</TableCell>
                          <TableCell className="text-sm">{normalizarStatus(r.status)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {r.avancoFisico != null ? `${r.avancoFisico.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {r.avancoFinanceiro != null ? `${r.avancoFinanceiro.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap">{formatCurrency(r.totalContrato)}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={cn('gap-1.5', corClassificacao[cls])}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', corDotClassificacao[cls])} />
                                  {rotuloClassificacao[cls]}
                                  {(cls === 'alto' || cls === 'medio' || cls === 'baixo') && ` · ${r.risco.score}`}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-0.5">
                                  <div>Prazo: {r.risco.componentes.prazo}</div>
                                  <div>Paralisação/RDO: {r.risco.componentes.paralisacao}</div>
                                  <div>Divergência: {r.risco.componentes.divergencia}</div>
                                  {r.risco.diasAtraso != null && <div>Dias de atraso: {r.risco.diasAtraso}</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs text-home-muted">
                            {r.risco.observacoes.length === 0 ? '—' : r.risco.observacoes.join(' · ')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Gerenciar filtros salvos */}
          {savedFilters.items.length > 0 && (
            <div className="rounded-xl border border-home-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Seus filtros salvos</h3>
              <ul className="divide-y divide-home-border">
                {savedFilters.items.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{f.name}</div>
                      <div className="text-xs text-home-muted">{new Date(f.updated_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => aplicarFiltroSalvo(f.id)}>Aplicar</Button>
                      <Button variant="ghost" size="icon" title={f.is_default ? 'Padrão' : 'Marcar como padrão'} onClick={() => savedFilters.setDefault(f.id)}>
                        <Star className={cn('h-4 w-4', f.is_default && 'fill-yellow-400 text-yellow-500')} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => savedFilters.remove(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PermissionGuard requiresEdit={false}>
            <div className="rounded-lg bg-muted p-4 text-sm text-home-muted">
              <strong>Aviso:</strong> os alertas e classificações são recalculados em tempo real a partir dos dados de obras, RDOs e medições. Não há persistência de estado no banco.
            </div>
          </PermissionGuard>
        </div>
      </TooltipProvider>
    </ObrasLayout>
  );
}

function KpiCard({ label, value, sub, bar }: { label: string; value: string | number; sub?: string; bar: string }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-home-border bg-card px-4 py-3">
      <span className={cn('mr-3 w-1 shrink-0 rounded-full', bar)} />
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs font-medium text-home-muted">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-home-muted truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default AdminObrasEstatisticas;
