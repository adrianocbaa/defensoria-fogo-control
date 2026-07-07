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
import { useMaintenanceTypes } from '@/hooks/useMaintenanceTypes';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useNucleiList } from '@/hooks/useNucleiList';
import { NucleoCombobox } from '@/components/ui/nucleo-combobox';
import { ManagersMultiSelect } from '@/components/ManagersMultiSelect';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { TicketServicesEditor } from './TicketServicesEditor';
import type { TicketService } from '@/hooks/useTicketServices';
import type { UITicket } from '@/types/maintenanceTicket';

interface EditTaskModalProps {
  ticket: UITicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (ticket: UITicket) => void | Promise<void>;
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
  const [services, setServices] = useState<TicketService[]>([]);
  const [materials, setMaterials] = useState<{ name: string; completed: boolean }[]>([]);
  const [newMaterial, setNewMaterial] = useState('');
  const [requestType, setRequestType] = useState<'email' | 'processo' | 'direto' | ''>('');
  const [processNumber, setProcessNumber] = useState('');
  const [requestedAt, setRequestedAt] = useState<string>('');
  const [managerIds, setManagerIds] = useState<string[]>([]);
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
      setServices((ticket.services || []).map((s, i) => ({ ...s, order_index: s.order_index ?? i })));
      setMaterials(ticket.materials || []);
      setRequestType(ticket.requestType || '');
      setProcessNumber(ticket.processNumber || '');
      setRequestedAt(ticket.requestedAt || '');
      setManagerIds(ticket.managerIds && ticket.managerIds.length > 0 ? ticket.managerIds : (ticket.managerId ? [ticket.managerId] : []));
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

  const materialsProgress = materials.length
    ? (materials.filter((m) => m.completed).length / materials.length) * 100
    : 0;

  const allServicesDone = services.length > 0 && services.every((s) => s.completed);

  const typeOptions = (() => {
    const list = taskTypes.map((t) => t.nome);
    if (formData.type && !list.includes(formData.type)) return [formData.type, ...list];
    return list;
  })();

  // managerOptions removido — substituído por multi-seleção via ManagersMultiSelect

  const selectedNucleo = nuclei.find((n) => n.id === nucleoId);
  const derivedLocation = selectedNucleo?.cidade || selectedNucleo?.name || formData.location;

  const step1Valid =
    !!formData.title &&
    !!formData.priority &&
    !!formData.type &&
    !!nucleoId &&
    !!formData.assignee;

  const step2Valid =
    services.every((s) => !!s.title.trim()) &&
    (isGM || (!!requestType && (requestType !== 'processo' || !!processNumber)));

  const goNext = () => {
    if (currentStep === 1 && !step1Valid) {
      toast({ title: 'Preencha os campos obrigatórios da Etapa 1', variant: 'destructive' });
      return;
    }
    if (currentStep === 2 && !step2Valid) {
      toast({
        title: 'Verifique a Etapa 2',
        description: 'Todo serviço precisa de título e o tipo de solicitação é obrigatório.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };
  const goBack = () => setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  const handleSubmit = async () => {
    if (!ticket) return;
    if (!formData.status) return;

    // Regra: para concluir o procedimento, todos os serviços devem estar concluídos.
    if (formData.status === 'Concluído' && services.length > 0 && !allServicesDone) {
      toast({
        title: 'Serviços em aberto',
        description:
          'Marque todos os serviços como concluídos antes de concluir o procedimento.',
        variant: 'destructive',
      });
      setCurrentStep(3);
      return;
    }

    const selectedTaskType = taskTypes.find((t) => t.nome === formData.type);

    const updatedTicket: UITicket = {
      ...ticket,
      title: isGM ? ticket.title : formData.title,
      priority: isGM ? ticket.priority : (formData.priority as 'Alta' | 'Média' | 'Baixa'),
      type: isGM ? ticket.type : formData.type,
      location: isGM ? ticket.location : derivedLocation,
      assignee: isGM ? ticket.assignee : formData.assignee,
      icon: selectedTaskType?.icon || ticket.icon,
      status: formData.status,
      observations,
      services,
      materials,
      requestType: isGM ? ticket.requestType : (requestType as 'email' | 'processo' | 'direto'),
      processNumber: isGM
        ? ticket.processNumber
        : requestType === 'processo'
          ? processNumber
          : undefined,
      requestedAt: requestedAt || ticket.requestedAt,
      managerId: managerIds[0] ?? null,
      managerIds,
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Procedimento — {ticket.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>

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
                <Label htmlFor="title">Título do procedimento</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
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

              {/* Localização padrão removida: derivada do Núcleo Requerente */}

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
                <Label htmlFor="requestedAt">Data de solicitação</Label>
                <Input
                  id="requestedAt"
                  type="date"
                  value={requestedAt}
                  onChange={(e) => setRequestedAt(e.target.value)}
                  disabled={isGM}
                />
              </div>

              <div className="space-y-2">
                <Label>Servidores da manutenção (padrão)</Label>
                <ManagersMultiSelect
                  value={managerIds}
                  onChange={setManagerIds}
                  disabled={isGM}
                  placeholder="Selecione um ou mais servidores..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Padrão do procedimento. Cada serviço pode personalizar sua própria lista.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Núcleo requerente</Label>
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
              <TicketServicesEditor
                services={services}
                onChange={setServices}
                disabled={isGM}
                defaultNucleoCidade={selectedNucleo?.cidade ?? null}
              />

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
                    onValueChange={(v) => setRequestType(v as 'email' | 'processo' | 'direto')}
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
                <Label>Status do procedimento</Label>
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
                    <SelectItem
                      value="Concluído"
                      disabled={services.length > 0 && !allServicesDone}
                    >
                      Concluído {services.length > 0 && !allServicesDone && '(pendências)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {services.length > 0 && !allServicesDone && (
                  <p className="text-xs text-muted-foreground">
                    Só é possível concluir o procedimento quando todos os serviços estiverem
                    marcados como concluídos.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Serviços executados</Label>
                <TicketServicesEditor
                  services={services}
                  onChange={setServices}
                  executionMode
                />
              </div>

              {materials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Materiais utilizados</Label>
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
                <Button type="button" onClick={handleSubmit}>
                  Salvar Alterações
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
