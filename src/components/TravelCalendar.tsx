import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, MapPin, User, Clock } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Travel } from '@/types/travel';
import { CreateTravelModal } from './CreateTravelModal';
import { EditTravelModal } from './EditTravelModal';
import { ViewTravelModal } from './ViewTravelModal';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';

export function TravelCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [travels, setTravels] = useState<Travel[]>([]);
  const [filteredTravels, setFilteredTravels] = useState<Travel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  
  // Filtros
  const [servidorFilter, setServidorFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  
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
    
    // Filtro por mês
    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const monthEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      
      filtered = filtered.filter(travel => {
        const startDate = parseISO(travel.data_ida);
        const endDate = parseISO(travel.data_volta);
        return isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
               isWithinInterval(endDate, { start: monthStart, end: monthEnd }) ||
               (startDate <= monthStart && endDate >= monthEnd);
      });
    }
    
    setFilteredTravels(filtered);
  }, [travels, servidorFilter, monthFilter]);

  const getTravelsForDate = (date: Date) => {
    return filteredTravels.filter(travel => {
      const startDate = parseISO(travel.data_ida);
      const endDate = parseISO(travel.data_volta);
      return isWithinInterval(date, { start: startDate, end: endDate });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Planejamento de Viagens</h2>
          <p className="text-muted-foreground">Gerencie viagens de manutenção de servidores</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Viagem
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servidor-filter">Servidor</Label>
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
              <Label htmlFor="month-filter">Mês/Ano</Label>
              <Input
                id="month-filter"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total de Viagens</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{filteredTravels.length} viagens</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="h-5 w-5 mr-2" />
              Calendário de Viagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
              modifiers={{
                hasTravel: (date) => getTravelsForDate(date).length > 0,
              }}
              modifiersClassNames={{
                hasTravel: "relative after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
              }}
            />
          </CardContent>
        </Card>

        {/* Lista de viagens do dia selecionado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Viagens em {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getTravelsForDate(selectedDate).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma viagem neste dia
                </p>
              ) : (
                getTravelsForDate(selectedDate).map(travel => (
                  <Card key={travel.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleViewTravel(travel)}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-sm">{travel.servidor}</span>
                        </div>
                        {canEdit && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTravel(travel);
                            }}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{travel.destino}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(parseISO(travel.data_ida), 'dd/MM')} - {format(parseISO(travel.data_volta), 'dd/MM')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {travel.motivo}
                      </p>
                    </div>
                  </Card>
                ))
              )}
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