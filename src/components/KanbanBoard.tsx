import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wrench, Zap, Droplets, Plus, Edit, Eye, MoreVertical, PaintRoller, Check } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { ViewTaskModal } from './ViewTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/hooks/use-toast';
import { useMaintenanceTickets, MaintenanceTicket } from '@/hooks/useMaintenanceTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Use MaintenanceTicket from the hook but extend it with icon for UI
interface Ticket extends Omit<MaintenanceTicket, 'created_at' | 'request_type' | 'process_number' | 'completed_at'> {
  icon: any;
  createdAt: string;
  requestType?: 'email' | 'processo';
  processNumber?: string;
  completedAt?: Date;
}

const initialTickets: Record<string, Ticket[]> = {
  'Em Análise': [],
  'Em Andamento': [],
  'Serviços Pausados': [],
  'Concluído': []
};

const priorityColors = {
  'Alta': 'destructive',
  'Média': 'warning',
  'Baixa': 'secondary'
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onMarkAsExecuted?: (ticketId: string) => void;
}

function DroppableColumn({ id, title, tickets, onViewTicket, onEditTicket, onMarkAsExecuted }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {tickets.length}
        </Badge>
      </div>

      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div 
          ref={setNodeRef}
          className={`space-y-3 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
            isOver 
              ? 'border-primary bg-primary/5' 
              : 'border-transparent hover:border-muted-foreground/30'
          }`}
        >
          {tickets.map((ticket) => (
            <DraggableTicket 
              key={ticket.id} 
              ticket={ticket} 
              onViewTicket={onViewTicket}
              onEditTicket={onEditTicket}
              onMarkAsExecuted={onMarkAsExecuted}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

interface DraggableTicketProps {
  ticket: Ticket;
  onViewTicket: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onMarkAsExecuted?: (ticketId: string) => void;
}

function DraggableTicket({ ticket, onViewTicket, onEditTicket, onMarkAsExecuted }: DraggableTicketProps) {
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditTicket(ticket);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewTicket(ticket);
  };

  const getServicesProgress = () => {
    if (!ticket.services || ticket.services.length === 0) return 0;
    const completed = ticket.services.filter(s => s.completed).length;
    return (completed / ticket.services.length) * 100;
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-grab hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
      {...attributes} 
      {...listeners}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">
            {ticket.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <ticket.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={handleView} className="text-xs">
                  <Eye className="mr-2 h-3 w-3" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit} className="text-xs">
                  <Edit className="mr-2 h-3 w-3" />
                  Editar
                </DropdownMenuItem>
                {ticket.status === 'Concluído' && onMarkAsExecuted && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsExecuted(ticket.id);
                  }} className="text-xs">
                    <Check className="mr-2 h-3 w-3" />
                    Executado
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

        {/* Barra de progresso dos serviços */}
        {ticket.services && ticket.services.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-xs text-muted-foreground">{Math.round(getServicesProgress())}%</span>
            </div>
            <Progress value={getServicesProgress()} className="w-full h-1.5" />
          </div>
        )}

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
  const { tickets: dbTickets, loading, createTicket, updateTicket, deleteTicket } = useMaintenanceTickets();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<{ [key: string]: Ticket[] }>({
    'Pendente': [],
    'Em andamento': [],
    'Impedido': [],
    'Concluído': []
  });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Convert DB tickets to UI tickets format
  useEffect(() => {
    const convertedTickets = {
      'Pendente': [],
      'Em andamento': [],
      'Impedido': [],
      'Concluído': []
    } as { [key: string]: Ticket[] };

    Object.entries(dbTickets).forEach(([status, statusTickets]) => {
      convertedTickets[status] = (statusTickets as MaintenanceTicket[]).map(ticket => ({
        ...ticket,
        createdAt: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
        requestType: ticket.request_type,
        processNumber: ticket.process_number,
        completedAt: ticket.completed_at ? new Date(ticket.completed_at) : undefined,
        icon: getIconForType(ticket.type)
      }));
    });

    setTickets(convertedTickets);
  }, [dbTickets]);

  function getIconForType(type: string) {
    switch (type.toLowerCase()) {
      case 'elétrica': return Zap;
      case 'hidráulica': return Droplets;
      case 'pintura': return PaintRoller;
      default: return Wrench;
    }
  }
  
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

    // Atualizar ticket no banco de dados
    updateTicket(activeId, { status: targetStatus as 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído' });

    setActiveTicket(null);

    setActiveTicket(null);
  };

  const handleCreateTask = async (taskData: Omit<Ticket, 'id' | 'createdAt' | 'icon'>) => {
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa fazer login para criar tarefas.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const dbTicketData = {
      title: taskData.title,
      priority: taskData.priority,
      type: taskData.type,
      location: taskData.location,
      assignee: taskData.assignee,
      status: taskData.status,
      observations: taskData.observations,
      services: taskData.services,
      request_type: taskData.requestType,
      process_number: taskData.processNumber
    };

    await createTicket(dbTicketData);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewModalOpen(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditModalOpen(true);
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    const dbTicketData = {
      title: updatedTicket.title,
      priority: updatedTicket.priority,
      type: updatedTicket.type,
      location: updatedTicket.location,
      assignee: updatedTicket.assignee,
      status: updatedTicket.status,
      observations: updatedTicket.observations,
      services: updatedTicket.services,
      request_type: updatedTicket.requestType,
      process_number: updatedTicket.processNumber,
      completed_at: updatedTicket.completedAt?.toISOString()
    };

    await updateTicket(updatedTicket.id, dbTicketData);
  };

  const handleMarkAsExecuted = async (ticketId: string) => {
    await deleteTicket(ticketId);
    toast({
      title: "Sucesso",
      description: "Tarefa marcada como executada e removida do kanban!",
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Chamados de Manutenção</h2>
            <p className="text-muted-foreground">Arraste as tarefas entre as colunas para alterar o status</p>
          </div>
          <CreateTaskModal onCreateTask={(task) => handleCreateTask(task as any)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Object.entries(tickets).map(([status, statusTickets]) => (
            <DroppableColumn
              key={status}
              id={status}
              title={status}
              tickets={statusTickets}
              onViewTicket={handleViewTicket}
              onEditTicket={handleEditTicket}
              onMarkAsExecuted={handleMarkAsExecuted}
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
                  <div className="flex items-center gap-1">
                    <activeTicket.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
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

        {/* Modais */}
        {selectedTicket && (
          <ViewTaskModal 
            ticket={selectedTicket}
            open={viewModalOpen}
            onOpenChange={setViewModalOpen}
          />
        )}
        
        {selectedTicket && (
          <EditTaskModal 
            ticket={selectedTicket}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            onUpdateTask={handleUpdateTicket}
          />
        )}
      </div>
    </DndContext>
  );
}