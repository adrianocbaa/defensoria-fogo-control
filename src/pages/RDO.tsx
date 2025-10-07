import { useEffect, useState } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RDOSidebar } from '@/components/RDOSidebar';
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
import { ArrowLeft, Lock, FileText } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  tipo: string;
  status: string;
  valor_total: number;
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

function RDOResumo() {
  return <PlaceholderSection 
    title="Resumo da Obra" 
    description="Visão geral do RDO e indicadores principais"
    icon={FileText}
  />;
}

function RDODiario() {
  return <PlaceholderSection 
    title="Diário de Obra" 
    description="Registro diário de atividades executadas"
    icon={FileText}
  />;
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
  const { canEdit } = useUserRole();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obraId) return;

    const fetchObra = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('obras')
          .select('id, nome, municipio, tipo, status, valor_total')
          .eq('id', obraId)
          .single();

        if (error) throw error;
        setObra(data);

        // Load last visited section
        const lastSection = localStorage.getItem(`rdo_last_section_${obraId}`);
        if (lastSection && window.location.pathname === `/obras/${obraId}/rdo`) {
          navigate(`/obras/${obraId}/rdo/${lastSection}`, { replace: true });
        }
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

  if (!canEdit) {
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
            <Route path="resumo" element={<RDOResumo />} />
            <Route path="diario" element={<RDODiario />} />
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
  );
}
