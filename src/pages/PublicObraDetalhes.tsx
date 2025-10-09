import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Building2, DollarSign, TrendingUp, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as LoadingStates from '@/components/LoadingStates';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export function PublicObraDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObra = async () => {
      if (!id) return;
      
      try {
        const { data, error: fetchError } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Obra não encontrada ou não é pública');
        
        setObra(data);
      } catch (err: any) {
        console.error('Erro ao carregar obra:', err);
        setError(err.message || 'Erro ao carregar dados da obra');
      } finally {
        setLoading(false);
      }
    };

    fetchObra();
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

  const valorTotal = obra.valor_total + (obra.valor_aditivado || 0);
  const porcentagemExecucao = valorTotal > 0 ? ((obra.valor_executado || 0) / valorTotal) * 100 : 0;
  const fotos = (obra.fotos as string[]) || [];

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
          title={obra.nome}
          subtitle="Detalhes da Obra"
        />

        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Município</p>
                <p className="text-base">{obra.municipio}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p className="text-base">{obra.tipo}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={statusColors[obra.status] || 'bg-gray-100 text-gray-800'}>
                  {statusLabels[obra.status] || obra.status}
                </Badge>
              </div>
            </div>

            {obra.empresa_responsavel && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa Responsável</p>
                  <p className="text-base">{obra.empresa_responsavel}</p>
                </div>
              </div>
            )}

            {obra.data_inicio && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
                  <p className="text-base">
                    {format(new Date(obra.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {obra.data_previsao_termino && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Previsão de Término</p>
                  <p className="text-base">
                    {format(new Date(obra.data_previsao_termino), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(valorTotal)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Executado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(obra.valor_executado || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Execução</p>
                <p className="text-2xl font-bold text-orange-600">
                  {porcentagemExecucao.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Galeria de Fotos ({fotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {fotos.map((foto, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={foto} 
                      alt={`Foto ${index + 1} da obra`}
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

export default PublicObraDetalhes;
