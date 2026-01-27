import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { FiscalSubstitutosManager } from '@/components/FiscalSubstitutosManager';
import { useFiscalObras } from '@/hooks/useFiscalObras';
import { useObraNotifications, ObraNotification } from '@/hooks/useObraNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, MapPin, ArrowLeft, Bell, Clock, User, FileText, XCircle, CheckCircle, RotateCcw } from 'lucide-react';

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  paralisada: 'Paralisada',
};

const statusColors: Record<string, string> = {
  planejamento: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluida: 'bg-green-100 text-green-800',
  paralisada: 'bg-red-100 text-red-800',
};

const actionTypeIcons: Record<string, React.ReactNode> = {
  rdo_reprovar: <XCircle className="h-4 w-4 text-red-500" />,
  rdo_aprovar: <CheckCircle className="h-4 w-4 text-green-500" />,
  rdo_reabrir: <RotateCcw className="h-4 w-4 text-amber-500" />,
};

function NotificationItem({ notification }: { notification: ObraNotification }) {
  const Icon = actionTypeIcons[notification.action_type] || <FileText className="h-4 w-4 text-muted-foreground" />;
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${notification.is_read ? 'bg-background' : 'bg-primary/5 border-primary/20'}`}>
      <div className="flex-shrink-0 mt-0.5">
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{notification.obra_nome}</span>
          {!notification.is_read && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
              Novo
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{notification.action_description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{notification.user_email}</span>
          <span>•</span>
          <Clock className="h-3 w-3" />
          <span>{format(new Date(notification.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
    </div>
  );
}

export default function GerenciarObras() {
  const { obras, loading, error } = useFiscalObras();
  const { notifications, unreadCount, isLoading: loadingNotifications, markAllAsRead } = useObraNotifications();

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Gerenciar Obras"
          subtitle="Autorize servidores a editar as obras sob sua responsabilidade"
          actions={
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
          }
        />

        {/* Painel de Notificações */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alterações Recentes
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {loadingNotifications ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {obras.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma obra encontrada</h3>
              <p className="text-muted-foreground">
                Você não é fiscal (titular ou substituto) de nenhuma obra ativa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {obras.map(obra => (
              <AccordionItem
                key={obra.id}
                value={obra.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-4 text-left">
                    <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{obra.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{obra.municipio}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={obra.role === 'titular' ? 'default' : 'secondary'}
                        className={obra.role === 'titular' ? 'bg-primary' : ''}
                      >
                        {obra.role === 'titular' ? 'Titular' : 'Autorizado'}
                      </Badge>
                      <Badge className={statusColors[obra.status] || 'bg-gray-100 text-gray-800'}>
                        {statusLabels[obra.status] || obra.status}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <FiscalSubstitutosManager 
                    obraId={obra.id} 
                    obraNome={obra.nome}
                    canManage={obra.role === 'titular'}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </SimpleHeader>
  );
}