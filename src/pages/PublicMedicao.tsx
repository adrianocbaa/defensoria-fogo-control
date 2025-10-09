import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as LoadingStates from '@/components/LoadingStates';
import { formatCurrency } from '@/lib/formatters';

export function PublicMedicao() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<any>(null);
  const [orcamentoItems, setOrcamentoItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Buscar obra
        const { data: obraData, error: obraError } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (obraError) throw obraError;
        if (!obraData) throw new Error('Obra não encontrada ou não é pública');
        
        setObra(obraData);

        // Buscar itens do orçamento
        const { data: itemsData, error: itemsError } = await supabase
          .from('orcamento_items')
          .select('*')
          .eq('obra_id', id)
          .order('ordem', { ascending: true });

        if (itemsError) throw itemsError;
        setOrcamentoItems(itemsData || []);
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

  const valorTotal = obra.valor_total + (obra.valor_aditivado || 0);
  const porcentagemExecucao = valorTotal > 0 ? ((obra.valor_executado || 0) / valorTotal) * 100 : 0;

  // Agrupar itens por nível
  const itensPrimeiroNivel = orcamentoItems.filter(item => item.nivel === 1);

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
          subtitle={`Painel Físico-Financeiro - ${obra.municipio}`}
        />

        {/* Resumo Financeiro */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(valorTotal)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Executado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(obra.valor_executado || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold text-orange-600">
                  {porcentagemExecucao.toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo do Orçamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo do Orçamento ({itensPrimeiroNivel.length} itens principais)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itensPrimeiroNivel.length > 0 ? (
              <div className="space-y-2">
                {itensPrimeiroNivel.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{item.codigo} - {item.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantidade} {item.unidade}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.valor_total)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item de orçamento cadastrado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicHeader>
  );
}

export default PublicMedicao;
