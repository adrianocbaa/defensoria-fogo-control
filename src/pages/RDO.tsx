import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { ObrasSidebarMenuButton } from '@/components/obras/ObrasLayout';
import { RdoCalendar } from '@/components/rdo/RdoCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Lock, Plus } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanEditObra } from '@/hooks/useCanEditObra';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useRdoCounts,
  useRdoCalendar,
  useRdoRecentes,
  useFotosRecentes,
  useFirstMissingRdoDate,
  type RdoCalendarDay,
} from '@/hooks/useRdoData';
import { RdoSummaryCards } from '@/components/rdo/resumo/RdoSummaryCards';
import { RdoFilterChips, type RdoFilterKey } from '@/components/rdo/resumo/RdoFilterChips';
import { RdoViewToggle, type RdoView } from '@/components/rdo/resumo/RdoViewToggle';
import { RdoListView } from '@/components/rdo/resumo/RdoListView';
import { RdoDayDrawer } from '@/components/rdo/resumo/RdoDayDrawer';
import { RdoPhotoLightbox } from '@/components/rdo/resumo/RdoPhotoLightbox';
import { RecentRdosTable } from '@/components/rdo/resumo/RecentRdosTable';
import { RecentPhotosGrid } from '@/components/rdo/resumo/RecentPhotosGrid';
import { RdoLoadingState, RdoErrorState, RdoEmptyMonth } from '@/components/rdo/resumo/RdoStates';
import { useDiasSemExpediente } from '@/hooks/useDiasSemExpediente';
import { RdoImprimirPanel } from '@/components/rdo/RdoImprimirPanel';
import { RdoAtividadesPanel } from '@/components/rdo/RdoAtividadesPanel';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  tipo: string;
  status: string;
  valor_total: number;
  data_inicio: string | null;
  data_termino_real: string | null;
  rdo_habilitado: boolean;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  planejamento: { label: 'Planejamento', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  em_andamento: { label: 'Em andamento', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  concluida: { label: 'Concluída', className: 'bg-emerald-600 text-white border-emerald-700' },
  paralisada: { label: 'Paralisada', className: 'bg-red-100 text-red-800 border-red-200' },
};

function RdoTabs({ obraId }: { obraId: string }) {
  const items = [
    { to: `/obras/${obraId}/rdo/resumo`, label: 'Resumo' },
    { to: `/obras/${obraId}/rdo/imprimir`, label: 'Imprimir RDOs' },
    { to: `/obras/${obraId}/rdo/atividades`, label: 'Relatório de Atividades' },
  ];
  return (
    <nav className="border-b border-home-border bg-home-surface">
      <div className="px-4 md:px-8">
        <ul className="flex gap-6 overflow-x-auto">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-11 items-center border-b-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-home-muted hover:text-foreground',
                  )
                }
              >
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function RdoPageHeader({
  obra,
  openMenu,
  onNewRdo,
}: {
  obra: Obra;
  openMenu: () => void;
  onNewRdo: () => void;
}) {
  const navigate = useNavigate();
  const st = STATUS_LABELS[obra.status] ?? {
    label: obra.status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <header className="border-b border-home-border bg-home-surface">
      <div className="flex flex-col gap-3 px-4 py-5 md:px-8 md:py-6">
        <div className="flex items-start gap-3">
          <ObrasSidebarMenuButton onClick={openMenu} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-home-muted">
              Dashboard / Obras / {obra.nome} / <span className="text-foreground">RDO</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Relatório Diário de Obra (RDO)
              </h1>
              <Badge variant="outline" className={cn('text-xs', st.className)}>
                {st.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-home-muted">
              {obra.nome}
              {obra.municipio ? ` — ${obra.municipio}` : ''}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button variant="outline" onClick={() => navigate('/admin/obras')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Obras
            </Button>
            <Button onClick={onNewRdo}>
              <Plus className="mr-2 h-4 w-4" /> Novo RDO
            </Button>
          </div>
        </div>

        <div className="flex md:hidden">
          <Button onClick={onNewRdo} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Novo RDO
          </Button>
        </div>
      </div>
    </header>
  );
}

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function RDOResumo({
  obra,
  hasEditPermission,
}: {
  obra: Obra;
  hasEditPermission: boolean;
}) {
  const { obraId } = useParams();
  const navigate = useNavigate();

  const initialMonth =
    obra.status === 'concluida' && obra.data_termino_real
      ? new Date(obra.data_termino_real + 'T12:00:00')
      : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [filter, setFilter] = useState<RdoFilterKey>('todos');
  const [view, setView] = useState<RdoView>('mes');
  const [drawerDay, setDrawerDay] = useState<RdoCalendarDay | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const {
    data: counts,
    isLoading: countsLoading,
    isError: countsError,
    refetch: refetchCounts,
  } = useRdoCounts(obraId!, currentMonth);
  const {
    data: calendarData,
    isLoading: calendarLoading,
    isError: calendarError,
    refetch: refetchCalendar,
  } = useRdoCalendar(obraId!, currentMonth);
  const { data: recentReports, isLoading: reportsLoading } = useRdoRecentes(obraId!);
  const { data: recentPhotos, isLoading: photosLoading } = useFotosRecentes(obraId!);
  const { isDiaSemExpediente } = useDiasSemExpediente(obraId!);

  const filteredCalendar = useMemo(() => {
    const arr = calendarData ?? [];
    switch (filter) {
      case 'com_ocorrencia':
        return arr.filter((r) => r.occurrence_count > 0);
      case 'com_fotos':
        return arr.filter((r) => r.photo_count > 0);
      case 'com_comentarios':
        return arr.filter((r) => r.comment_count > 0);
      case 'sem_expediente':
        return arr.filter((r) => isDiaSemExpediente(r.data));
      case 'pendentes':
        return arr.filter((r) => ['preenchendo', 'concluido', 'rascunho'].includes(r.status));
      case 'aprovados':
        return arr.filter((r) => r.status === 'aprovado');
      default:
        return arr;
    }
  }, [calendarData, filter, isDiaSemExpediente]);

  if (calendarError || countsError) {
    return (
      <RdoErrorState
        onRetry={() => {
          refetchCounts();
          refetchCalendar();
        }}
        onBack={() => navigate('/admin/obras')}
      />
    );
  }

  const isLoading = calendarLoading && countsLoading;

  return (
    <div className="space-y-6">
      <RdoSummaryCards counts={counts} isLoading={countsLoading} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <RdoFilterChips value={filter} onChange={setFilter} />
        <RdoViewToggle value={view} onChange={setView} />
      </div>

      {isLoading ? (
        <RdoLoadingState />
      ) : view === 'lista' ? (
        <RdoListView
          obraId={obraId!}
          data={filteredCalendar}
          canEdit={hasEditPermission}
          onOpenDay={(d) => setDrawerDay(d)}
        />
      ) : (calendarData ?? []).length === 0 ? (
        <RdoEmptyMonth
          onCreate={() =>
            navigate(`/obras/${obraId}/rdo/diario?data=${todayIso()}`)
          }
        />
      ) : (
        <RdoCalendar
          obraId={obraId!}
          rdoData={filteredCalendar}
          isLoading={false}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          obraStartDate={obra.data_inicio}
          rdoHabilitado={obra.rdo_habilitado}
          canEditRdo={hasEditPermission}
          obraStatus={obra.status}
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <RecentRdosTable
          obraId={obraId!}
          data={recentReports}
          isLoading={reportsLoading}
          onSeeAll={() => setView('lista')}
        />
        <RecentPhotosGrid
          data={recentPhotos}
          isLoading={photosLoading}
          onOpen={(i) => setLightboxIndex(i)}
        />
      </div>

      <RdoDayDrawer
        obraId={obraId!}
        day={drawerDay}
        open={!!drawerDay}
        onOpenChange={(v) => !v && setDrawerDay(null)}
        canEdit={hasEditPermission}
      />

      <RdoPhotoLightbox
        photos={(recentPhotos ?? []).map((p) => ({
          id: p.id,
          file_url: p.file_url,
          thumb_url: p.thumb_url,
          numero_seq: p.numero_seq,
          data: p.data ?? p.created_at,
        }))}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onOpenChange={(v) => !v && setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

export function RDO() {
  const { obraId } = useParams();
  const navigate = useNavigate();
  const { canEditRDO, canEdit: roleCanEdit, isAdmin, isContratada, isDemo } = useUserRole();
  const { canEditObra, loading: permissionLoading } = useCanEditObra(obraId);
  const hasEditPermission =
    isAdmin || isContratada || isDemo ? canEditRDO : canEditObra;
  const hasViewPermission =
    isAdmin || isContratada || isDemo ? canEditRDO : roleCanEdit;

  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: firstMissing } = useFirstMissingRdoDate(
    obraId!,
    obra?.data_inicio || null,
  );

  useEffect(() => {
    if (!obraId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('obras')
          .select(
            'id, nome, municipio, tipo, status, valor_total, data_inicio, data_termino_real, rdo_habilitado',
          )
          .eq('id', obraId)
          .single();
        if (error) throw error;
        if (alive) setObra(data);
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        toast.error('Erro ao carregar dados da obra');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [obraId]);

  const onNewRdo = () => {
    const targetDate = firstMissing?.firstMissingDate ?? todayIso();
    navigate(`/obras/${obraId}/rdo/diario?data=${targetDate}`);
  };

  if (loading || permissionLoading) {
    return (
      <ObrasLayout
        header={({ openMenu }) => (
          <header className="border-b border-home-border bg-home-surface px-4 py-5 md:px-8 md:py-6">
            <div className="flex items-center gap-3">
              <ObrasSidebarMenuButton onClick={openMenu} />
              <Skeleton className="h-8 w-64" />
            </div>
          </header>
        )}
      >
        <RdoLoadingState />
      </ObrasLayout>
    );
  }

  if (!obra) {
    return (
      <ObrasLayout header={({ openMenu }) => <div />}>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Obra não encontrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              A obra solicitada não foi encontrada ou você não tem permissão para acessá-la.
            </p>
            <Button onClick={() => navigate('/admin/obras')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Obras
            </Button>
          </CardContent>
        </Card>
      </ObrasLayout>
    );
  }

  if (!hasViewPermission) {
    return (
      <ObrasLayout header={({ openMenu }) => <div />}>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sem permissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Você não tem permissão para acessar o RDO desta obra.
            </p>
            <Button onClick={() => navigate('/admin/obras')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Obras
            </Button>
          </CardContent>
        </Card>
      </ObrasLayout>
    );
  }

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <>
          <RdoPageHeader obra={obra} openMenu={openMenu} onNewRdo={onNewRdo} />
          <RdoTabs obraId={obraId!} />
        </>
      )}
    >
      <Routes>
        <Route index element={<Navigate to="resumo" replace />} />
        <Route
          path="resumo"
          element={<RDOResumo obra={obra} hasEditPermission={hasEditPermission} />}
        />
        <Route
          path="imprimir"
          element={<RdoImprimirPanel obraId={obraId!} obraNome={obra.nome} />}
        />
        <Route
          path="atividades"
          element={<RdoAtividadesPanel obraId={obraId!} obraNome={obra.nome} />}
        />
        {/* Rotas legadas — preservam URLs, redirecionam ao Resumo */}
        <Route path="*" element={<Navigate to="resumo" replace />} />
      </Routes>
    </ObrasLayout>
  );
}
