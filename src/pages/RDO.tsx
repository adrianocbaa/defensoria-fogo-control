import { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleHeader } from '@/components/SimpleHeader';
import { RDOSidebar } from '@/components/RDOSidebar';
import { RdoCalendar } from '@/components/rdo/RdoCalendar';
import { NovoRdoDatePicker } from '@/components/rdo/NovoRdoDatePicker';
import { RdoDayDrawer } from '@/components/rdo/RdoDayDrawer';
import { RdoListView } from '@/components/rdo/RdoListView';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RdoCalendarDay } from '@/hooks/useRdoData';
import {
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, 
  Lock, 
  FileText,
  ClipboardCheck,
  ActivitySquare,
  AlertTriangle,
  MessageSquareText,
  Camera,
  Video
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanEditObra } from '@/hooks/useCanEditObra';
import { toast } from 'sonner';
import { useRdoCounts, useRdoCalendar, useRdoRecentes, useFotosRecentes } from '@/hooks/useRdoData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

// Placeholder components for each section
function PlaceholderSection({ 
  title, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Esta seção será habilitada nas próximas etapas de desenvolvimento. 
            Em breve você poderá registrar e gerenciar {title.toLowerCase()}.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

type CalendarFilter = 'todos' | 'ocorrencia' | 'fotos' | 'comentarios' | 'sem_expediente' | 'pendentes' | 'aprovados';

const FILTER_CHIPS: { id: CalendarFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'ocorrencia', label: 'Com ocorrência' },
  { id: 'fotos', label: 'Com fotos' },
  { id: 'comentarios', label: 'Com comentários' },
  { id: 'sem_expediente', label: 'Sem expediente' },
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'aprovados', label: 'Aprovados' },
];

