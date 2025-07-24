import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MapPin, Wrench, Zap, Droplets } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Ticket {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  createdAt: string;
  icon: any;
  status: string;
}

const initialTickets: Record<string, Ticket[]> = {
  'Em Análise': [
    {
      id: 'CH-001',
      title: 'Vazamento no banheiro - 3º andar',
      priority: 'Alta',
      type: 'Hidráulica',
      location: 'Sala 301',
      assignee: 'João Silva',
      createdAt: '2h atrás',
      icon: Droplets,
      status: 'Em Análise'
    },
    {
      id: 'CH-002',
      title: 'Lâmpada queimada - recepção',
      priority: 'Baixa',
      type: 'Elétrica',
      location: 'Recepção',
      assignee: 'Maria Santos',
      createdAt: '4h atrás',
      icon: Zap,
      status: 'Em Análise'
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
      icon: Wrench,
      status: 'Em Andamento'
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
      icon: Wrench,
      status: 'Aguardando Peças'
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
      icon: Wrench,
      status: 'Concluído'
    }
  ]
};

const priorityColors = {
  'Alta': 'destructive',
  'Média': 'default',
  'Baixa': 'secondary'
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
}

function DroppableColumn({ id, title, tickets }: DroppableColumnProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {tickets.length}
        </Badge>
      </div>

      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px] p-2 rounded-lg border-2 border-dashed border-transparent hover:border-muted-foreground/30 transition-colors">
          {tickets.map((ticket) => (
            <DraggableTicket key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

interface DraggableTicketProps {
  ticket: Ticket;
}

function DraggableTicket({ ticket }: DraggableTicketProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
    >
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
            variant={priorityColors[ticket.priority] as any}
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
  );
}

export function KanbanBoard() {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Encontrar o ticket ativo
    for (const [status, statusTickets] of Object.entries(tickets)) {
      const ticket = statusTickets.find(t => t.id === active.id);
      if (ticket) {
        setActiveTicket(ticket);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTicket(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar ticket e status atual
    let sourceStatus = '';
    let ticketToMove: Ticket | null = null;
    
    for (const [status, statusTickets] of Object.entries(tickets)) {
      const ticket = statusTickets.find(t => t.id === activeId);
      if (ticket) {
        sourceStatus = status;
        ticketToMove = ticket;
        break;
      }
    }

    if (!ticketToMove) {
      setActiveTicket(null);
      return;
    }

    // Determinar o status de destino
    let targetStatus = '';
    
    // Se está sendo arrastado sobre outro ticket, pegar o status desse ticket
    for (const [status, statusTickets] of Object.entries(tickets)) {
      if (statusTickets.find(t => t.id === overId)) {
        targetStatus = status;
        break;
      }
    }
    
    // Se não encontrou ticket, verificar se é uma coluna
    if (!targetStatus) {
      const columnNames = Object.keys(tickets);
      if (columnNames.includes(overId)) {
        targetStatus = overId;
      }
    }

    // Se não há mudança de status, não fazer nada
    if (!targetStatus || sourceStatus === targetStatus) {
      setActiveTicket(null);
      return;
    }

    // Mover o ticket
    setTickets(prev => {
      const newTickets = { ...prev };
      
      // Remover do status atual
      newTickets[sourceStatus] = newTickets[sourceStatus].filter(t => t.id !== activeId);
      
      // Adicionar ao novo status
      const updatedTicket = { ...ticketToMove, status: targetStatus };
      newTickets[targetStatus] = [...newTickets[targetStatus], updatedTicket];
      
      return newTickets;
    });

    setActiveTicket(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Chamados de Manutenção</h2>
          <p className="text-muted-foreground">Arraste as tarefas entre as colunas para alterar o status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tickets).map(([status, statusTickets]) => (
            <DroppableColumn
              key={status}
              id={status}
              title={status}
              tickets={statusTickets}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTicket ? (
            <Card className="cursor-grabbing shadow-lg rotate-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium">
                    {activeTicket.title}
                  </CardTitle>
                  <activeTicket.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={priorityColors[activeTicket.priority] as any}
                    className="text-xs"
                  >
                    {activeTicket.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activeTicket.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{activeTicket.location}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {activeTicket.assignee.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {activeTicket.assignee}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{activeTicket.createdAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}