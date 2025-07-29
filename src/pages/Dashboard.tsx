import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleHeader } from '@/components/SimpleHeader';
import { ErrorState } from '@/components/LoadingStates';
import { Skeleton } from '@/components/ui/skeleton';
// Force cache refresh
import { useObras } from '@/hooks/useObras';
import { TrendingUp, MapPin, CheckCircle, DollarSign, Calendar } from 'lucide-react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function Dashboard() {
  const { obras, loading, error, refetch } = useObras();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');

  // Get available filter options
  const availableYears = useMemo(() => {
    const years = [...new Set(obras.map(obra => new Date(obra.dataInicio).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [obras]);

  const availableMunicipios = useMemo(() => 
    [...new Set(obras.map(obra => obra.municipio))].sort(), 
    [obras]
  );

  const availableTipos = useMemo(() => 
    [...new Set(obras.map(obra => obra.tipo))], 
    [obras]
  );

  // Filter obras based on selected filters
  const filteredObras = useMemo(() => {
    return obras.filter(obra => {
      const year = new Date(obra.dataInicio).getFullYear();
      
      if (selectedYear !== 'all' && year !== parseInt(selectedYear)) return false;
      if (selectedMunicipio !== 'all' && obra.municipio !== selectedMunicipio) return false;
      if (selectedTipo !== 'all' && obra.tipo !== selectedTipo) return false;
      
      return true;
    });
  }, [obras, selectedYear, selectedMunicipio, selectedTipo]);

  // Chart data calculations
  const obrasPorMunicipio = useMemo(() => {
    const municipioCount = filteredObras.reduce((acc, obra) => {
      acc[obra.municipio] = (acc[obra.municipio] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(municipioCount)
      .map(([municipio, count]) => ({ municipio, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 municipalities
  }, [filteredObras]);

  const statusData = useMemo(() => {
    const statusCount = filteredObras.reduce((acc, obra) => {
      const status = obra.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusLabels: Record<string, string> = {
      'concluida': 'Concluída',
      'em_andamento': 'Em Andamento',
      'planejada': 'Planejada',
      'paralisada': 'Paralisada'
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      status
    }));
  }, [filteredObras]);

  const recursosPorTipo = useMemo(() => {
    const tipoValues = filteredObras.reduce((acc, obra) => {
      const tipo = obra.tipo;
      acc[tipo] = (acc[tipo] || 0) + (obra.valor || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tipoValues)
      .map(([tipo, total]) => ({ 
        tipo, 
        total,
        totalFormatted: `R$ ${(total / 1000000).toFixed(1)}M`
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredObras]);

  const evolucaoMensal = useMemo(() => {
    const monthlyData = filteredObras.reduce((acc, obra) => {
      const date = new Date(obra.dataInicio);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData)
      .map(([month, count]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return {
          month: `${monthNames[parseInt(monthNum) - 1]}/${year}`,
          count,
          fullDate: month
        };
      })
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filteredObras]);

  // Summary statistics
  const totalObras = filteredObras.length;
  const totalInvestimento = filteredObras.reduce((sum, obra) => sum + (obra.valor || 0), 0);
  const totalExecutado = filteredObras.reduce((sum, obra) => sum + (obra.valorExecutado || 0), 0);
  const percentualExecucao = totalInvestimento > 0 ? (totalExecutado / totalInvestimento) * 100 : 0;

  if (error && !loading) {
    return (
      <SimpleHeader>
        <div className="min-h-screen bg-background">
          <ErrorState 
            message={error} 
            onRetry={refetch}
          />
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard - Obras Públicas</h1>
                <p className="text-muted-foreground">
                  Estatísticas e indicadores das obras públicas no estado
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Ano</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os anos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Município</label>
                  <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os municípios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os municípios</SelectItem>
                      {availableMunicipios.map(municipio => (
                        <SelectItem key={municipio} value={municipio}>
                          {municipio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Obra</label>
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {availableTipos.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Obras</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalObras}</div>
                    <p className="text-xs text-muted-foreground">
                      obras cadastradas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Investimento Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {(totalInvestimento / 1000000).toFixed(1)}M
                    </div>
                    <p className="text-xs text-muted-foreground">
                      em recursos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Executado</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {(totalExecutado / 1000000).toFixed(1)}M
                    </div>
                    <p className="text-xs text-muted-foreground">
                      executados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">% Execução</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {percentualExecucao.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      do total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Obras por Município */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Obras por Município (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={obrasPorMunicipio} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="municipio" 
                          type="category" 
                          width={80}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status das Obras */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Status das Obras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recursos por Tipo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Investimento por Tipo de Obra
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={recursosPorTipo}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="tipo" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${(value / 1000000).toFixed(2)}M`, 'Investimento']}
                        />
                        <Bar dataKey="total" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Evolução Mensal */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Evolução de Cadastros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={evolucaoMensal}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </SimpleHeader>
  );
}