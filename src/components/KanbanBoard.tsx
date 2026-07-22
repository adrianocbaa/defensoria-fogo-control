import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Wrench, Zap, Droplets, Plus, Edit, Eye, MoreVertical, PaintRoller, Check, Trash2, AlertOctagon, Users, Plane, Camera, ImageIcon, ListChecks, Inbox } from 'lucide-react';
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

const priorityStyles: Record<string, { badge: string; dot: string; label: string }> = {
  'Alta':  { badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900', dot: 'bg-red-500', label: 'Prioridade alta' },
  'Média': { badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900', dot: 'bg-amber-500', label: 'Prioridade média' },
  'Baixa': { badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-400', label: 'Prioridade baixa' },
};

const statusStyles: Record<string, { dot: string; ring: string; soft: string }> = {
  'Pendente':     { dot: 'bg-slate-400',    ring: 'ring-slate-300',    soft: 'bg-slate-50/60 dark:bg-slate-900/30' },
  'Em andamento': { dot: 'bg-blue-500',     ring: 'ring-blue-300',     soft: 'bg-blue-50/50 dark:bg-blue-950/20' },
  'Impedido':     { dot: 'bg-red-500',      ring: 'ring-red-300',      soft: 'bg-red-50/50 dark:bg-red-950/20' },
  'Concluído':    { dot: 'bg-emerald-500',  ring: 'ring-emerald-300',  soft: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
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

  const st = statusStyles[title] ?? statusStyles['Pendente'];
  return (
    <div className="flex flex-col min-w-[280px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} aria-hidden />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
            {tickets.length}
          </span>
        </div>
      </div>

      <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-3 min-h-[220px] p-2 rounded-xl border transition-colors ${
            isOver
              ? `border-dashed border-primary/60 ${st.soft}`
              : 'border-transparent'
          }`}
        >
          {tickets.length === 0 && !isOver && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/70">
              <Inbox className="h-6 w-6 mb-1.5 opacity-60" />
              <span className="text-xs">Sem chamados</span>
            </div>
          )}
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

function DraggableTicket({ ticket, onViewTicket, onEditTicket, onMarkAsExecuted, onDeleteTicket, isManutencao, activeImpediment, onMoveTicket, currentStatus, allowedTargets = [], enableDrag = true }: DraggableTicketProps) {
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

  const svcs = ticket.services ?? [];
  const totalSvcs = svcs.length;
  const doneSvcs = svcs.filter(s => s.completed).length;
  const progress = totalSvcs > 0 ? Math.round((doneSvcs / totalSvcs) * 100) : 0;

  const { managers } = useMaintenanceManagers();
  const responsavelIds = (ticket.managerIds && ticket.managerIds.length > 0)
    ? ticket.managerIds
    : (ticket.managerId ? [ticket.managerId] : []);
  const responsaveis = responsavelIds
    .map((id) => managers.find((m) => m.id === id))
    .filter(Boolean) as { id: string; nome: string }[];
  const fallbackName = responsaveis.length === 0 && ticket.assignee ? [{ id: '_a', nome: ticket.assignee }] : [];
  const displayResp = responsaveis.length > 0 ? responsaveis : fallbackName;
  const shownResp = displayResp.slice(0, 3);
  const extraResp = displayResp.length - shownResp.length;

  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

  const hasTravel = !!ticket.travel_id || svcs.some((s) => !!s.travel_id || s.envolve_viagem);
  const refPhotosCount =
    (ticket.referencePhotos?.length ?? 0) +
    svcs.reduce((acc, s) => acc + (s.reference_photos?.length ?? 0), 0);
  const execPhotosCount = svcs.reduce((acc, s) => acc + (s.execution_photos?.length ?? 0), 0);

  const dateLabel = ticket.requestedAt
    ? new Date(ticket.requestedAt).toLocaleDateString('pt-BR')
    : ticket.createdAt;
  const dateTooltip = ticket.requestedAt ? 'Solicitado em' : 'Criado em';

  const prio = priorityStyles[ticket.priority] ?? priorityStyles['Baixa'];
  const st = statusStyles[currentStatus] ?? statusStyles['Pendente'];
  const isImpedido = !!activeImpediment;

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`group relative overflow-hidden rounded-xl border bg-card hover:shadow-md transition-all ${
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${isDragging ? 'shadow-lg ring-2 ring-primary/40' : ''} ${
          isImpedido ? 'border-red-200 dark:border-red-900/60' : 'border-border'
        }`}
        onClick={() => onViewTicket(ticket)}
        {...attributes}
        {...listeners}
      >
        {/* Barra lateral de status/prioridade */}
        <span
          aria-hidden
          className={`absolute left-0 top-0 h-full w-1 ${isImpedido ? 'bg-red-500' : st.dot}`}
        />

        <CardHeader className="pb-2 pt-3 pl-4 pr-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${prio.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} aria-hidden />
                  {ticket.priority}
                </span>
                <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 gap-1 border-border/70">
                  <ticket.icon className="h-3 w-3" />
                  {ticket.type}
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
                {ticket.title}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 -mr-1 -mt-1 opacity-70 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
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
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <ArrowRightLeft className="h-3 w-3" />
                      Mover para
                    </div>
                    {allowedTargets
                      .filter((s) => s !== currentStatus)
                      .map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className="text-xs pl-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveTicket(ticket.id, s);
                          }}
                        >
                          {s}
                        </DropdownMenuItem>
                      ))}
                  </>
                )}
                {onDeleteTicket && <DropdownMenuSeparator />}
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
        </CardHeader>

        <CardContent className="pt-0 pl-4 pr-3 pb-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{ticket.location}</span>
          </div>

          {isImpedido && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-start gap-1.5 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 px-2 py-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <AlertOctagon className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Impedido</p>
                    <p className="text-[11px] text-red-800/90 dark:text-red-200/90 line-clamp-2 leading-snug">{activeImpediment!.motivo}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs font-semibold mb-0.5">Impedimento</p>
                <p className="text-xs whitespace-pre-wrap">{activeImpediment!.motivo}</p>
                <p className="text-[10px] mt-1 opacity-70">
                  {new Date(activeImpediment!.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {activeImpediment!.created_by_name ? ` · ${activeImpediment!.created_by_name}` : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {totalSvcs > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ListChecks className="h-3 w-3" />
                  <span>{doneSvcs}/{totalSvcs} serviços</span>
                </div>
                <span className="text-[11px] font-medium text-foreground/80">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full h-1.5" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center min-w-0">
              <div className="flex -space-x-1.5">
                {shownResp.map((r) => (
                  <Tooltip key={r.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 ring-2 ring-card">
                        <AvatarFallback className="text-[10px] bg-muted font-medium">
                          {initials(r.nome)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top"><span className="text-xs">{r.nome}</span></TooltipContent>
                  </Tooltip>
                ))}
                {extraResp > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-6 w-6 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        +{extraResp}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs space-y-0.5">
                        {displayResp.map((r) => <div key={r.id}>{r.nome}</div>)}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              {hasTravel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center"><Plane className="h-3.5 w-3.5" /></span>
                  </TooltipTrigger>
                  <TooltipContent><span className="text-xs">Viagem vinculada</span></TooltipContent>
                </Tooltip>
              )}
              {refPhotosCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="text-[10px]">{refPhotosCount}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><span className="text-xs">{refPhotosCount} foto(s) de referência</span></TooltipContent>
                </Tooltip>
              )}
              {execPhotosCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5">
                      <Camera className="h-3.5 w-3.5" />
                      <span className="text-[10px]">{execPhotosCount}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent><span className="text-xs">{execPhotosCount} foto(s) de execução</span></TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {dateLabel}
                  </span>
                </TooltipTrigger>
                <TooltipContent><span className="text-xs">{dateTooltip}</span></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
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
        ticketNumber: (ticket as any).ticket_number ?? undefined,
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
        referencePhotos: Array.isArray((ticket as any).reference_photos) ? (ticket as any).reference_photos : [],
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
      } catch (err: any) {
        console.error('Erro ao salvar serviços da tarefa:', err);
        toast({
          title: 'Aviso',
          description: `Procedimento criado, mas houve erro ao salvar os serviços: ${err?.message ?? err}`,
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
      reference_photos: (updatedTicket.referencePhotos ?? []) as any,
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
    } catch (err: any) {
      console.error('Erro ao salvar serviços da tarefa:', err);
      toast({
        title: 'Aviso',
        description: `Procedimento atualizado, mas houve erro ao salvar os serviços: ${err?.message ?? err}`,
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


  const visibleStatuses = [...ALL_STATUSES];
  const allowedTargets = [...visibleStatuses];
  const [mobileTab, setMobileTab] = useState<string>(visibleStatuses[0]);

  // Filtro por servidor responsável
  const [managerFilter, setManagerFilter] = useState<string>('all');

  // Lista de servidores que aparecem em pelo menos uma tarefa visível
  const availableManagerFilters = useMemo(() => {
    const idsInUse = new Set<string>();
    Object.values(tickets).flat().forEach((t) => {
      (t.managerIds ?? []).forEach((id) => idsInUse.add(id));
    });
    return managers.filter((m) => idsInUse.has(m.id));
  }, [tickets, managers]);

  // Aplica o filtro
  const filteredTickets = useMemo(() => {
    if (managerFilter === 'all') return tickets;
    const out: { [key: string]: Ticket[] } = {};
    for (const [status, list] of Object.entries(tickets)) {
      out[status] = list.filter((t) => (t.managerIds ?? []).includes(managerFilter));
    }
    return out;
  }, [tickets, managerFilter]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Chamados de Manutenção</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">Arraste as tarefas entre as colunas para alterar o status</p>
            <p className="text-xs text-muted-foreground md:hidden">Toque nos três pontos do card para mover entre etapas</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {availableManagerFilters.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="h-9 w-[220px]">
                    <SelectValue placeholder="Filtrar por servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os servidores</SelectItem>
                    {availableManagerFilters.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isGM && <CreateTaskModal onCreateTask={(task) => handleCreateTask(task as any)} />}
          </div>
        </div>


        {isMobile ? (
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="w-full">
            <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${visibleStatuses.length}, minmax(0,1fr))` }}>
              {visibleStatuses.map((status) => {
                const count = filteredTickets[status]?.length ?? 0;
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
                  tickets={filteredTickets[status] ?? []}
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
          <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 overflow-x-auto">
            {visibleStatuses.map((status) => (
              <DroppableColumn
                key={status}
                id={status}
                title={status}
                tickets={filteredTickets[status] ?? []}
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
            <Card className="cursor-grabbing shadow-xl rotate-1 rounded-xl border border-primary/40 bg-card w-[280px]">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${(priorityStyles[activeTicket.priority] ?? priorityStyles['Baixa']).badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${(priorityStyles[activeTicket.priority] ?? priorityStyles['Baixa']).dot}`} />
                    {activeTicket.priority}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                    <activeTicket.icon className="h-3 w-3" />
                    {activeTicket.type}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                  {activeTicket.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activeTicket.location}</span>
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