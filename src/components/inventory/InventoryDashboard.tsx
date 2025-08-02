import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaterials } from '@/hooks/useMaterials';

export function InventoryDashboard() {
  const { materials, loading, getLowStockMaterials } = useMaterials();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const lowStockMaterials = getLowStockMaterials();
  const totalValue = materials.reduce((sum, m) => sum + (m.current_stock * 10), 0); // Valor estimado
  const totalItems = materials.reduce((sum, m) => sum + m.current_stock, 0);

  const stats = [
    {
      title: 'Total de Materiais',
      value: materials.length.toString(),
      description: 'Diferentes tipos cadastrados',
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Itens em Estoque',
      value: totalItems.toFixed(0),
      description: 'Quantidade total disponível',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Estoque Baixo',
      value: lowStockMaterials.length.toString(),
      description: 'Materiais abaixo do mínimo',
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Valor Estimado',
      value: `R$ ${totalValue.toLocaleString('pt-BR')}`,
      description: 'Valor total em estoque',
      icon: TrendingDown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard do Almoxarifado</h1>
        <p className="text-muted-foreground">
          Visão geral do inventário e alertas de estoque
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas de Estoque Baixo */}
      {lowStockMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertas de Estoque Baixo
            </CardTitle>
            <CardDescription>
              Materiais que precisam de reposição urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className="font-medium text-sm">
                        {material.code} - {material.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estoque atual: {material.current_stock} {material.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      Crítico
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mín: {material.minimum_stock} {material.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo por Unidade */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Unidade</CardTitle>
          <CardDescription>
            Distribuição dos materiais por tipo de unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {['KG', 'M', 'LITRO', 'PC', 'CX'].map((unit) => {
              const materialsByUnit = materials.filter(m => m.unit === unit);
              const totalByUnit = materialsByUnit.reduce((sum, m) => sum + m.current_stock, 0);
              
              return (
                <div key={unit} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{materialsByUnit.length}</div>
                  <div className="text-sm text-muted-foreground">materiais</div>
                  <Badge variant="outline" className="mt-2">{unit}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total: {totalByUnit.toFixed(1)} {unit}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}