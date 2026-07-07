import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Wrench, X, CalendarIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ServicePhotos } from '@/components/ServicePhotos';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceUsers } from '@/hooks/useMaintenanceUsers';
import { useMaintenanceTypes } from '@/hooks/useMaintenanceTypes';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useNucleiList } from '@/hooks/useNucleiList';
import { NucleoCombobox } from '@/components/ui/nucleo-combobox';
import { ManagersMultiSelect } from '@/components/ManagersMultiSelect';
import { TicketServicesEditor } from './TicketServicesEditor';
import type { TicketService } from '@/hooks/useTicketServices';

interface ServicePhoto {
  id: string;
  url: string;
  description: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface NewTaskPayload {
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  status: string;
  observations: string[];
  services: TicketService[];
  materials: { name: string; completed: boolean }[];
  requestType: 'email' | 'processo' | 'direto';
  processNumber?: string;
  requestedAt?: string;
  managerId?: string | null;
  managerIds?: string[];
  nucleoId?: string | null;
  servicePhotos?: ServicePhoto[];
  icon: any;
}

interface CreateTaskModalProps {
  onCreateTask: (task: NewTaskPayload) => void | Promise<void>;
}

export function CreateTaskModal({ onCreateTask }: CreateTaskModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { users: maintenanceUsers } = useMaintenanceUsers();
  const { types: taskTypes } = useMaintenanceTypes();
  const { managers } = useMaintenanceManagers();
  const { nuclei } = useNucleiList();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    priority: '' as 'Alta' | 'Média' | 'Baixa' | '',
    type: '',
    location: '',
    assignee: '',
    status: 'Pendente',
  });

  const [observation, setObservation] = useState('');
  const [observations, setObservations] = useState<string[]>([]);
  const [services, setServices] = useState<TicketService[]>([]);
  const [materials, setMaterials] = useState<{ name: string; completed: boolean }[]>([]);
  const [newMaterial, setNewMaterial] = useState('');
  const [requestType, setRequestType] = useState<'email' | 'processo' | 'direto' | ''>('');
  const [processNumber, setProcessNumber] = useState('');
  const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [requestedAt, setRequestedAt] = useState<string>(getTodayLocal());
  const [managerId, setManagerId] = useState<string>('');
  const [nucleoId, setNucleoId] = useState<string>('');
  const [servicePhotos, setServicePhotos] = useState<ServicePhoto[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const { toast } = useToast();

  const selectedNucleo = nuclei.find((n) => n.id === nucleoId);
  const derivedLocation = selectedNucleo?.cidade || selectedNucleo?.name || '';

  const step1Valid = !!(formData.title && formData.priority && formData.type && nucleoId && formData.assignee && requestedAt);
  const step2Valid =
    !!requestType &&
    (requestType !== 'processo' || !!processNumber) &&
    services.every((s) => !!s.title.trim()) &&
    services.every((s) => !s.envolve_viagem || (s.travel_is_linked ? !!s.travel_id : (!!s.travel_cidade && (s.travel_sem_previsao || (!!s.travel_data_ida && !!s.travel_data_volta)))));

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

  const addObservation = () => {
    if (observation.trim()) {
      const newObs = `${observation} - Usuário Admin (${new Date().toLocaleString()})`;
      setObservations((prev) => [...prev, newObs]);
      setObservation('');
    }
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials((prev) => [...prev, { name: newMaterial, completed: false }]);
      setNewMaterial('');
    }
  };

  const toggleMaterial = (index: number) => {
    setMaterials((prev) =>
      prev.map((material, i) => (i === index ? { ...material, completed: !material.completed } : material))
    );
  };

  const removeMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const getMaterialsProgress = () => {
    if (materials.length === 0) return 0;
    return (materials.filter((m) => m.completed).length / materials.length) * 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Acesso negado',
        description: 'Você precisa fazer login para criar tarefas.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (
      !formData.title ||
      !formData.priority ||
      !formData.type ||
      !nucleoId ||
      !formData.assignee ||
      !requestType
    ) {
      return;
    }

    // Validação de viagens por serviço
    for (const s of services) {
      if (!s.envolve_viagem) continue;
      if (s.travel_is_linked) {
        if (!s.travel_id) {
          toast({ title: 'Erro', description: `Selecione a viagem existente no serviço "${s.title || 'sem título'}".`, variant: 'destructive' });
          return;
        }
        continue;
      }
      if (!s.travel_cidade) {
        toast({ title: 'Erro', description: `Informe a cidade do serviço "${s.title || 'sem título'}".`, variant: 'destructive' });
        return;
      }
      if (!s.travel_sem_previsao && (!s.travel_data_ida || !s.travel_data_volta)) {
        toast({
          title: 'Erro',
          description: `Preencha as datas ou marque "Sem previsão" no serviço "${s.title || 'sem título'}".`,
          variant: 'destructive',
        });
        return;
      }
      if (
        !s.travel_sem_previsao &&
        s.travel_data_ida &&
        s.travel_data_volta &&
        s.travel_data_ida >= s.travel_data_volta
      ) {
        toast({
          title: 'Erro',
          description: `A data de ida deve ser anterior à data de volta no serviço "${s.title || 'sem título'}".`,
          variant: 'destructive',
        });
        return;
      }
    }

    const selectedTaskType = taskTypes.find((t) => t.nome === formData.type);

    await onCreateTask({
      title: formData.title,
      priority: formData.priority as 'Alta' | 'Média' | 'Baixa',
      type: formData.type,
      location: derivedLocation,
      assignee: formData.assignee,
      icon: selectedTaskType?.icon || Wrench,
      status: formData.status,
      observations,
      services,
      materials,
      requestType: requestType as 'email' | 'processo' | 'direto',
      processNumber: requestType === 'processo' ? processNumber : undefined,
      requestedAt,
      managerId: managerId || null,
      nucleoId: nucleoId || null,
      servicePhotos,
    });

    // Viagens agora são criadas pelo KanbanBoard via replaceServicesForTicket
    // (uma entrada em `travels` por serviço que tiver "envolve_viagem" ativo).

    // Reset
    setFormData({
      title: '',
      priority: '',
      type: '',
      location: '',
      assignee: '',
      status: 'Pendente',
    });
    setObservation('');
    setObservations([]);
    setServices([]);
    setMaterials([]);
    setNewMaterial('');
    setRequestType('');
    setProcessNumber('');
    setRequestedAt(getTodayLocal());
    setManagerId('');
    setNucleoId('');
    setServicePhotos([]);
    setCurrentStep(1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Procedimento de Manutenção — Etapa {currentStep} de 3</DialogTitle>
          <div className="flex gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  currentStep >= s ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do procedimento</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex.: Manutenção geral no Núcleo Central"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority: value as 'Alta' | 'Média' | 'Baixa' }))
                    }
                    required
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
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.id} value={type.nome}>
                          {type.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Localização padrão removida: agora derivada do Núcleo Requerente */}

              <div className="space-y-2">
                <Label htmlFor="assignee">Solicitante</Label>
                <Input
                  id="assignee"
                  list="assignee-suggestions"
                  value={formData.assignee}
                  onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
                  placeholder="Digite o nome do solicitante..."
                  required
                />
                <datalist id="assignee-suggestions">
                  {maintenanceUsers.map((u) => (
                    <option key={u.id} value={u.display_name || u.user_id} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedAt">Data de Solicitação *</Label>
                <Input
                  id="requestedAt"
                  type="date"
                  value={requestedAt}
                  onChange={(e) => setRequestedAt(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager">Gerente padrão</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gerente (opcional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nucleo">Núcleo Requerente</Label>
                <NucleoCombobox
                  options={nuclei}
                  value={nucleoId}
                  onChange={setNucleoId}
                  placeholder="Selecione um núcleo (opcional)..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
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
                    {observations.map((obs, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {obs}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <TicketServicesEditor services={services} onChange={setServices} defaultNucleoCidade={selectedNucleo?.cidade ?? null} />

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
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progresso dos Materiais</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(getMaterialsProgress())}%
                      </span>
                    </div>
                    <Progress value={getMaterialsProgress()} className="w-full" />
                    <div className="max-h-32 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                      {materials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Checkbox
                              checked={material.completed}
                              onCheckedChange={() => toggleMaterial(index)}
                            />
                            <span
                              className={`text-sm ${
                                material.completed ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {material.name}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMaterial(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Tipo de Solicitação *</Label>
                <RadioGroup
                  value={requestType}
                  onValueChange={(value) => setRequestType(value as 'email' | 'processo' | 'direto')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email">E-mail</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="processo" id="processo" />
                    <Label htmlFor="processo">SEI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direto" id="direto" />
                    <Label htmlFor="direto">Direto</Label>
                  </div>
                </RadioGroup>

                {requestType === 'processo' && (
                  <div className="space-y-2">
                    <Label htmlFor="processNumber">Número do SEI</Label>
                    <Input
                      id="processNumber"
                      value={processNumber}
                      onChange={(e) => setProcessNumber(e.target.value)}
                      placeholder="Digite o número do SEI..."
                      required
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                💡 Viagens agora são configuradas <strong>por serviço</strong> na etapa
                anterior. Marque "Este serviço envolve viagem" em cada serviço que
                precisar de deslocamento — cada um gera uma entrada própria no
                calendário de viagens, com destino, datas e servidor responsável.
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Serviços Executados (opcional agora)</Label>
                <TicketServicesEditor
                  services={services}
                  onChange={setServices}
                  executionMode
                />
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <div className="flex gap-2">
                  <Input
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Adicione uma observação sobre a execução..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObservation())}
                  />
                  <Button type="button" onClick={addObservation} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {observations.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 border rounded-md bg-muted/30">
                    {observations.map((obs, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {obs}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ServicePhotos photos={servicePhotos} onPhotosChange={setServicePhotos} />
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2 border-t">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={goBack}>
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              {currentStep < 3 ? (
                <Button type="button" onClick={goNext}>
                  Próximo
                </Button>
              ) : (
                <Button type="submit">Criar Procedimento</Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
