import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ViewObraChecklistModal } from './ViewObraChecklistModal';

interface ObraChecklist {
  id: string;
  nome: string;
  municipio: string;
  tipo: string;
  data_prevista_inauguracao: string | null;
  status_inauguracao: string;
  porcentagem_execucao: number;
  valor_total: number;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  tem_placa_inauguracao: boolean;
  checklist_progresso?: number;
  total_checklist?: number;
  concluidos_checklist?: number;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: any;
}

const columns: KanbanColumn[] = [
  {
    id: 'pendente',
    title: 'Pendente Checklist',
    color: 'bg-slate-100 dark:bg-slate-800',
    icon: Clock
  },
  {
    id: 'em_checklist',
    title: 'Em Checklist',
    color: 'bg-blue-100 dark:bg-blue-900',
    icon: Building2
  },
  {
    id: 'aguardando',
    title: 'Aguardando Inauguração',
    color: 'bg-yellow-100 dark:bg-yellow-900',
    icon: Calendar
  },
  {
    id: 'atrasadas',
    title: 'Atrasadas',
    color: 'bg-red-100 dark:bg-red-900',
    icon: AlertCircle
  },
  {
    id: 'inauguradas',
    title: 'Inauguradas',
    color: 'bg-green-100 dark:bg-green-900',
    icon: CheckCircle2
  }
];

interface DroppableColumnProps {
  column: KanbanColumn;
  obras: ObraChecklist[];
  onViewObra: (obra: ObraChecklist) => void;
}

