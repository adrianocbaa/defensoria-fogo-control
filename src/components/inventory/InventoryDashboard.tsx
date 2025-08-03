import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalMaterials: number;
  lowStock: number;
  recentMovements: number;
  totalValue: number;
}

interface LowStockItem {
  id: string;
  code: string;
  description: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export function InventoryDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMaterials: 0,
    lowStock: 0,
    recentMovements: 0,
    totalValue: 0
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get total materials and low stock items
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('*');

      if (materialsError) throw materialsError;

      const lowStock = materials?.filter(m => m.current_stock <= m.minimum_stock) || [];
      
      // Get recent movements (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: movements, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (movementsError) throw movementsError;

      setStats({
        totalMaterials: materials?.length || 0,
        lowStock: lowStock.length,
        recentMovements: movements?.length || 0,
        totalValue: 0 // This would need price data
      });

      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Carregando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Dashboard do Inventário
              </h1>
              <p className="text-muted-foreground mt-1">
                Visão geral do estoque e movimentações em tempo real
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Atualizado há 2 min
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* KPI Cards - Responsive Grid */}
        <div className="grid-stats">
          <Card className="card-stats group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total de Materiais
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.totalMaterials}
                  </p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +3 este mês
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stats group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Estoque Crítico
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.lowStock}
                  </p>
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Ação necessária
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stats group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Movimentações
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.recentMovements}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    últimos 7 dias
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stats group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Valor Estimado
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    R$ 0,00
                  </p>
                  <p className="text-xs text-muted-foreground">
                    em desenvolvimento
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                  <TrendingDown className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Section - Conditional Rendering */}
        {stats.lowStock > 0 && (
          <Card className="border-l-4 border-red-500 bg-red-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Alertas Críticos de Estoque
                <Badge variant="destructive" className="ml-auto">
                  {stats.lowStock} item(ns)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStockItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.code}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge variant="destructive" className="text-xs">
                        {item.current_stock}/{item.minimum_stock} {item.unit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 6 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    +{lowStockItems.length - 6} outros itens críticos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Mobile-friendly */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funções mais utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="btn-primary flex-col h-20 w-full">
                <Package className="h-5 w-5 mb-2" />
                <span className="text-xs">Novo Material</span>
              </button>
              <button className="btn-success flex-col h-20 w-full">
                <TrendingUp className="h-5 w-5 mb-2" />
                <span className="text-xs">Entrada</span>
              </button>
              <button className="btn-warning flex-col h-20 w-full">
                <TrendingDown className="h-5 w-5 mb-2" />
                <span className="text-xs">Saída</span>
              </button>
              <button className="btn-action bg-purple-600 text-white hover:bg-purple-700 flex-col h-20 w-full">
                <AlertTriangle className="h-5 w-5 mb-2" />
                <span className="text-xs">Relatório</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}