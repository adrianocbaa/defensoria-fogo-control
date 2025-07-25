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
import { CreateTravelModal } from './CreateTravelModal';
import { EditTravelModal } from './EditTravelModal';
import { ViewTravelModal } from './ViewTravelModal';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';

export function TravelCalendar() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [travels, setTravels] = useState<Travel[]>([]);
  const [filteredTravels, setFilteredTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  
  // Filtros
  const [servidorFilter, setServidorFilter] = useState('');
  const [destinoFilter, setDestinoFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const { canEdit } = useUserRole();
  
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
    setSelectedTravel(travel);
    setShowViewModal(true);
  };

  const handleEditTravel = (travel: Travel) => {
    setSelectedTravel(travel);
    setShowEditModal(true);
  };

  const handleTravelCreated = () => {
    fetchTravels();
    setShowCreateModal(false);
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
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Calendário de Viagens</h1>
            <p className="text-muted-foreground">Gerencie viagens de manutenção de servidores</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            {canEdit && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Viagem
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Servidor</Label>
                <Select value={servidorFilter} onValueChange={setServidorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os servidores" />
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
                <Label>Destino</Label>
                <Select value={destinoFilter} onValueChange={setDestinoFilter}>
                  <SelectTrigger>
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
                <Label>Total do Mês</Label>
                <Badge variant="secondary" className="w-fit">
                  {getTravelsForMonth().length} viagens
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendário */}
      <div className="flex-1 p-6">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map(({ date, isCurrentMonth }, index) => {
                const dayTravels = getTravelsForDate(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[120px] p-2 border rounded-lg transition-colors hover:bg-muted/50
                      ${isCurrentMonth ? 'bg-background' : 'bg-muted/20'}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-2
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isToday ? 'text-primary font-bold' : ''}
                    `}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayTravels.slice(0, 3).map((travel, travelIndex) => (
                        <div
                          key={travel.id}
                          className={`
                            text-xs p-1 rounded border cursor-pointer transition-all hover:scale-105
                            ${getTravelColor(travelIndex)}
                          `}
                          onClick={() => handleViewTravel(travel)}
                          title={`${travel.servidor} - ${travel.destino}`}
                        >
                          <div className="font-medium truncate">
                            {travel.servidor}
                          </div>
                          <div className="flex items-center gap-1 opacity-75">
                            <MapPin className="h-2 w-2" />
                            <span className="truncate">{travel.destino}</span>
                          </div>
                        </div>
                      ))}
                      
                      {dayTravels.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          +{dayTravels.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <CreateTravelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTravelCreated={handleTravelCreated}
      />

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
    </div>
  );
}