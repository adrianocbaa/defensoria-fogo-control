import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, MapPin, User, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Travel } from '@/types/travel';
import { toast } from '@/hooks/use-toast';

interface EditTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  travel: Travel;
  onTravelUpdated: () => void;
  onTravelDeleted: () => void;
}

export function EditTravelModal({ 
  isOpen, 
  onClose, 
  travel, 
  onTravelUpdated, 
  onTravelDeleted 
}: EditTravelModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    servidor: travel.servidor,
    destino: travel.destino,
    data_ida: travel.data_ida,
    data_volta: travel.data_volta,
    motivo: travel.motivo
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
      const { error } = await supabase
        .from('travels')
        .update(formData)
        .eq('id', travel.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Viagem atualizada com sucesso",
      });

      onTravelUpdated();
    } catch (error) {
      console.error('Erro ao atualizar viagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar viagem",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('travels')
        .delete()
        .eq('id', travel.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Viagem excluída com sucesso",
      });

      onTravelDeleted();
    } catch (error) {
      console.error('Erro ao excluir viagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir viagem",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
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
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Editar Viagem
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta viagem? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                      const minDate = formData.data_ida ? new Date(formData.data_ida) : new Date();
                      return date < minDate;
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}