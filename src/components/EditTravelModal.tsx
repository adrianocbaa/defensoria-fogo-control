import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, MapPin, User, FileText, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Travel } from '@/types/travel';
import { toast } from '@/hooks/use-toast';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { ManagersMultiSelect } from './ManagersMultiSelect';
import {
  checkTravelLimit,
  LimitViolation,
  computeReturnDate,
  diariasHint,
  DIARIAS_OPTIONS,
} from '@/lib/travelDaysLimit';
import { TravelLimitConfirmDialog } from './TravelLimitConfirmDialog';

function firstName(n: string) {
  return (n.trim().split(/\s+/)[0] || '').trim();
}
function formatDiarias(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface EditTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  travel: Travel;
  onTravelUpdated: () => void;
  onTravelDeleted: () => void;
}

export function EditTravelModal({ isOpen, onClose, travel, onTravelUpdated, onTravelDeleted }: EditTravelModalProps) {
  const { managers } = useMaintenanceManagers();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [semPrevisao, setSemPrevisao] = useState(!travel.data_ida);
  const [managerIds, setManagerIds] = useState<string[]>(travel.manager_ids ?? []);
  const [servidorLegado] = useState(travel.servidor);
  const [destino, setDestino] = useState(travel.destino);
  const [motivo, setMotivo] = useState(travel.motivo);
  const [dataIda, setDataIda] = useState<string | null>(travel.data_ida);
  const [diarias, setDiarias] = useState<number>(
    travel.diarias
      ? Number(travel.diarias)
      : 1
  );
  const [dataIdaOpen, setDataIdaOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [confirmLimitOpen, setConfirmLimitOpen] = useState(false);

  const dataVoltaCalc = useMemo(() => {
    if (semPrevisao || !dataIda || !diarias) return null;
    return computeReturnDate(dataIda, diarias);
  }, [semPrevisao, dataIda, diarias]);

  const validateForm = () => {
    if (managerIds.length === 0 && !servidorLegado.trim()) {
      toast({ title: 'Erro', description: 'Selecione ao menos um servidor da manutenção', variant: 'destructive' });
      return false;
    }
    if (!destino.trim()) {
      toast({ title: 'Erro', description: 'Destino é obrigatório', variant: 'destructive' });
      return false;
    }
    if (!semPrevisao) {
      if (!dataIda) {
        toast({ title: 'Erro', description: 'Informe a data de saída', variant: 'destructive' });
        return false;
      }
      if (!diarias || diarias < 0.5) {
        toast({ title: 'Erro', description: 'Informe a quantidade de diárias', variant: 'destructive' });
        return false;
      }
    }
    if (!motivo.trim()) {
      toast({ title: 'Erro', description: 'Motivo da viagem é obrigatório', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const persistUpdate = async () => {
    setLoading(true);
    try {
      const servidorFromIds = managerIds.length > 0
        ? managerIds.map((id) => managers.find((m) => m.id === id)?.nome).filter(Boolean).map((n) => firstName(String(n))).filter(Boolean).join(' / ')
        : servidorLegado;
      const { error } = await supabase.from('travels').update({
        servidor: servidorFromIds || servidorLegado,
        destino,
        motivo,
        data_ida: semPrevisao ? null : dataIda,
        data_volta: semPrevisao ? null : dataVoltaCalc,
        diarias: semPrevisao ? null : diarias,
        manager_ids: managerIds,
      }).eq('id', travel.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Viagem atualizada com sucesso' });
      onTravelUpdated();
    } catch (error) {
      console.error('Erro ao atualizar viagem:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar viagem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!semPrevisao && dataIda && diarias && managerIds.length > 0) {
      const vs = await checkTravelLimit({ managerIds, managers, dataIda, diarias, excludeTravelId: travel.id });
      if (vs.length > 0) {
        setViolations(vs);
        setConfirmLimitOpen(true);
        return;
      }
    }
    await persistUpdate();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('travels').delete().eq('id', travel.id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Viagem excluída com sucesso' });
      onTravelDeleted();
    } catch (error) {
      console.error('Erro ao excluir viagem:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir viagem', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Editar Viagem
              </div>
              <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center"><User className="h-4 w-4 mr-2" />Servidor(es) da manutenção *</Label>
              <ManagersMultiSelect value={managerIds} onChange={setManagerIds} placeholder="Selecione um ou mais servidores..." />
              {managerIds.length === 0 && servidorLegado && (
                <p className="text-[11px] text-muted-foreground">
                  Registro legado: <strong>{servidorLegado}</strong>. Selecione os servidores acima para atualizar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destino" className="flex items-center"><MapPin className="h-4 w-4 mr-2" />Destino</Label>
              <Input id="destino" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Cidade/Local de destino" required />
            </div>

            <div className="flex items-center space-x-2 py-1">
              <Checkbox
                id="sem-previsao"
                checked={semPrevisao}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setSemPrevisao(isChecked);
                  if (isChecked) setDataIda(null);
                }}
              />
              <Label htmlFor="sem-previsao" className="text-sm font-medium cursor-pointer">Sem previsão de data</Label>
            </div>

            <div className={`grid grid-cols-2 gap-4 ${semPrevisao ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-2">
                <Label>Data de Saída</Label>
                <Popover open={dataIdaOpen} onOpenChange={setDataIdaOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dataIda && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataIda
                        ? format(new Date(dataIda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                        : semPrevisao ? 'Sem previsão' : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataIda ? new Date(dataIda + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) setDataIda(format(date, 'yyyy-MM-dd'));
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
                <Label>Diárias</Label>
                <Select value={String(diarias)} onValueChange={(v) => setDiarias(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DIARIAS_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {formatDiarias(d)} {d === 1 ? 'diária' : 'diárias'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!semPrevisao && dataVoltaCalc && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data de volta prevista:</span>
                  <strong>{format(new Date(dataVoltaCalc + 'T12:00:00'), "EEEE, dd/MM/yyyy", { locale: ptBR })}</strong>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{diariasHint(diarias)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivo" className="flex items-center"><FileText className="h-4 w-4 mr-2" />Motivo da Viagem</Label>
              <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo/objetivo da viagem" rows={3} required />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta viagem? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TravelLimitConfirmDialog
        open={confirmLimitOpen}
        onOpenChange={setConfirmLimitOpen}
        violations={violations}
        onConfirm={async () => {
          setConfirmLimitOpen(false);
          await persistUpdate();
        }}
      />
    </>
  );
}
