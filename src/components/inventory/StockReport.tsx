import { useState } from 'react';
import { Search, Filter, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaterials } from '@/hooks/useMaterials';

export function StockReport() {
  const { materials, loading } = useMaterials();
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUnit = unitFilter === 'all' || material.unit === unitFilter;
    
    const isLowStock = material.current_stock <= material.minimum_stock;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'low' && isLowStock) ||
                         (statusFilter === 'normal' && !isLowStock);

    return matchesSearch && matchesUnit && matchesStatus;
  });

  const getStockStatus = (material: any) => {
    if (material.current_stock <= material.minimum_stock) {
      return { variant: 'destructive' as const, label: 'Crítico', icon: AlertTriangle };
    }
    if (material.current_stock <= material.minimum_stock * 1.5) {
      return { variant: 'secondary' as const, label: 'Atenção', icon: null };
    }
    return { variant: 'default' as const, label: 'Normal', icon: null };
  };

  const exportToCSV = () => {
    const headers = ['Código', 'Descrição', 'Unidade', 'Estoque Atual', 'Estoque Mínimo', 'Status'];
    const rows = filteredMaterials.map(material => [
      material.code,
      material.description,
      material.unit,
      material.current_stock,
      material.minimum_stock,
      getStockStatus(material).label
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Estoque</h1>
          <p className="text-muted-foreground">
            Visualize e analise o estoque atual de todos os materiais
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os materiais por critérios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                <SelectItem value="KG">KG - Quilograma</SelectItem>
                <SelectItem value="M">M - Metro</SelectItem>
                <SelectItem value="LITRO">LITRO - Litro</SelectItem>
                <SelectItem value="PC">PC - Peça</SelectItem>
                <SelectItem value="CX">CX - Caixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredMaterials.length}</div>
            <p className="text-xs text-muted-foreground">Materiais encontrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredMaterials.filter(m => m.current_stock > m.minimum_stock * 1.5).length}
            </div>
            <p className="text-xs text-muted-foreground">Com estoque normal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredMaterials.filter(m => m.current_stock > m.minimum_stock && m.current_stock <= m.minimum_stock * 1.5).length}
            </div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {filteredMaterials.filter(m => m.current_stock <= m.minimum_stock).length}
            </div>
            <p className="text-xs text-muted-foreground">Estoque crítico</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório Detalhado</CardTitle>
          <CardDescription>
            {filteredMaterials.length} material(is) listado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead>Estoque Mínimo</TableHead>
                <TableHead>Diferença</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => {
                const status = getStockStatus(material);
                const difference = material.current_stock - material.minimum_stock;
                return (
                  <TableRow key={material.id} className={
                    material.current_stock <= material.minimum_stock ? 'bg-red-50' : ''
                  }>
                    <TableCell className="font-medium">{material.code}</TableCell>
                    <TableCell>{material.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.unit}</Badge>
                    </TableCell>
                    <TableCell>{material.current_stock}</TableCell>
                    <TableCell>{material.minimum_stock}</TableCell>
                    <TableCell className={difference < 0 ? 'text-red-600' : 'text-green-600'}>
                      {difference > 0 ? '+' : ''}{difference}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        {status.icon && <status.icon className="h-3 w-3" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredMaterials.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum material encontrado com os filtros aplicados.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}