import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wrench, Zap, Droplets, Plus, Edit, Eye, MoreVertical, PaintRoller, Check, Trash2, AlertOctagon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImpedimentReasonDialog } from './ImpedimentReasonDialog';
import { useTicketImpediments, addImpediment, resolveActiveImpediments, type TicketImpediment } from '@/hooks/useTicketImpediments';
import { useProfile } from '@/hooks/useProfile';
import { CreateTaskModal } from './CreateTaskModal';
import { ViewTaskModal } from './ViewTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowRightLeft } from 'lucide-react';
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
import { useUserRole } from '@/hooks/useUserRole';
import { replaceServicesForTicket, type TicketService } from '@/hooks/useTicketServices';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import type { UITicket } from '@/types/maintenanceTicket';

type Ticket = UITicket;

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

const ALL_STATUSES = ['Pendente', 'Em andamento', 'Impedido', 'Concluído'] as const;

interface DroppableColumnProps {
  id: string;
  title: string;
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onMarkAsExecuted?: (ticketId: string) => void;
  onDeleteTicket?: (ticketId: string) => void;
  isManutencao?: boolean;
  impedimentByTicket: Record<string, TicketImpediment | undefined>;
  onMoveTicket: (ticketId: string, targetStatus: string) => void;
  allowedTargets: string[];
  enableDrag?: boolean;
}

function DroppableColumn({ id, title, tickets, onViewTicket, onEditTicket, onMarkAsExecuted, onDeleteTicket, isManutencao, impedimentByTicket, onMoveTicket, allowedTargets, enableDrag = true }: DroppableColumnProps) {
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
              onDeleteTicket={onDeleteTicket}
              isManutencao={isManutencao}
              activeImpediment={impedimentByTicket[ticket.id]}
              onMoveTicket={onMoveTicket}
              currentStatus={id}
              allowedTargets={allowedTargets}
              enableDrag={enableDrag}
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
  onDeleteTicket?: (ticketId: string) => void;
  isManutencao?: boolean;
  activeImpediment?: TicketImpediment;
  onMoveTicket: (ticketId: string, targetStatus: string) => void;
  currentStatus: string;
  allowedTargets: string[];
  enableDrag?: boolean;
}

