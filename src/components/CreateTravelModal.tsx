import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, MapPin, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { CreateTravelData } from '@/types/travel';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';

interface CreateTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTravelCreated: () => void;
}

export function CreateTravelModal({ isOpen, onClose, onTravelCreated }: CreateTravelModalProps) {
  const { user } = useAuth();
  const { createTicket } = useMaintenanceTickets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTravelData>({
    servidor: '',
    destino: '',
    data_ida: '',
    data_volta: '',
    motivo: ''
  });
  const [dataIdaOpen, setDataIdaOpen] = useState(false);
  const [dataVoltaOpen, setDataVoltaOpen] = useState(false);

  const validateForm = () => {
    if (!formData.servidor.trim()) {
      toast({
        title: "Erro",
        description: "Nome do servidor é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.destino.trim()) {
      toast({
        title: "Erro",
        description: "Destino é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.data_ida || !formData.data_volta) {
      toast({
        title: "Erro",
        description: "Datas de ida e volta são obrigatórias",
        variant: "destructive",
      });
      return false;
    }

    if (new Date(formData.data_ida) > new Date(formData.data_volta)) {
      toast({
        title: "Erro",
        description: "Data de ida não pode ser posterior à data de volta",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.motivo.trim()) {
      toast({
        title: "Erro",
        description: "Motivo da viagem é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Primeiro criar a viagem
      const { data: travelData, error: travelError } = await supabase
        .from('travels')
        .insert([{
          ...formData,
          user_id: user?.id
        }])
        .select()
        .single();

      if (travelError) throw travelError;

      // Agora criar a tarefa de manutenção relacionada
      const ticketData = {
        title: `Viagem de Manutenção - ${formData.destino}`,
        priority: 'Média' as 'Alta' | 'Média' | 'Baixa',
        type: 'Viagem',
        location: formData.destino,
        assignee: formData.servidor,
        status: 'Pendente' as 'Pendente' | 'Em andamento' | 'Concluído',
        observations: [formData.motivo],
        travel_id: travelData.id
      };

      await createTicket(ticketData);

      // Atualizar a viagem com o ID da tarefa
      const { error: updateError } = await supabase
        .from('travels')
        .update({ ticket_id: travelData.id })
        .eq('id', travelData.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Viagem e tarefa de manutenção criadas com sucesso",
      });

      setFormData({
        servidor: '',
        destino: '',
        data_ida: '',
        data_volta: '',
        motivo: ''
      });

      onTravelCreated();
      onClose();
    } catch (error) {
      console.error('Erro ao criar viagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar viagem e tarefa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined, field: 'data_ida' | 'data_volta') => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Nova Viagem
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="servidor" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Servidor
            </Label>
            <Input
              id="servidor"
              value={formData.servidor}
              onChange={(e) => setFormData(prev => ({ ...prev, servidor: e.target.value }))}
              placeholder="Nome do servidor público"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destino" className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Destino
            </Label>
            <Input
              id="destino"
              value={formData.destino}
              onChange={(e) => setFormData(prev => ({ ...prev, destino: e.target.value }))}
              placeholder="Cidade/Local de destino"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Ida</Label>
              <Popover open={dataIdaOpen} onOpenChange={setDataIdaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_ida && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_ida 
                      ? format(new Date(formData.data_ida), "dd/MM/yyyy", { locale: ptBR })
                      : "Selecionar data"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.data_ida ? new Date(formData.data_ida) : undefined}
                    onSelect={(date) => {
                      handleDateSelect(date, 'data_ida');
                      setDataIdaOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Volta</Label>
              <Popover open={dataVoltaOpen} onOpenChange={setDataVoltaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_volta && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_volta 
                      ? format(new Date(formData.data_volta), "dd/MM/yyyy", { locale: ptBR })
                      : "Selecionar data"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.data_volta ? new Date(formData.data_volta) : undefined}
                    onSelect={(date) => {
                      handleDateSelect(date, 'data_volta');
                      setDataVoltaOpen(false);
                    }}
                    disabled={(date) => {
                      if (!formData.data_ida) return date < new Date();
                      const minDate = new Date(formData.data_ida);
                      minDate.setHours(0, 0, 0, 0);
                      const currentDate = new Date(date);
                      currentDate.setHours(0, 0, 0, 0);
                      return currentDate < minDate;
                    }}
                    locale={ptBR}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Motivo da Viagem
            </Label>
            <Textarea
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Descreva o motivo/objetivo da viagem"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Viagem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}