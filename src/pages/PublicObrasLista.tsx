import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import * as LoadingStates from '@/components/LoadingStates';
import { Map, List, Search, Eye, FileText, Link as LinkIcon } from 'lucide-react';
import { formatCurrency, formatPercentageValue } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { type Obra } from '@/data/mockObras';
import { toast } from 'sonner';

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

export default function PublicObrasLista() {
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredObras, setFilteredObras] = useState<any[]>([]);

  useEffect(() => {
    const fetchPublicObras = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('obras')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        const mappedData: any[] = (data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          municipio: item.municipio,
          tipo: item.tipo,
          status: item.status,
          coordenadas: [item.coordinates_lat, item.coordinates_lng] as [number, number],
          valor: item.valor_total,
          valorExecutado: item.valor_executado || 0,
          porcentagemExecucao: item.porcentagem_execucao || 0,
          dataInicio: item.data_inicio,
          previsaoTermino: item.data_previsao_termino || '',
          empresaResponsavel: item.empresa_responsavel,
          secretariaResponsavel: 'Defensoria Pública de Mato Grosso',
          descricao: item.descricao || '',
          fotos: item.fotos as string[] || [],
          documentos: item.documentos as any[] || [],
          valor_aditivado: item.valor_aditivado || 0
        }));
        
        setObras(mappedData);
      } catch (err) {
        console.error('Erro ao carregar obras públicas:', err);
        setError('Erro ao carregar dados das obras');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicObras();
  }, []);

  // Filtrar obras quando mudar o termo de busca ou as obras
  useEffect(() => {
    if (!searchTerm) {
      setFilteredObras(obras);
    } else {
      const filtered = obras.filter(obra =>
        obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredObras(filtered);
    }
  }, [searchTerm, obras]);

  if (loading) {
    return (
      <PublicHeader>
        <div className="container mx-auto py-6">
          <LoadingStates.TableSkeleton />
        </div>
      </PublicHeader>
    );
  }

  if (error) {
    return (
      <PublicHeader>
        <div className="container mx-auto py-6">
          <LoadingStates.ErrorState 
            message={error} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </PublicHeader>
    );
  }

  return (
    <PublicHeader>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Gerenciar Obras"
          subtitle="Visualize e gerencie todas as obras públicas"
          actions={
            <Button asChild variant="outline">
              <Link to="/public/obras">
                <Map className="h-4 w-4 mr-2" />
                Mapa de Obras
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Lista de Obras
            </CardTitle>
            <div className="flex items-center space-x-2 pt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, município ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredObras.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhuma obra encontrada com os critérios de busca.' : 'Nenhuma obra pública cadastrada ainda.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Nome</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Execução</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObras.map((obra) => {
                      const valorAditivado = (obra as any).valor_aditivado || 0;
                      const valorFinal = obra.valor + valorAditivado;
                      const porcentagemExecucao = valorFinal > 0 ? (obra.valorExecutado / valorFinal) * 100 : 0;
                      
                      return (
                        <TableRow key={obra.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-semibold">{obra.nome}</div>
                              <div className="text-sm text-muted-foreground">{obra.tipo}</div>
                            </div>
                          </TableCell>
                          <TableCell>{obra.municipio}</TableCell>
                          <TableCell>{obra.tipo}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[obra.status] || 'bg-gray-100 text-gray-800'}>
                              {statusLabels[obra.status] || obra.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(valorFinal)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <span className={`font-medium ${
                                porcentagemExecucao >= 100 ? 'text-green-600' : 
                                porcentagemExecucao >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {formatPercentageValue(Number(porcentagemExecucao.toFixed(2)))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Compartilhar link"
                                onClick={() => {
                                  const url = `${window.location.origin}/public/obras/${obra.id}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Link copiado para a área de transferência!');
                                }}
                              >
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Painel Financeiro"
                                asChild
                              >
                                <Link to={`/public/obras/${obra.id}/medicao`}>
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Visualizar detalhes"
                                asChild
                              >
                                <Link to={`/public/obras/${obra.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicHeader>
  );
}
