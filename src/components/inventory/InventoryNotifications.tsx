import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, AlertTriangle, Package, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LowStockNotification {
  id: string;
  code: string;
  description: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  severity: 'critical' | 'warning';
}

export function InventoryNotifications() {
  const [notifications, setNotifications] = useState<LowStockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobile, setShowMobile] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .or('current_stock.lte.minimum_stock,current_stock.lte.minimum_stock*1.5')
        .order('current_stock');

      if (error) throw error;

      const notifications: LowStockNotification[] = (data || []).map(material => ({
        id: material.id,
        code: material.code,
        description: material.description,
        current_stock: material.current_stock,
        minimum_stock: material.minimum_stock,
        unit: material.unit,
        severity: material.current_stock <= material.minimum_stock ? 'critical' : 'warning'
      }));

      setNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const criticalNotifications = notifications.filter(n => n.severity === 'critical');
  const warningNotifications = notifications.filter(n => n.severity === 'warning');

  if (loading) {
    return <div className="p-6">Carregando notificações...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações de Estoque
          </h2>
          <p className="text-muted-foreground">Centro de alertas e notificações do inventário</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowMobile(!showMobile)}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            {showMobile ? 'Ocultar' : 'Ver'} Mockup Mobile
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Mockup */}
      {showMobile && (
        <Card className="max-w-sm mx-auto border-2 border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                📱 Push Notification
              </span>
              <X className="h-4 w-4 cursor-pointer" onClick={() => setShowMobile(false)} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Estoque Crítico</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {criticalNotifications.length} itens precisam de reposição urgente
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Agora</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Alertas</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-destructive">{criticalNotifications.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atenção</p>
                <p className="text-2xl font-bold text-orange-600">{warningNotifications.length}</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Notifications */}
      {criticalNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalNotifications.map((notification) => (
                <Alert key={notification.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex justify-between items-center">
                    <div>
                      <strong>{notification.code}</strong> - {notification.description}
                      <div className="text-sm mt-1">
                        Estoque: {notification.current_stock} {notification.unit} 
                        (Mínimo: {notification.minimum_stock} {notification.unit})
                      </div>
                    </div>
                    <Badge variant="destructive">CRÍTICO</Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Notifications */}
      {warningNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Package className="h-5 w-5" />
              Alertas de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warningNotifications.map((notification) => (
                <Alert key={notification.id}>
                  <Package className="h-4 w-4" />
                  <AlertDescription className="flex justify-between items-center">
                    <div>
                      <strong>{notification.code}</strong> - {notification.description}
                      <div className="text-sm mt-1">
                        Estoque: {notification.current_stock} {notification.unit} 
                        (Mínimo: {notification.minimum_stock} {notification.unit})
                      </div>
                    </div>
                    <Badge variant="secondary">ATENÇÃO</Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Notifications */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma notificação</h3>
            <p className="text-muted-foreground">
              Todos os materiais estão com níveis adequados de estoque.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}