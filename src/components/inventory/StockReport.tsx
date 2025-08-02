import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Filter, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MaterialStock {
  id: string;
  code: string;
  description: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
}

export function StockReport() {
  const [materials, setMaterials] = useState<MaterialStock[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const units = ['KG', 'M', 'LITRO', 'PC', 'CX'];
  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'low', label: 'Estoque Baixo' },
    { value: 'attention', label: 'Atenção' },
    { value: 'ok', label: 'OK' }
  ];

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [materials, unitFilter, statusFilter]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('code');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...materials];

    // Filter by unit
    if (unitFilter !== 'all') {
      filtered = filtered.filter(material => material.unit === unitFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(material => {
        const status = getStockStatus(material.current_stock, material.minimum_stock);
        if (statusFilter === 'low') return status.type === 'low';
        if (statusFilter === 'attention') return status.type === 'attention';
        if (statusFilter === 'ok') return status.type === 'ok';
        return true;
      });
    }

    setFilteredMaterials(filtered);
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum) {
      return { 
        type: 'low', 
        label: 'Baixo', 
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    if (current <= minimum * 1.5) {
      return { 
        type: 'attention', 
        label: 'Atenção', 
        variant: 'secondary' as const,
        icon: null
      };
    }
    return { 
      type: 'ok', 
      label: 'OK', 
      variant: 'default' as const,
      icon: null
    };
  };

  const exportReport = () => {
    const csvData = [
      ['Código', 'Descrição', 'Unidade', 'Estoque Atual', 'Estoque Mínimo', 'Status'],
      ...filteredMaterials.map(material => {
        const status = getStockStatus(material.current_stock, material.minimum_stock);
        return [
          material.code,
          material.description,
          material.unit,
          material.current_stock,
          material.minimum_stock,
          status.label
        ];
      })
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio-estoque.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso"
    });
  };

  if (loading) {
    return <div className="p-6">Carregando relatório...</div>;
  }

  const lowStockCount = materials.filter(m => m.current_stock <= m.minimum_stock).length;
  const attentionCount = materials.filter(m => 
    m.current_stock > m.minimum_stock && m.current_stock <= m.minimum_stock * 1.5
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Estoque</h2>
          <p className="text-muted-foreground">Visão completa dos níveis de estoque</p>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Necessita Atenção</p>
                <p className="text-2xl font-bold text-orange-600">{attentionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead className="text-center">Estoque Mínimo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">% do Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum material encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const status = getStockStatus(material.current_stock, material.minimum_stock);
                    const percentage = material.minimum_stock > 0 
                      ? Math.round((material.current_stock / material.minimum_stock) * 100)
                      : 100;

                    return (
                      <TableRow 
                        key={material.id}
                        className={status.type === 'low' ? 'bg-destructive/10' : ''}
                      >
                        <TableCell className="font-medium">{material.code}</TableCell>
                        <TableCell>{material.description}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell className="text-center">{material.current_stock}</TableCell>
                        <TableCell className="text-center">{material.minimum_stock}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={
                            percentage < 100 ? 'text-destructive font-medium' : 
                            percentage < 150 ? 'text-orange-600' : 'text-green-600'
                          }>
                            {percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}