function RDOResumo({ obraStartDate, obraTerminoReal, rdoHabilitado = true, canEditRdo = true, obraStatus }: { obraStartDate?: string | null; obraTerminoReal?: string | null; rdoHabilitado?: boolean; canEditRdo?: boolean; obraStatus?: string }) {
  const { obraId } = useParams();
  const navigate = useNavigate();
  const initialMonth = obraStatus === 'concluida' && obraTerminoReal
    ? new Date(obraTerminoReal + 'T12:00:00')
    : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const [filter, setFilter] = useState<CalendarFilter>('todos');
  const [drawerDay, setDrawerDay] = useState<RdoCalendarDay | null>(null);

  const { data: counts, isLoading: countsLoading } = useRdoCounts(obraId!, currentMonth);
  const { data: calendarData, isLoading: calendarLoading } = useRdoCalendar(obraId!, currentMonth);
  const { data: recentReports, isLoading: reportsLoading } = useRdoRecentes(obraId!);
  const { data: recentPhotos, isLoading: photosLoading } = useFotosRecentes(obraId!);

  const filteredData = (calendarData || []).filter((d) => {
    switch (filter) {
      case 'ocorrencia': return d.occurrence_count > 0;
      case 'fotos': return d.photo_count > 0;
      case 'comentarios': return d.comment_count > 0;
      case 'pendentes': return d.status === 'rascunho' || d.status === 'preenchendo';
      case 'aprovados': return d.status === 'aprovado';
      case 'sem_expediente': return false; // visual filter; calendar mostra dias marcados independentemente
      default: return true;
    }
  });

  const counterCards = [
    { title: 'Relatórios', value: counts?.relatorios || 0, icon: ClipboardCheck, tint: 'bg-slate-100 text-slate-600' },
    { title: 'Ocorrências', value: counts?.ocorrencias || 0, icon: AlertTriangle, tint: 'bg-amber-100 text-amber-600' },
    { title: 'Comentários', value: counts?.comentarios || 0, icon: MessageSquareText, tint: 'bg-slate-100 text-slate-600' },
    { title: 'Fotos', value: counts?.fotos || 0, icon: Camera, tint: 'bg-slate-100 text-slate-600' },
    { title: 'Vídeos', value: counts?.videos || 0, icon: Video, tint: 'bg-slate-100 text-slate-600' },
  ];

  const statusConfig = {
    rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    preenchendo: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
    concluido: { label: 'Em análise', color: 'bg-blue-100 text-blue-800' },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
    reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {canEditRdo && obraStatus !== 'concluida' && (
          <NovoRdoDatePicker obraId={obraId!} obraStartDate={obraStartDate} />
        )}
      </div>

      {/* Counter Cards - horizontal layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {counterCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", card.tint)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className="text-2xl font-bold leading-tight">
                    {countsLoading ? '-' : card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground/70 border-border hover:bg-accent"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Calendar / List with header (Mês/Lista) */}
      {/* Toggle Mês/Lista */}
      <div className="flex items-center justify-end">
        <Tabs value={view} onValueChange={(v) => setView(v as 'mes' | 'lista')}>
          <TabsList>
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'mes' ? (
        <RdoCalendar
          obraId={obraId!}
          rdoData={filteredData}
          isLoading={calendarLoading}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          obraStartDate={obraStartDate}
          rdoHabilitado={rdoHabilitado}
          canEditRdo={canEditRdo}
          obraStatus={obraStatus}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">RDOs do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <RdoListView
              days={filteredData}
              isLoading={calendarLoading}
              onSelectDay={setDrawerDay}
            />
          </CardContent>
        </Card>
      )}

      <RdoDayDrawer
        obraId={obraId!}
        day={drawerDay}
        open={!!drawerDay}
        onOpenChange={(open) => !open && setDrawerDay(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports as table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Relatórios Recentes</CardTitle>
            <button
              onClick={() => setView('lista')}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todos
            </button>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentReports && recentReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 pr-3">RDO</th>
                      <th className="text-left font-medium py-2 pr-3">Data</th>
                      <th className="text-left font-medium py-2 pr-3">Status</th>
                      <th className="text-left font-medium py-2 pr-3">Fotos</th>
                      <th className="text-right font-medium py-2 pl-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((report) => {
                      const sc = statusConfig[report.status as keyof typeof statusConfig];
                      return (
                        <tr key={report.id} className="border-b last:border-0 hover:bg-accent/40">
                          <td className="py-2.5 pr-3 font-medium">#{report.numero_seq}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground">
                            {format(new Date(report.data + 'T12:00:00'), "dd/MM/yyyy")}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge className={cn("font-medium", sc?.color)}>{sc?.label}</Badge>
                          </td>
                          <td className="py-2.5 pr-3">{report.photo_count}</td>
                          <td className="py-2.5 pl-3 text-right">
                            <button
                              onClick={() => navigate(`/obras/${obraId}/rdo/diario?data=${report.data}&id=${report.id}`)}
                              className="text-primary text-xs font-medium hover:underline"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Nenhum relatório encontrado. Clique em "+ Novo RDO" para criar o primeiro.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Photos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Fotos Recentes</CardTitle>
            <span className="text-xs font-medium text-primary">Ver galeria</span>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="aspect-square w-full" />
              </div>
            ) : recentPhotos && recentPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {recentPhotos.slice(0, 9).map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={photo.thumb_url || photo.file_url}
                      alt="Foto do RDO"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma foto ainda.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RDOEquipe() {
  return <PlaceholderSection 
    title="Equipe" 
    description="Registro de colaboradores e horas trabalhadas"
    icon={FileText}
  />;
}

function RDOEquipamentos() {
  return <PlaceholderSection 
    title="Equipamentos" 
    description="Controle de equipamentos utilizados na obra"
    icon={FileText}
  />;
}

function RDOMateriais() {
  return <PlaceholderSection 
    title="Materiais" 
    description="Registro de entrada e consumo de materiais"
    icon={FileText}
  />;
}

function RDOClima() {
  return <PlaceholderSection 
    title="Condições Climáticas" 
    description="Registro das condições do tempo durante a execução"
    icon={FileText}
  />;
}

function RDOFotos() {
  return <PlaceholderSection 
    title="Fotos" 
    description="Registro fotográfico do andamento da obra"
    icon={FileText}
  />;
}

function RDOOcorrencias() {
  return <PlaceholderSection 
    title="Ocorrências" 
    description="Registro de eventos e situações relevantes"
    icon={FileText}
  />;
}

function RDOSeguranca() {
  return <PlaceholderSection 
    title="Segurança do Trabalho" 
    description="Registros e procedimentos de segurança"
    icon={FileText}
  />;
}

function RDOMedicoes() {
  return <PlaceholderSection 
    title="Medições" 
    description="Quantitativos executados e medições"
    icon={FileText}
  />;
}

function RDOAssinaturas() {
  return <PlaceholderSection 
    title="Assinaturas" 
    description="Validação e assinaturas dos responsáveis"
    icon={FileText}
  />;
}

function RDOConfig() {
  return <PlaceholderSection 
    title="Configurações" 
    description="Preferências e configurações do RDO"
    icon={FileText}
  />;
}

export function RDO() {
  const { obraId } = useParams();
  const navigate = useNavigate();
  const { canEditRDO, canEdit: roleCanEdit, isAdmin, isContratada, isDemo } = useUserRole();
  const { canEditObra, loading: permissionLoading } = useCanEditObra(obraId);
  // Permissão de edição: contratada/admin/demo seguem regra atual; fiscais editam apenas quando podem editar a obra
  const hasEditPermission = isAdmin || isContratada || isDemo ? canEditRDO : canEditObra;
  // Permissão de visualização: fiscal (editor/gm) pode visualizar mesmo sem vínculo com a obra
  const hasViewPermission = isAdmin || isContratada || isDemo ? canEditRDO : roleCanEdit;
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;

    const fetchObra = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('obras')
          .select('id, nome, municipio, tipo, status, valor_total, data_inicio, data_termino_real, rdo_habilitado')
          .eq('id', obraId)
          .single();

        if (error) throw error;
        setObra(data);
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        toast.error('Erro ao carregar dados da obra');
      } finally {
        setLoading(false);
      }
    };

    fetchObra();
  }, [obraId, navigate]);

  if (loading || permissionLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-6">
            <Skeleton className="h-[600px] w-[260px]" />
            <Skeleton className="h-[600px] flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Obra não encontrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              A obra solicitada não foi encontrada ou você não tem permissão para acessá-la.
            </p>
            <Button onClick={() => navigate('/admin/obras')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Obras
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasViewPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sem permissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar o RDO desta obra.
              Apenas o fiscal responsável ou usuários com acesso atribuído podem editar.
            </p>
            <Button onClick={() => navigate('/admin/obras')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Obras
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    planejamento: 'bg-blue-100 text-blue-800',
    em_andamento: 'bg-yellow-100 text-yellow-800',
    concluida: 'bg-green-100 text-green-800',
    paralisada: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    planejamento: 'Planejamento',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    paralisada: 'Paralisada',
  };

  return (
    <SimpleHeader>
      <div className="min-h-screen w-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto py-4">
          <div className="flex flex-col gap-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/admin/obras">Obras</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/admin/obras`}>{obra.nome}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>RDO</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Relatório Diário de Obra (RDO)</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-muted-foreground">{obra.nome}</p>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-muted-foreground">{obra.municipio}</p>
                  <span className="text-muted-foreground">•</span>
                  <Badge className={statusColors[obra.status]}>
                    {statusLabels[obra.status]}
                  </Badge>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => navigate('/admin/obras')}
                className="hidden md:flex min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Obras
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full">
        <RDOSidebar />
        
        <main className="flex-1 container mx-auto py-6 px-4 lg:px-6">
          <Routes>
            <Route index element={<Navigate to="resumo" replace />} />
            <Route path="resumo" element={<RDOResumo obraStartDate={obra.data_inicio} obraTerminoReal={obra.data_termino_real} rdoHabilitado={obra.rdo_habilitado} canEditRdo={hasEditPermission} obraStatus={obra.status} />} />
            <Route path="equipe" element={<RDOEquipe />} />
            <Route path="equipamentos" element={<RDOEquipamentos />} />
            <Route path="materiais" element={<RDOMateriais />} />
            <Route path="clima" element={<RDOClima />} />
            <Route path="fotos" element={<RDOFotos />} />
            <Route path="ocorrencias" element={<RDOOcorrencias />} />
            <Route path="seguranca" element={<RDOSeguranca />} />
            <Route path="medicoes" element={<RDOMedicoes />} />
            <Route path="assinaturas" element={<RDOAssinaturas />} />
            <Route path="config" element={<RDOConfig />} />
          </Routes>
        </main>
      </div>
      </div>
    </SimpleHeader>
  );
}
