import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, FileText, CheckSquare, AlertTriangle, MessageSquare, Camera, Video, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as LoadingStates from '@/components/LoadingStates';
import { useRdoCounts, useRdoCalendar, useRdoRecentes, useFotosRecentes } from '@/hooks/useRdoData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PublicRDO() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data: counts } = useRdoCounts(id!, currentMonth);
  const { data: calendarData = [] } = useRdoCalendar(id!, currentMonth);
  const { data: rdosRecentes = [] } = useRdoRecentes(id!, 5);
  const { data: fotosRecentes = [] } = useFotosRecentes(id!, 6);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        const { data: obraData, error: obraError } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (obraError) throw obraError;
        if (!obraData) throw new Error('Obra não encontrada ou não é pública');
        
        setObra(obraData);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados da obra');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <PublicHeader>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PublicHeader>
    );
  }

  if (error || !obra) {
    return (
      <PublicHeader>
        <div className="container mx-auto py-6">
          <LoadingStates.ErrorState 
            message={error || 'Obra não encontrada'} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </PublicHeader>
    );
  }

  const datesWithReports = new Set(
    calendarData.map((day) => format(new Date(day.data), 'yyyy-MM-dd'))
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateStr = format(date, 'yyyy-MM-dd');
      if (datesWithReports.has(dateStr)) {
        navigate(`/public/obras/${id}/rdo/diario?data=${dateStr}`);
      }
    }
  };

  return (
    <PublicHeader>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/public/obras/lista">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>

        <PageHeader
          title={`RDO - ${obra.nome}`}
          subtitle={`Relatório Diário de Obra - ${obra.municipio}`}
        />

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-sm">Relatórios</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.relatorios || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-500" />
                <CardTitle className="text-sm">Atividades</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.atividades || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-sm">Ocorrências</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.ocorrencias || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-sm">Comentários</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.comentarios || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-sm">Fotos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.fotos || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-sm">Vídeos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts?.videos || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendário */}
          <Card>
            <CardHeader>
              <CardTitle>Calendário de RDOs</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={ptBR}
                className="rounded-md border"
                modifiers={{
                  hasReport: (date) => datesWithReports.has(format(date, 'yyyy-MM-dd')),
                }}
                modifiersStyles={{
                  hasReport: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Clique nas datas destacadas para visualizar os RDOs
              </p>
            </CardContent>
          </Card>

          {/* RDOs Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>RDOs Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rdosRecentes.length > 0 ? (
                  rdosRecentes.map((rdo) => (
                    <div key={rdo.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Link to={`/public/obras/${id}/rdo/diario?data=${rdo.data}`} className="block">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium">RDO Nº {rdo.numero_seq}</p>
                          <Badge variant={rdo.status === 'aprovado' ? 'default' : 'secondary'}>
                            {rdo.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(rdo.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{rdo.activity_count || 0} atividades</span>
                          <span>{rdo.photo_count || 0} fotos</span>
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum RDO cadastrado ainda.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fotos Recentes */}
        {fotosRecentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fotos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {fotosRecentes.map((foto) => (
                  <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={foto.thumb_url || foto.file_url}
                      alt="Foto do RDO"
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicHeader>
  );
}

export default PublicRDO;
