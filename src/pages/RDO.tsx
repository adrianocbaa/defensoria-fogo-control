import { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleHeader } from '@/components/SimpleHeader';
import { RDOSidebar } from '@/components/RDOSidebar';
import { RdoCalendar } from '@/components/rdo/RdoCalendar';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

function RDOResumo({ obraStartDate, rdoHabilitado = true }: { obraStartDate?: string | null; rdoHabilitado?: boolean }) {
  const { obraId } = useParams();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: counts, isLoading: countsLoading } = useRdoCounts(obraId!, currentMonth);
  const { data: calendarData, isLoading: calendarLoading } = useRdoCalendar(obraId!, currentMonth);
  const { data: recentReports, isLoading: reportsLoading } = useRdoRecentes(obraId!);
  const { data: recentPhotos, isLoading: photosLoading } = useFotosRecentes(obraId!);

  const counterCards = [
    { title: 'Relatórios', value: counts?.relatorios || 0, icon: ClipboardCheck, color: 'text-blue-500' },
    { title: 'Ocorrências', value: counts?.ocorrencias || 0, icon: AlertTriangle, color: 'text-red-500' },
    { title: 'Comentários', value: counts?.comentarios || 0, icon: MessageSquareText, color: 'text-purple-500' },
    { title: 'Fotos', value: counts?.fotos || 0, icon: Camera, color: 'text-orange-500' },
    { title: 'Vídeos', value: counts?.videos || 0, icon: Video, color: 'text-pink-500' },
  ];

  const statusConfig = {
    rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
    preenchendo: { label: 'Preenchendo', color: 'bg-orange-100 text-orange-800' },
    concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800' },
    reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="space-y-6">
      {/* Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {counterCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {countsLoading ? '-' : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar */}
      <RdoCalendar
        obraId={obraId!}
        rdoData={calendarData || []}
        isLoading={calendarLoading}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        obraStartDate={obraStartDate}
        rdoHabilitado={rdoHabilitado}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relatórios Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentReports && recentReports.length > 0 ? (
              <div className="space-y-2">
                {recentReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => navigate(`/obras/${obraId}/rdo/diario?data=${report.data}&id=${report.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        #{report.numero_seq}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(report.data), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusConfig[report.status as keyof typeof statusConfig]?.color}>
                            {statusConfig[report.status as keyof typeof statusConfig]?.label}
                          </Badge>
                          {report.photo_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {report.photo_count} fotos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Nenhum relatório encontrado. Clique no botão "+" no calendário para criar seu primeiro RDO.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fotos Recentes</CardTitle>
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
                  Nenhuma foto registrada ainda. As fotos aparecem aqui após serem adicionadas aos RDOs.
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
  const { canEditRDO } = useUserRole();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;

    const fetchObra = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('obras')
          .select('id, nome, municipio, tipo, status, valor_total, data_inicio, rdo_habilitado')
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

  if (loading) {
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

  if (!canEditRDO) {
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
            <Route path="resumo" element={<RDOResumo obraStartDate={obra.data_inicio} rdoHabilitado={obra.rdo_habilitado} />} />
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
