import { Bell, AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaterials } from '@/hooks/useMaterials';

export function MobileNotifications() {
  const { getLowStockMaterials } = useMaterials();
  const lowStockMaterials = getLowStockMaterials();

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Notificações Mobile
          </h1>
          <p className="text-muted-foreground mt-1">
            Simulação de alertas e notificações push
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Push Notification Mockup */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Simulação de Notificação Push
            </CardTitle>
            <CardDescription>
              Exemplos de como as notificações apareceriam em dispositivos móveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* iOS Style Notification */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Estilo iOS</h4>
              <div className="notification-mobile bg-white rounded-xl shadow-lg">
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-foreground">Almoxarifado</p>
                      <span className="text-xs text-muted-foreground">Agora</span>
                    </div>
                    <p className="text-sm text-foreground">Estoque Crítico</p>
                    <p className="text-xs text-muted-foreground">
                      {lowStockMaterials.length} material(is) precisam reposição urgente
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Android Style Notification */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Estilo Android</h4>
              <div className="bg-white rounded-lg shadow-md border border-border/50 p-4">
                <div className="flex items-start gap-3">
                  <Package className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm text-foreground">Sistema de Almoxarifado</p>
                      <span className="text-xs text-muted-foreground">12:34</span>
                    </div>
                    <p className="text-sm text-foreground mb-1">Alerta de Estoque Baixo</p>
                    <p className="text-xs text-muted-foreground">
                      Toque para ver os {lowStockMaterials.length} itens que necessitam reposição
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Items Grid - Mobile Optimized */}
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Itens Críticos
              <Badge variant="destructive">{lowStockMaterials.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockMaterials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lowStockMaterials.slice(0, 8).map((material) => (
                  <div 
                    key={material.id} 
                    className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {material.code}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {material.description}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge variant="destructive" className="text-xs">
                        {material.current_stock} {material.unit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum item crítico no momento</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos os materiais estão com estoque adequado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}