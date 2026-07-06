import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useMaintenanceUsers } from '@/hooks/useMaintenanceUsers';
import { useMaintenanceTypes } from '@/hooks/useMaintenanceTypes';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useNucleiList } from '@/hooks/useNucleiList';
import { NucleoCombobox } from '@/components/ui/nucleo-combobox';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  createdAt: string;
  icon: any;
  status: string;
  observations?: string[];
  services?: { name: string; completed: boolean }[];
  materials?: { name: string; completed: boolean }[];
  requestType?: 'email' | 'processo' | 'direto';
  processNumber?: string;
  requestedAt?: string;
  managerId?: string | null;
  nucleoId?: string | null;
}

interface EditTaskModalProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (ticket: Ticket) => void;
}

export function EditTaskModal({ ticket, open, onOpenChange, onUpdateTask }: EditTaskModalProps) {
  const { isGM } = useUserRole();
  const { types: taskTypes } = useMaintenanceTypes();
  const { managers } = useMaintenanceManagers();
  const { nuclei } = useNucleiList();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    priority: '' as 'Alta' | 'Média' | 'Baixa' | '',
    type: '',
    location: '',
    assignee: '',
    status: '',
  });

  const [observation, setObservation] = useState('');
  const [observations, setObservations] = useState<string[]>([]);
  const [services, setServices] = useState<{ name: string; completed: boolean }[]>([]);
  const [materials, setMaterials] = useState<{ name: string; completed: boolean }[]>([]);
  const [newService, setNewService] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [requestType, setRequestType] = useState<'email' | 'processo' | 'direto' | ''>('');
  const [processNumber, setProcessNumber] = useState('');
  const [requestedAt, setRequestedAt] = useState<string>('');
  const [managerId, setManagerId] = useState<string>('');
  const [nucleoId, setNucleoId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title,
        priority: ticket.priority,
        type: ticket.type,
        location: ticket.location,
        assignee: ticket.assignee,
        status: ticket.status || 'Em andamento',
      });
      setObservations(ticket.observations || []);
      setServices(ticket.services || []);
      setMaterials(ticket.materials || []);
      setRequestType(ticket.requestType || '');
      setProcessNumber(ticket.processNumber || '');
      setRequestedAt(ticket.requestedAt || '');
      setManagerId(ticket.managerId || '');
      setNucleoId(ticket.nucleoId || '');
      setCurrentStep(1);
    }
  }, [ticket]);

  const addObservation = () => {
    if (observation.trim()) {
      setObservations((prev) => [
        ...prev,
        `${observation} - Usuário Admin (${new Date().toLocaleString()})`,
      ]);
      setObservation('');
    }
  };
  const removeObservation = (i: number) =>
    setObservations((prev) => prev.filter((_, idx) => idx !== i));

  const addService = () => {
    if (newService.trim()) {
      setServices((prev) => [...prev, { name: newService, completed: false }]);
      setNewService('');
    }
  };
  const toggleService = (i: number) =>
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, completed: !s.completed } : s)));
  const removeService = (i: number) => setServices((prev) => prev.filter((_, idx) => idx !== i));

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials((prev) => [...prev, { name: newMaterial, completed: false }]);
      setNewMaterial('');
    }
  };
  const toggleMaterial = (i: number) =>
    setMaterials((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, completed: !m.completed } : m))
    );
  const removeMaterial = (i: number) => setMaterials((prev) => prev.filter((_, idx) => idx !== i));

  const servicesProgress = services.length
    ? (services.filter((s) => s.completed).length / services.length) * 100
    : 0;
  const materialsProgress = materials.length
    ? (materials.filter((m) => m.completed).length / materials.length) * 100
    : 0;

  // Preserva o valor original do tipo mesmo que ele não exista mais na lista
  const typeOptions = (() => {
    const list = taskTypes.map((t) => t.nome);
    if (formData.type && !list.includes(formData.type)) return [formData.type, ...list];
    return list;
  })();

  // Preserva o gerente atribuído mesmo se ele não estiver mais na lista atual
  const managerOptions = (() => {
    const base = managers.map((m) => ({ id: m.id, nome: m.nome }));
    if (managerId && !base.some((m) => m.id === managerId)) {
      return [{ id: managerId, nome: 'Gerente atribuído' }, ...base];
    }
    return base;
  })();

  const step1Valid =
    !!formData.title &&
    !!formData.priority &&
    !!formData.type &&
    !!formData.location &&
    !!formData.assignee;

  const step2Valid = isGM || (!!requestType && (requestType !== 'processo' || !!processNumber));

  const goNext = () => {
    if (currentStep === 1 && !step1Valid) {
      toast({ title: 'Preencha os campos obrigatórios da Etapa 1', variant: 'destructive' });
      return;
    }
    if (currentStep === 2 && !step2Valid) {
      toast({ title: 'Preencha os campos obrigatórios da Etapa 2', variant: 'destructive' });
      return;
    }
    setCurrentStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };
  const goBack = () => setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  const handleSubmit = async () => {
    if (!ticket) return;

    if (!formData.status) return;

    const selectedTaskType = taskTypes.find((t) => t.nome === formData.type);

    const updatedTicket: Ticket = {
      ...ticket,
      title: isGM ? ticket.title : formData.title,
      priority: isGM ? ticket.priority : (formData.priority as 'Alta' | 'Média' | 'Baixa'),
      type: isGM ? ticket.type : formData.type,
      location: isGM ? ticket.location : formData.location,
      assignee: isGM ? ticket.assignee : formData.assignee,
      icon: selectedTaskType?.icon || ticket.icon,
      status: formData.status,
      observations,
      services,
      materials,
      requestType: isGM
        ? ticket.requestType
        : (requestType as 'email' | 'processo' | 'direto'),
      processNumber: isGM
        ? ticket.processNumber
        : requestType === 'processo'
          ? processNumber
          : undefined,
      requestedAt: requestedAt || ticket.requestedAt,
      managerId: managerId || null,
      nucleoId: nucleoId || null,
    };

    try {
      await onUpdateTask(updatedTicket);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  if (!ticket) return null;

  const stepLabels = ['Dados Básicos', 'Serviços e Materiais', 'Execução'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarefa - {ticket.id}</DialogTitle>
        </DialogHeader>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, idx) => {
            const step = (idx + 1) as 1 | 2 | 3;
            const active = currentStep === step;
            const done = currentStep > step;
            return (
              <div key={step} className="flex-1 flex items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : done
                        ? 'bg-primary/70 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                <div className={`ml-2 text-xs ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {label}
                </div>
                {step < 3 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Descreva o problema..."
                  disabled={isGM}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, priority: v as 'Alta' | 'Média' | 'Baixa' }))
                    }
                    disabled={isGM}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}
                    disabled={isGM}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((nome) => (
                        <SelectItem key={nome} value={nome}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  disabled={isGM}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Solicitante</Label>
                <Input
                  id="assignee"
                  value={formData.assignee}
                  onChange={(e) => setFormData((p) => ({ ...p, assignee: e.target.value }))}
                  disabled={isGM}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedAt">Data de Solicitação</Label>
                <Input
                  id="requestedAt"
                  type="date"
                  value={requestedAt}
                  onChange={(e) => setRequestedAt(e.target.value)}
                  disabled={isGM}
                />
              </div>

              <div className="space-y-2">
                <Label>Gerente de Manutenção Responsável</Label>
                <Select value={managerId} onValueChange={setManagerId} disabled={isGM}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gerente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Núcleo Requerente</Label>
                <NucleoCombobox
                  options={nuclei}
                  value={nucleoId}
                  onChange={setNucleoId}
                  placeholder="Selecione um núcleo..."
                  disabled={isGM}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Serviços</Label>
                <div className="flex gap-2">
                  <Input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="Adicionar serviço..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                  />
                  <Button type="button" onClick={addService} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {services.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                    {services.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm flex-1">{s.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(i)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Materiais</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    placeholder="Adicionar material..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                  />
                  <Button type="button" onClick={addMaterial} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {materials.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                    {materials.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm flex-1">{m.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterial(i)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <div className="flex gap-2">
                  <Input
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Digite uma observação..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObservation())}
                  />
                  <Button type="button" onClick={addObservation} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {observations.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 border rounded-md bg-muted/30">
                    {observations.map((obs, i) => (
                      <div key={i} className="flex justify-between items-start gap-2">
                        <div className="text-sm text-muted-foreground flex-1">{obs}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeObservation(i)}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isGM && (
                <div className="space-y-3">
                  <Label>Tipo de Solicitação *</Label>
                  <RadioGroup
                    value={requestType}
                    onValueChange={(v) =>
                      setRequestType(v as 'email' | 'processo' | 'direto')
                    }
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="edit-email" />
                      <Label htmlFor="edit-email">E-mail</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="processo" id="edit-processo" />
                      <Label htmlFor="edit-processo">SEI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direto" id="edit-direto" />
                      <Label htmlFor="edit-direto">Direto</Label>
                    </div>
                  </RadioGroup>

                  {requestType === 'processo' && (
                    <div className="space-y-2">
                      <Label htmlFor="processNumber">Número do SEI</Label>
                      <Input
                        id="processNumber"
                        value={processNumber}
                        onChange={(e) => setProcessNumber(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Impedido">Impedido</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {services.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Serviços Executados</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(servicesProgress)}%
                    </span>
                  </div>
                  <Progress value={servicesProgress} className="w-full" />
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                    {services.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox
                          checked={s.completed}
                          onCheckedChange={() => toggleService(i)}
                        />
                        <span
                          className={`text-sm ${s.completed ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {s.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {materials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Materiais Utilizados</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(materialsProgress)}%
                    </span>
                  </div>
                  <Progress value={materialsProgress} className="w-full" />
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                    {materials.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox
                          checked={m.completed}
                          onCheckedChange={() => toggleMaterial(i)}
                        />
                        <span
                          className={`text-sm ${m.completed ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={goBack}>
                  Voltar
                </Button>
              )}
              {currentStep < 3 ? (
                <Button type="button" onClick={goNext}>
                  Próximo
                </Button>
              ) : (
                <Button type="submit">Salvar Alterações</Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
