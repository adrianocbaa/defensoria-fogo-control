import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, MapPin, User, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Travel } from '@/types/travel';

import { EditTravelModal } from './EditTravelModal';
import { ViewTravelModal } from './ViewTravelModal';
import { ViewTaskModal } from './ViewTaskModal';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { useMaintenanceTickets, MaintenanceTicket } from '@/hooks/useMaintenanceTickets';

export function TravelCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [travels, setTravels] = useState<Travel[]>([]);
  const [filteredTravels, setFilteredTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showViewTaskModal, setShowViewTaskModal] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTicket | null>(null);
  
  // Filtros
  const [servidorFilter, setServidorFilter] = useState('');
  const [destinoFilter, setDestinoFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // View modes
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  
  const { canEdit } = useUserRole();
  const { tickets } = useMaintenanceTickets();
  
  const fetchTravels = async () => {
    try {
      const { data, error } = await supabase
        .from('travels')
        .select('*')
        .order('data_ida', { ascending: true });
      
      if (error) throw error;
      setTravels(data || []);
    } catch (error) {
      console.error('Erro ao buscar viagens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar viagens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravels();
  }, []);

  useEffect(() => {
    let filtered = travels;
    
    // Filtro por servidor
    if (servidorFilter) {
      filtered = filtered.filter(travel => 
        travel.servidor.toLowerCase().includes(servidorFilter.toLowerCase())
      );
    }
    
    // Filtro por destino
    if (destinoFilter) {
      filtered = filtered.filter(travel => 
        travel.destino.toLowerCase().includes(destinoFilter.toLowerCase())
      );
    }
    
    setFilteredTravels(filtered);
  }, [travels, servidorFilter, destinoFilter]);

  const getTravelsForDate = (date: Date) => {
    return filteredTravels.filter(travel => {
      const startDate = parseISO(travel.data_ida);
      const endDate = parseISO(travel.data_volta);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  const getTravelPosition = (travel: Travel, date: Date) => {
    const startDate = parseISO(travel.data_ida);
    const endDate = parseISO(travel.data_volta);
    
    // Verificar se a data atual está dentro do período da viagem
    const isWithinTravel = isWithinInterval(date, { start: startDate, end: endDate });
    
    if (!isWithinTravel) {
      return { show: false, position: 'middle' };
    }
    
    // Determinar se deve mostrar e qual posição
    if (isSameDay(startDate, endDate)) {
      return { show: true, position: 'single' };
    } else if (isSameDay(date, startDate)) {
      return { show: true, position: 'start' };
    } else if (isSameDay(date, endDate)) {
      return { show: true, position: 'end' };
    } else {
      return { show: true, position: 'middle' };
    }
  };

  const getTravelsForMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return filteredTravels.filter(travel => {
      const startDate = parseISO(travel.data_ida);
      const endDate = parseISO(travel.data_volta);
      return isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
             isWithinInterval(endDate, { start: monthStart, end: monthEnd }) ||
             (startDate <= monthStart && endDate >= monthEnd);
    });
  };

  const handleViewTravel = (travel: Travel) => {
    // Buscar a tarefa relacionada à viagem
    const allTickets = [...tickets['Pendente'], ...tickets['Em andamento'], ...tickets['Concluído']];
    const relatedTask = allTickets.find(ticket => ticket.travel_id === travel.id);
    
    if (relatedTask) {
      // Se encontrou a tarefa, mostrar o modal da tarefa
      setSelectedTask(relatedTask);
      setShowViewTaskModal(true);
    } else {
      // Se não encontrou, mostrar o modal da viagem
      setSelectedTravel(travel);
      setShowViewModal(true);
    }
  };

  const handleEditTravel = (travel: Travel) => {
    setSelectedTravel(travel);
    setShowEditModal(true);
  };


  const handleTravelUpdated = () => {
    fetchTravels();
    setShowEditModal(false);
  };

  const handleTravelDeleted = () => {
    fetchTravels();
    setShowEditModal(false);
  };

  const uniqueServidores = [...new Set(travels.map(travel => travel.servidor))];
  const uniqueDestinos = [...new Set(travels.map(travel => travel.destino))];

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Dias do mês anterior para completar a semana
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, new Date(year, month, 0).getDate() - i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Dias do próximo mês para completar o grid
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalCells) {
      const date = new Date(year, month + 1, nextMonthDay);
      days.push({ date, isCurrentMonth: false });
      nextMonthDay++;
    }
    
    return days;
  };

  const getTravelColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p>Carregando viagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with improved layout */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 px-6 py-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário de Viagens</h1>
            <p className="text-muted-foreground">Gerencie viagens de manutenção de servidores</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Improved Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por Servidor</Label>
                <Select value={servidorFilter} onValueChange={setServidorFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os servidores</SelectItem>
                    {uniqueServidores.map(servidor => (
                      <SelectItem key={servidor} value={servidor}>
                        {servidor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Destino</Label>
                <Select value={destinoFilter} onValueChange={setDestinoFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os destinos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os destinos</SelectItem>
                    {uniqueDestinos.map(destino => (
                      <SelectItem key={destino} value={destino}>
                        {destino}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total do Mês</Label>
                <Badge variant="secondary" className="w-fit h-6">
                  {getTravelsForMonth().length} viagens
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Calendar Layout */}
      <div className="flex-1 p-6 bg-muted/5">
        <div className="max-w-full h-full">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6 bg-card p-4 rounded-lg border shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 mx-1">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="h-9 px-3"
                >
                  month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="h-9 px-3"
                >
                  week
                </Button>
                <Button
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="h-9 px-3"
                >
                  day
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-9 px-3"
                >
                  list
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-4 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7">
              {getDaysInMonth().map(({ date, isCurrentMonth }, index) => {
                const daysInMonth = getDaysInMonth();
                const dayTravels = getTravelsForDate(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={index}
                    className={`
                      relative min-h-[120px] border-r border-b last:border-r-0 p-2 transition-colors
                      ${isCurrentMonth ? 'bg-background hover:bg-muted/20' : 'bg-muted/10'}
                      ${isToday ? 'bg-primary/5 border-primary/20' : ''}
                    `}
                  >
                    {/* Date Number */}
                    <div className={`
                      inline-flex items-center justify-center w-7 h-7 text-sm font-medium mb-2 rounded-full
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                    `}>
                      {date.getDate()}
                    </div>
                    
                    {/* Travel Events */}
                    <div className="space-y-1">
                      {dayTravels.map((travel, travelIndex) => {
                        const position = getTravelPosition(travel, date);
                        
                        if (!position.show) return null;
                        
                        return (
                          <div
                            key={travel.id}
                            className={`
                              relative text-xs cursor-pointer transition-all hover:opacity-80 group mb-0.5
                              ${getTravelColor(travelIndex)}
                              ${position.position === 'start' ? 'rounded-l-md rounded-r-none ml-0' : ''}
                              ${position.position === 'end' ? 'rounded-r-md rounded-l-none mr-0' : ''}
                              ${position.position === 'middle' ? 'rounded-none mx-0' : ''}
                              ${position.position === 'single' ? 'rounded-md' : ''}
                              px-2 py-1 border h-6 flex items-center
                            `}
                            style={{
                              marginLeft: position.position === 'start' || position.position === 'single' ? '0' : '-1px',
                              marginRight: position.position === 'end' || position.position === 'single' ? '0' : '-1px',
                              zIndex: 10 + travelIndex
                            }}
                            onClick={() => handleViewTravel(travel)}
                            title={`${travel.servidor} - ${travel.destino}`}
                          >
                            {/* Show content only on start or single day */}
                            {position.position === 'start' || position.position === 'single' ? (
                              <div className="flex items-center gap-1 w-full min-w-0">
                                <div className="font-medium truncate text-[11px] flex-1">
                                  {travel.servidor}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-75 text-[10px]">
                                  <MapPin className="h-2 w-2 flex-shrink-0" />
                                  <span className="truncate max-w-[40px]">{travel.destino}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}

      {selectedTravel && (
        <>
          <ViewTravelModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            travel={selectedTravel}
            onEdit={() => {
              setShowViewModal(false);
              setShowEditModal(true);
            }}
          />

          <EditTravelModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            travel={selectedTravel}
            onTravelUpdated={handleTravelUpdated}
            onTravelDeleted={handleTravelDeleted}
          />
        </>
      )}

      {selectedTask && (
        <ViewTaskModal
          ticket={{
            ...selectedTask,
            createdAt: new Date(selectedTask.created_at).toLocaleDateString('pt-BR'),
            requestType: selectedTask.request_type,
            processNumber: selectedTask.process_number,
            icon: null
          }}
          open={showViewTaskModal}
          onOpenChange={setShowViewTaskModal}
        />
      )}
    </div>
  );
}