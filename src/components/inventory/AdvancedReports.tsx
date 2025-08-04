import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileDown, Filter, BarChart3, PieChart as PieChartIcon, TrendingUp, Package } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovementSummary {
  material_code: string;
  material_description: string;
  entrada: number;
  saida: number;
  descarte: number;
  saldo_final: number;
}

interface DailyMovement {
  date: string;
  entrada: number;
  saida: number;
  total: number;
}

export function AdvancedReports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [materials, setMaterials] = useState<any[]>([]);
  const [movementSummary, setMovementSummary] = useState<MovementSummary[]>([]);
  const [dailyMovements, setDailyMovements] = useState<DailyMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [dateRange, materialFilter, typeFilter]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('id, code, description')
        .order('code');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      // Query movements with material data
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          materials (
            code,
            description,
            unit
          )
        `)
        .gte('date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (materialFilter !== 'all') {
        query = query.eq('material_id', materialFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as 'ENTRADA' | 'SAIDA' | 'DESCARTE');
      }

      const { data: movements, error } = await query;

      if (error) throw error;

      // Process movement summary
      const summaryMap = new Map<string, MovementSummary>();
      const dailyMap = new Map<string, DailyMovement>();

      movements?.forEach((movement) => {
        const materialKey = `${movement.materials?.code}_${movement.material_id}`;
        
        // Movement summary
        if (!summaryMap.has(materialKey)) {
          summaryMap.set(materialKey, {
            material_code: movement.materials?.code || '',
            material_description: movement.materials?.description || '',
            entrada: 0,
            saida: 0,
            descarte: 0,
            saldo_final: 0,
          });
        }

        const summary = summaryMap.get(materialKey)!;
        switch (movement.type) {
          case 'ENTRADA':
            summary.entrada += Number(movement.quantity);
            summary.saldo_final += Number(movement.quantity);
            break;
          case 'SAIDA':
            summary.saida += Number(movement.quantity);
            summary.saldo_final -= Number(movement.quantity);
            break;
          case 'DESCARTE':
            summary.descarte += Number(movement.quantity);
            summary.saldo_final -= Number(movement.quantity);
            break;
        }

        // Daily movements
        const dateKey = movement.date;
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, {
            date: dateKey,
            entrada: 0,
            saida: 0,
            total: 0,
          });
        }

        const daily = dailyMap.get(dateKey)!;
        switch (movement.type) {
          case 'ENTRADA':
            daily.entrada += Number(movement.quantity);
            daily.total += Number(movement.quantity);
            break;
          case 'SAIDA':
          case 'DESCARTE':
            daily.saida += Number(movement.quantity);
            daily.total += Number(movement.quantity);
            break;
        }
      });

      setMovementSummary(Array.from(summaryMap.values()));
      setDailyMovements(Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = movementSummary.map(item => ({
      'Código': item.material_code,
      'Descrição': item.material_description,
      'Entradas': item.entrada,
      'Saídas': item.saida,
      'Descartes': item.descarte,
      'Saldo Final': item.saldo_final,
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_movimentacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
          <CardDescription>
            Configure os filtros para gerar relatórios personalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <Select value={materialFilter} onValueChange={setMaterialFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os materiais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os materiais</SelectItem>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.code} - {material.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Movimento</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                  <SelectItem value="DESCARTE">Descarte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <Button onClick={exportToCSV} className="w-full" variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios em Abas */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">
            <Package className="h-4 w-4 mr-2" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Tendências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Movimentações</CardTitle>
              <CardDescription>
                Movimentações por material no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Gerando relatório...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Entradas</TableHead>
                        <TableHead className="text-right">Saídas</TableHead>
                        <TableHead className="text-right">Descartes</TableHead>
                        <TableHead className="text-right">Saldo Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementSummary.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{item.material_code}</TableCell>
                          <TableCell>{item.material_description}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            +{item.entrada}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            -{item.saida}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            -{item.descarte}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.saldo_final >= 0 ? 'default' : 'destructive'}>
                              {item.saldo_final >= 0 ? '+' : ''}{item.saldo_final}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Movimentações por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Entradas', value: movementSummary.reduce((acc, item) => acc + item.entrada, 0) },
                        { name: 'Saídas', value: movementSummary.reduce((acc, item) => acc + item.saida, 0) },
                        { name: 'Descartes', value: movementSummary.reduce((acc, item) => acc + item.descarte, 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Materiais - Movimentação</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={movementSummary.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="material_code" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="entrada" fill="#22c55e" name="Entradas" />
                    <Bar dataKey="saida" fill="#ef4444" name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Diárias</CardTitle>
              <CardDescription>
                Tendência de movimentações ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyMovements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(parseISO(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(parseISO(value as string), 'dd/MM/yyyy', { locale: ptBR })}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="entrada" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Entradas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saida" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Saídas/Descartes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}