function DraggableTicket({ ticket, onViewTicket, onEditTicket, onMarkAsExecuted, onDeleteTicket, isManutencao, activeImpediment, onMoveTicket, currentStatus, allowedTargets, enableDrag = true }: DraggableTicketProps) {
  // Permitir drag para todos os usuários (desabilitado no mobile via prop)
  const canDrag = enableDrag;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: ticket.id,
    disabled: !canDrag
  });

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
    const svcs = ticket.services ?? [];
    if (svcs.length === 0) return 0;
    const completed = svcs.filter(s => s.completed).length;
    return (completed / svcs.length) * 100;
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-grab hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => onViewTicket(ticket)}
      {...attributes} 
      {...listeners}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">
            {ticket.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {activeImpediment && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <AlertOctagon className="h-4 w-4 text-destructive flex-shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs font-semibold mb-0.5">Impedimento</p>
                    <p className="text-xs whitespace-pre-wrap">{activeImpediment.motivo}</p>
                    <p className="text-[10px] mt-1 opacity-70">
                      {new Date(activeImpediment.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {activeImpediment.created_by_name ? ` · ${activeImpediment.created_by_name}` : ''}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleView} className="text-xs">
                  <Eye className="mr-2 h-3 w-3" />
                  Ver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit} className="text-xs">
                  <Edit className="mr-2 h-3 w-3" />
                  Editar
                </DropdownMenuItem>
                {allowedTargets.filter((s) => s !== currentStatus).length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                      <ArrowRightLeft className="mr-2 h-3 w-3" />
                      Mover para…
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {allowedTargets
                        .filter((s) => s !== currentStatus)
                        .map((s) => (
                          <DropdownMenuItem
                            key={s}
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveTicket(ticket.id, s);
                            }}
                          >
                            {s}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {onDeleteTicket && <DropdownMenuSeparator />}
                {/* Finalização acontece dentro do modal de visualização (com anexo do e-mail, quando aplicável). */}
                {onDeleteTicket && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Excluir a tarefa "${ticket.title}"? Esta ação não pode ser desfeita.`)) {
                        onDeleteTicket(ticket.id);
                      }
                    }}
                    className="text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Excluir
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
  const { tickets: dbTickets, loading, createTicket, updateTicket, deleteTicket, refetch } = useMaintenanceTickets();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isGM, canEdit } = useUserRole();
  const isMobile = useIsMobile();
  const { managers } = useMaintenanceManagers();

  const namesFromIds = (ids: string[] | undefined | null) =>
    (ids ?? []).map((id) => managers.find((m) => m.id === id)?.nome).filter(Boolean) as string[];
  const joinFirstNames = (names: string[]) =>
    names.map((n) => (n.trim().split(/\s+/)[0] || '').trim()).filter(Boolean).join(' / ');

  const resolveServicesServidor = (
    services: TicketService[] | undefined,
    fallbackManagerIds?: string[] | null,
    fallbackAssignee?: string,
  ) => {
    const fallbackNames = namesFromIds(fallbackManagerIds ?? undefined);
    const fallbackJoined = joinFirstNames(fallbackNames) || fallbackAssignee || '—';
    return (services ?? []).map((s) => {
      const svcIds = s.custom_assignment
        ? (s.manager_ids && s.manager_ids.length > 0
            ? s.manager_ids
            : (s.manager_id ? [s.manager_id] : []))
        : [];
      const svcNames = namesFromIds(svcIds);
      const travelIds = svcIds.length > 0 ? svcIds : (fallbackManagerIds ?? []);
      const travelServidor =
        svcNames.length > 0 ? joinFirstNames(svcNames) : fallbackJoined;
      return { ...s, travel_servidor: travelServidor, travel_manager_ids: travelIds };
    });
  };
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

  // Impedimentos
  const { profile } = useProfile();
  const allTicketIds = Object.values(tickets).flat().map((t) => t.id);
  const { impediments, refetch: refetchImpediments } = useTicketImpediments(allTicketIds);
  const impedimentByTicket: Record<string, TicketImpediment | undefined> = {};
  for (const imp of impediments) {
    if (!imp.resolved_at && !impedimentByTicket[imp.ticket_id]) {
      impedimentByTicket[imp.ticket_id] = imp;
    }
  }

  const [impedimentDialog, setImpedimentDialog] = useState<{
    open: boolean;
    ticketId: string | null;
    ticketTitle?: string;
  }>({ open: false, ticketId: null });

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
        requestedAt: (ticket as any).requested_at,
        managerId: (ticket as any).manager_id ?? null,
        managerIds: (ticket as any).manager_ids ?? ((ticket as any).manager_id ? [(ticket as any).manager_id] : []),
        nucleoId: (ticket as any).nucleo_id ?? null,
        completedAt: ticket.completed_at ? new Date(ticket.completed_at) : undefined,
        finalizedAt: (ticket as any).finalized_at ?? null,
        confirmationFileUrl: (ticket as any).confirmation_file_url ?? null,
        confirmationFileName: (ticket as any).confirmation_file_name ?? null,
        finalizationNote: (ticket as any).finalization_note ?? null,
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
    for (const [status, statusTickets] of Object.entries(tickets)) {
      const ticket = statusTickets.find(t => t.id === active.id);
      if (ticket) {
        setActiveTicket(ticket);
        break;
      }
    }
  };

  const attemptMoveTicket = (
    ticketId: string,
    targetStatus: string,
  ): 'moved' | 'awaiting-impediment' | 'blocked' | 'noop' => {
    let sourceStatus = '';
    let ticketToMove: Ticket | null = null;
    for (const [status, arr] of Object.entries(tickets)) {
      const t = arr.find((t) => t.id === ticketId);
      if (t) { sourceStatus = status; ticketToMove = t; break; }
    }
    if (!ticketToMove) return 'noop';
    if (sourceStatus === targetStatus) return 'noop';

    if (isGM) {
      const allowedStatuses = ['Em andamento', 'Impedido', 'Concluído'];
      if (!allowedStatuses.includes(sourceStatus) || !allowedStatuses.includes(targetStatus)) {
        toast({
          title: 'Movimento não permitido',
          description: 'Usuários de manutenção só podem mover tarefas entre Em andamento, Impedido e Concluído',
          variant: 'destructive',
        });
        return 'blocked';
      }
    }

    if (targetStatus === 'Concluído') {
      const svcs = ticketToMove.services ?? [];
      if (svcs.length > 0 && !svcs.every((s) => s.completed)) {
        toast({
          title: 'Serviços em aberto',
          description: 'Marque todos os serviços do procedimento como concluídos antes de movê-lo para Concluído.',
          variant: 'destructive',
        });
        return 'blocked';
      }
    }

    if (targetStatus === 'Impedido' && sourceStatus !== 'Impedido') {
      setImpedimentDialog({ open: true, ticketId, ticketTitle: ticketToMove.title });
      return 'awaiting-impediment';
    }

    if (sourceStatus === 'Impedido' && targetStatus !== 'Impedido') {
      resolveActiveImpediments(ticketId, user?.id ?? null, profile?.display_name ?? null)
        .catch((err) => console.error('Erro ao resolver impedimento:', err))
        .finally(() => refetchImpediments());
    }

    updateTicket(ticketId, {
      status: targetStatus as 'Pendente' | 'Em andamento' | 'Impedido' | 'Concluído',
    }).then(() => refetch());
    return 'moved';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) { setActiveTicket(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetStatus = '';
    for (const [status, statusTickets] of Object.entries(tickets)) {
      if (statusTickets.find((t) => t.id === overId)) { targetStatus = status; break; }
    }
    if (!targetStatus) {
      const columnNames = Object.keys(tickets);
      if (columnNames.includes(overId)) targetStatus = overId;
    }
    if (!targetStatus) { setActiveTicket(null); return; }

    attemptMoveTicket(activeId, targetStatus);
    setActiveTicket(null);
  };


  const handleCreateTask = async (taskData: any) => {
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa fazer login para criar tarefas.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const ticketManagerIds: string[] =
      (taskData.managerIds && taskData.managerIds.length > 0)
        ? taskData.managerIds
        : (taskData.managerId ? [taskData.managerId] : []);

    const dbTicketData = {
      title: taskData.title,
      priority: taskData.priority,
      type: taskData.type,
      location: taskData.location,
      assignee: taskData.assignee,
      status: taskData.status,
      observations: taskData.observations || [],
      materials: taskData.materials || [],
      request_type: taskData.requestType,
      process_number: taskData.processNumber,
      requested_at: taskData.requestedAt,
      manager_id: ticketManagerIds[0] ?? null,
      manager_ids: ticketManagerIds,
      nucleo_id: taskData.nucleoId ?? null,
      user_id: user?.id,
    } as any;

    const created = await createTicket(dbTicketData);
    if (created?.id && Array.isArray(taskData.services) && taskData.services.length > 0) {
      try {
        const svcs = resolveServicesServidor(taskData.services, ticketManagerIds, taskData.assignee);
        const fallbackServidor =
          joinFirstNames(namesFromIds(ticketManagerIds)) || taskData.assignee || '—';
        await replaceServicesForTicket(created.id, svcs, {
          ticketTitle: taskData.title,
          fallbackServidor,
          fallbackManagerIds: ticketManagerIds,
          userId: user?.id,
        });
      } catch (err) {
        console.error('Erro ao salvar serviços da tarefa:', err);
        toast({
          title: 'Aviso',
          description: 'Procedimento criado, mas houve erro ao salvar os serviços.',
          variant: 'destructive',
        });
      }
    }
    await refetch();
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
    const ticketManagerIds: string[] =
      (updatedTicket.managerIds && updatedTicket.managerIds.length > 0)
        ? updatedTicket.managerIds
        : (updatedTicket.managerId ? [updatedTicket.managerId] : []);

    const dbTicketData = {
      title: updatedTicket.title,
      priority: updatedTicket.priority,
      type: updatedTicket.type,
      location: updatedTicket.location,
      assignee: updatedTicket.assignee,
      status: updatedTicket.status,
      observations: updatedTicket.observations || [],
      materials: updatedTicket.materials || [],
      request_type: updatedTicket.requestType,
      process_number: updatedTicket.processNumber,
      requested_at: updatedTicket.requestedAt,
      manager_id: ticketManagerIds[0] ?? null,
      manager_ids: ticketManagerIds,
      nucleo_id: updatedTicket.nucleoId ?? null,
      completed_at: updatedTicket.completedAt?.toISOString(),
    } as any;

    await updateTicket(updatedTicket.id, dbTicketData);
    try {
      const svcs = resolveServicesServidor(updatedTicket.services ?? [], ticketManagerIds, updatedTicket.assignee);
      const fallbackServidor =
        joinFirstNames(namesFromIds(ticketManagerIds)) || updatedTicket.assignee || '—';
      await replaceServicesForTicket(updatedTicket.id, svcs, {
        ticketTitle: updatedTicket.title,
        fallbackServidor,
        fallbackManagerIds: ticketManagerIds,
        userId: user?.id,
      });
    } catch (err) {
      console.error('Erro ao salvar serviços da tarefa:', err);
      toast({
        title: 'Aviso',
        description: 'Procedimento atualizado, mas houve erro ao salvar os serviços.',
        variant: 'destructive',
      });
    }
    await refetch();
  };

  const handleMarkAsExecuted = async (ticketId: string) => {
    await deleteTicket(ticketId);
    toast({
      title: "Sucesso",
      description: "Tarefa marcada como executada e removida do kanban!",
    });
  };

  const handleDeleteTicket = async (ticketId: string) => {
    await deleteTicket(ticketId);
    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida permanentemente.",
    });
  };


  const visibleStatuses = ALL_STATUSES.filter(
    (s) => !isGM || ['Em andamento', 'Impedido', 'Concluído'].includes(s),
  );
  const allowedTargets = [...visibleStatuses];
  const [mobileTab, setMobileTab] = useState<string>(visibleStatuses[0]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Chamados de Manutenção</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">Arraste as tarefas entre as colunas para alterar o status</p>
            <p className="text-xs text-muted-foreground md:hidden">Use "Mover para…" no menu do card para trocar de etapa</p>
          </div>
          {!isGM && <CreateTaskModal onCreateTask={(task) => handleCreateTask(task as any)} />}
        </div>

        {isMobile ? (
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="w-full">
            <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${visibleStatuses.length}, minmax(0,1fr))` }}>
              {visibleStatuses.map((status) => {
                const count = tickets[status]?.length ?? 0;
                return (
                  <TabsTrigger key={status} value={status} className="text-[11px] px-1">
                    <span className="truncate">{status}</span>
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {visibleStatuses.map((status) => (
              <TabsContent key={status} value={status} className="mt-4">
                <DroppableColumn
                  id={status}
                  title={status}
                  tickets={tickets[status] ?? []}
                  onViewTicket={handleViewTicket}
                  onEditTicket={handleEditTicket}
                  onMarkAsExecuted={handleMarkAsExecuted}
                  onDeleteTicket={!isGM ? handleDeleteTicket : undefined}
                  isManutencao={isGM}
                  impedimentByTicket={impedimentByTicket}
                  onMoveTicket={attemptMoveTicket}
                  allowedTargets={allowedTargets}
                  enableDrag={false}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {visibleStatuses.map((status) => (
              <DroppableColumn
                key={status}
                id={status}
                title={status}
                tickets={tickets[status] ?? []}
                onViewTicket={handleViewTicket}
                onEditTicket={handleEditTicket}
                onMarkAsExecuted={handleMarkAsExecuted}
                onDeleteTicket={!isGM ? handleDeleteTicket : undefined}
                isManutencao={isGM}
                impedimentByTicket={impedimentByTicket}
                onMoveTicket={attemptMoveTicket}
                allowedTargets={allowedTargets}
                enableDrag={true}
              />
            ))}
          </div>
        )}


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
            onChanged={() => refetch()}
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

        <ImpedimentReasonDialog
          open={impedimentDialog.open}
          onOpenChange={(o) => setImpedimentDialog((s) => ({ ...s, open: o }))}
          ticketTitle={impedimentDialog.ticketTitle}
          onConfirm={async (motivo) => {
            const id = impedimentDialog.ticketId;
            if (!id) return;
            try {
              await addImpediment(id, motivo, user?.id ?? null, profile?.display_name ?? null);
              await updateTicket(id, { status: 'Impedido' });
              await Promise.all([refetch(), refetchImpediments()]);
              toast({ title: 'Impedimento registrado', description: 'Tarefa movida para Impedido.' });
            } catch (err: any) {
              console.error(err);
              toast({
                title: 'Erro ao registrar impedimento',
                description: err?.message ?? 'Tente novamente.',
                variant: 'destructive',
              });
            } finally {
              setImpedimentDialog({ open: false, ticketId: null });
            }
          }}
          onCancel={() => setImpedimentDialog({ open: false, ticketId: null })}
        />
      </div>
    </DndContext>
  );
}