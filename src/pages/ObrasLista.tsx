import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PageHeader } from '@/components/PageHeader';
import { useObras } from '@/hooks/useObras';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import * as LoadingStates from '@/components/LoadingStates';
import { Map, List, Search } from 'lucide-react';
import { formatCurrency, formatPercentageValue } from '@/lib/formatters';

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

export function ObrasLista() {
  const { obras, loading, error, refetch } = useObras();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredObras, setFilteredObras] = useState(obras);

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
    return <LoadingStates.TableSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <LoadingStates.ErrorState 
          message={error} 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <PermissionGuard requiresEdit>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Lista de Obras"
          subtitle="Visualização em tabela de todas as obras públicas"
          actions={
            <Button asChild variant="outline">
              <Link to="/obras">
                <Map className="h-4 w-4 mr-2" />
                Ver como Mapa
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Obras Cadastradas ({filteredObras.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
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
                  {searchTerm ? 'Nenhuma obra encontrada com os critérios de busca.' : 'Nenhuma obra cadastrada ainda.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">🏗️ Nome da Obra</TableHead>
                      <TableHead>📍 Município</TableHead>
                      <TableHead>📅 Status</TableHead>
                      <TableHead className="text-right">💰 Valor Final</TableHead>
                      <TableHead className="text-right">💸 Valor Pago</TableHead>
                      <TableHead className="text-right">📈 Execução (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObras.map((obra) => {
                      const valorFinal = obra.valor + (obra.valor_aditivado || 0);
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
                          <TableCell>
                            <Badge className={statusColors[obra.status] || 'bg-gray-100 text-gray-800'}>
                              {statusLabels[obra.status] || obra.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(valorFinal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(obra.valorExecutado)}
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
    </PermissionGuard>
  );
}