function DroppableColumn({ column, obras, onViewObra }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  const Icon = column.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {obras.length}
        </Badge>
      </div>

      <SortableContext items={obras.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div 
          ref={setNodeRef}
          className={`space-y-2 min-h-[300px] p-2 rounded-lg border-2 border-dashed transition-all ${
            isOver 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-transparent hover:border-muted-foreground/20'
          } ${column.color}`}
        >
          {obras.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Nenhuma obra
            </div>
          ) : (
            obras.map((obra) => (
              <DraggableObraCard 
                key={obra.id} 
                obra={obra}
                onViewObra={onViewObra}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface DraggableObraCardProps {
  obra: ObraChecklist;
  onViewObra: (obra: ObraChecklist) => void;
}

function DraggableObraCard({ obra, onViewObra }: DraggableObraCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: obra.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const diasRestantes = obra.data_prevista_inauguracao 
    ? differenceInDays(new Date(obra.data_prevista_inauguracao), new Date())
    : null;

  const getStatusBadge = () => {
    if (obra.status_inauguracao === 'inaugurada') {
      return <Badge variant="default" className="bg-green-600 text-xs">Inaugurada</Badge>;
    }
    if (diasRestantes !== null) {
      if (diasRestantes < 0) {
        return <Badge variant="destructive" className="text-xs">Atrasada {Math.abs(diasRestantes)}d</Badge>;
      } else if (diasRestantes <= 30) {
        return <Badge variant="default" className="bg-yellow-600 text-xs">{diasRestantes}d restantes</Badge>;
      }
    }
    return null;
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`cursor-grab hover:shadow-lg transition-all ${isDragging ? 'shadow-2xl ring-2 ring-primary' : ''}`}
      {...attributes} 
      {...listeners}
    >
      <CardHeader className="pb-1 p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xs font-semibold line-clamp-2 flex-1">
            {obra.nome}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-primary/10 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onViewObra(obra);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-1">
          {getStatusBadge()}
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {obra.tipo}
          </Badge>
          {obra.tem_placa_inauguracao && (
            <Badge variant="default" className="bg-blue-600 text-[10px] px-1 py-0">
              Com Placa
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 p-3 space-y-1.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{obra.municipio}</span>
        </div>

        {obra.data_prevista_inauguracao && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5 shrink-0" />
            <span>
              {format(new Date(obra.data_prevista_inauguracao), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}

        {obra.checklist_progresso !== undefined && (
          <div className="space-y-0.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Checklist</span>
              <span className="font-medium">
                {obra.concluidos_checklist}/{obra.total_checklist}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all rounded-full"
                style={{ width: `${obra.checklist_progresso}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ObrasKanbanBoardProps {
  obras: ObraChecklist[];
  onObrasUpdate: () => void;
}

export function ObrasKanbanBoard({ obras, onObrasUpdate }: ObrasKanbanBoardProps) {
  const [activeObra, setActiveObra] = useState<ObraChecklist | null>(null);
  const [selectedObra, setSelectedObra] = useState<ObraChecklist | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Organizar obras por coluna
  const obrasPorColuna = useMemo(() => {
    const colunas: Record<string, ObraChecklist[]> = {
      pendente: [],
      em_checklist: [],
      aguardando: [],
      atrasadas: [],
      inauguradas: []
    };

    obras.forEach(obra => {
      // Inauguradas
      if (obra.status_inauguracao === 'inaugurada') {
        colunas.inauguradas.push(obra);
        return;
      }

      // Atrasadas
      if (obra.data_prevista_inauguracao) {
        const diasRestantes = differenceInDays(new Date(obra.data_prevista_inauguracao), new Date());
        if (diasRestantes < 0) {
          colunas.atrasadas.push(obra);
          return;
        }
      }

      // Em checklist (tem pelo menos um item de checklist)
      if (obra.total_checklist && obra.total_checklist > 0) {
        // Se checklist está completo, aguardando inauguração
        if (obra.checklist_progresso === 100) {
          colunas.aguardando.push(obra);
        } else {
          colunas.em_checklist.push(obra);
        }
        return;
      }

      // Pendente (sem checklist iniciado)
      colunas.pendente.push(obra);
    });

    return colunas;
  }, [obras]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const obra = obras.find(o => o.id === active.id);
    if (obra) {
      setActiveObra(obra);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveObra(null);

    if (!over) return;

    const obraId = active.id as string;
    const targetColumn = over.id as string;

    // Verificar se é uma coluna válida
    if (!columns.find(c => c.id === targetColumn)) {
      // Se não é uma coluna, pode ser outra obra, então pegue a coluna dessa obra
      const targetObra = obras.find(o => o.id === targetColumn);
      if (!targetObra) return;
      
      // Determinar a coluna da obra alvo
      for (const [colId, colObras] of Object.entries(obrasPorColuna)) {
        if (colObras.find(o => o.id === targetColumn)) {
          await updateObraStatus(obraId, colId);
          return;
        }
      }
      return;
    }

    await updateObraStatus(obraId, targetColumn);
  };

  const updateObraStatus = async (obraId: string, targetColumn: string) => {
    try {
      let updateData: any = {};

      switch (targetColumn) {
        case 'inauguradas':
          updateData.status_inauguracao = 'inaugurada';
          break;
        case 'aguardando':
          // Não altera status_inauguracao, apenas organização
          updateData.status_inauguracao = 'aguardando';
          break;
        case 'em_checklist':
        case 'pendente':
        case 'atrasadas':
          updateData.status_inauguracao = 'aguardando';
          break;
      }

      const { error } = await supabase
        .from('obras')
        .update(updateData)
        .eq('id', obraId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "A obra foi movida com sucesso!",
      });

      onObrasUpdate();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da obra.",
        variant: "destructive"
      });
    }
  };

  const handleViewObra = (obra: ObraChecklist) => {
    setSelectedObra(obra);
    setViewModalOpen(true);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Arraste as obras entre as colunas para alterar o status
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              obras={obrasPorColuna[column.id] || []}
              onViewObra={handleViewObra}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeObra ? (
          <Card className="shadow-2xl ring-2 ring-primary rotate-3">
            <CardHeader className="pb-1 p-3">
              <CardTitle className="text-xs font-semibold line-clamp-2">
                {activeObra.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-3">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span>{activeObra.municipio}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      <ViewObraChecklistModal
        obra={selectedObra}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        onUpdate={onObrasUpdate}
      />
    </DndContext>
  );
}
