import { Bell, AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaterials } from '@/hooks/useMaterials';

export function MobileNotifications() {
  const { getLowStockMaterials } = useMaterials();
  const lowStockMaterials = getLowStockMaterials();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
        <p className="text-muted-foreground">
          Alertas e notificações importantes do estoque
        </p>
      </div>

      {/* Mobile Notification Mockup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Simulação de Notificação Push
          </CardTitle>
          <CardDescription>
            Exemplo de como as notificações apareceriam no mobile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Estoque Crítico - Almoxarifado</p>
                <p className="text-xs text-muted-foreground">
                  {lowStockMaterials.length} material(is) com estoque baixo necessitam reposição urgente
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Agora • Toque para ver detalhes
                </p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Itens Críticos
          </CardTitle>
          <CardDescription>
            Materiais que necessitam reposição imediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockMaterials.length > 0 ? (
            <div className="space-y-3">
              {lowStockMaterials.slice(0, 5).map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{material.code}</p>
                    <p className="text-xs text-muted-foreground">{material.description}</p>
                  </div>
                  <Badge variant="destructive">
                    {material.current_stock} {material.unit}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item crítico no momento
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}