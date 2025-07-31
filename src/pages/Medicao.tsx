import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import * as LoadingStates from '@/components/LoadingStates';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado?: number;
}

export function Medicao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchObra();
    }
  }, [id]);

  const fetchObra = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setObra(data);
    } catch (error) {
      console.error('Erro ao carregar obra:', error);
      toast.error('Erro ao carregar obra');
      navigate('/admin/obras');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calcularPorcentagemExecucao = () => {
    if (!obra) return 0;
    const valorFinal = Number(obra.valor_total) + Number(obra.valor_aditivado || 0);
    const valorPago = Number(obra.valor_executado || 0);
    return valorFinal > 0 ? (valorPago / valorFinal) * 100 : 0;
  };

  if (loading) {
    return <LoadingStates.TableSkeleton />;
  }

  if (!obra) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Obra não encontrada</p>
          <Button onClick={() => navigate('/admin/obras')} className="mt-4">
            Voltar para Obras
          </Button>
        </div>
      </div>
    );
  }

  const valorFinal = Number(obra.valor_total) + Number(obra.valor_aditivado || 0);
  const valorExecutado = Number(obra.valor_executado || 0);
  const porcentagemExecucao = calcularPorcentagemExecucao();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Medição"
        subtitle={`Análise de medição para: ${obra.nome}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/obras')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Original</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(obra.valor_total)}</div>
            <p className="text-xs text-muted-foreground">
              Valor inicial da obra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Aditivado</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(obra.valor_aditivado || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Aditivos contratuais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorFinal)}</div>
            <p className="text-xs text-muted-foreground">
              Original + Aditivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Executado</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorExecutado)}</div>
            <p className="text-xs text-muted-foreground">
              Valor já executado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Restante</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorFinal - valorExecutado)}</div>
            <p className="text-xs text-muted-foreground">
              Valor a executar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Execução</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{porcentagemExecucao.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Percentual executado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Nome:</span>
              <span>{obra.nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Município:</span>
              <span>{obra.municipio}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor Original:</span>
              <span>{formatCurrency(obra.valor_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor com Aditivos:</span>
              <span>{formatCurrency(valorFinal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor Executado:</span>
              <span>{formatCurrency(valorExecutado)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold">Percentual de Execução:</span>
              <span className="font-bold">{porcentagemExecucao.toFixed(2)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}