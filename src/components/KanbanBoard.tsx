import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MapPin, Wrench, Zap, Droplets } from 'lucide-react';

const mockTickets = {
  'Em Análise': [
    {
      id: 'CH-001',
      title: 'Vazamento no banheiro - 3º andar',
      priority: 'Alta',
      type: 'Hidráulica',
      location: 'Sala 301',
      assignee: 'João Silva',
      createdAt: '2h atrás',
      icon: Droplets
    },
    {
      id: 'CH-002',
      title: 'Lâmpada queimada - recepção',
      priority: 'Baixa',
      type: 'Elétrica',
      location: 'Recepção',
      assignee: 'Maria Santos',
      createdAt: '4h atrás',
      icon: Zap
    }
  ],
  'Em Andamento': [
    {
      id: 'CH-003',
      title: 'Manutenção do ar condicionado',
      priority: 'Média',
      type: 'Climatização',
      location: 'Sala de reuniões',
      assignee: 'Pedro Costa',
      createdAt: '1 dia atrás',
      icon: Wrench
    }
  ],
  'Aguardando Peças': [
    {
      id: 'CH-004',
      title: 'Troca de fechadura - porta principal',
      priority: 'Alta',
      type: 'Segurança',
      location: 'Entrada principal',
      assignee: 'Ana Paula',
      createdAt: '2 dias atrás',
      icon: Wrench
    }
  ],
  'Concluído': [
    {
      id: 'CH-005',
      title: 'Limpeza do sistema de ventilação',
      priority: 'Média',
      type: 'Ventilação',
      location: 'Todo o prédio',
      assignee: 'Carlos Lima',
      createdAt: '3 dias atrás',
      icon: Wrench
    }
  ]
};

const priorityColors = {
  'Alta': 'destructive',
  'Média': 'default',
  'Baixa': 'secondary'
};

export function KanbanBoard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Chamados de Manutenção</h2>
        <p className="text-muted-foreground">Acompanhe o status de todos os chamados em tempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(mockTickets).map(([status, tickets]) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{status}</h3>
              <Badge variant="outline" className="text-xs">
                {tickets.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">
                        {ticket.title}
                      </CardTitle>
                      <ticket.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={priorityColors[ticket.priority as keyof typeof priorityColors] as any}
                        className="text-xs"
                      >
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ticket.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{ticket.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {ticket.assignee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {ticket.assignee}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{ticket.createdAt}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}