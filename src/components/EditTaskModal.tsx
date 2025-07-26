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
import { Plus, Wrench, Zap, Droplets, Shield, Wind, PaintRoller, X } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useMaintenanceUsers } from '@/hooks/useMaintenanceUsers';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  requestType?: 'email' | 'processo';
  processNumber?: string;
}

interface EditTaskModalProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (ticket: Ticket) => void;
}

const taskTypes = [
  { value: 'Hidráulica', icon: Droplets },
  { value: 'Elétrica', icon: Zap },
  { value: 'Climatização', icon: Wind },
  { value: 'Segurança', icon: Shield },
  { value: 'Pintura', icon: PaintRoller },
  { value: 'Geral', icon: Wrench },
];

export function EditTaskModal({ ticket, open, onOpenChange, onUpdateTask }: EditTaskModalProps) {
  const { isManutencao, canEdit } = useUserRole();
  const { users: maintenanceUsers } = useMaintenanceUsers();
  
  const [formData, setFormData] = useState({
    title: '',
    priority: '' as 'Alta' | 'Média' | 'Baixa' | '',
    type: '',
    location: '',
    assignee: '',
    status: ''
  });
  
  const [observation, setObservation] = useState('');
  const [observations, setObservations] = useState<string[]>([]);
  const [services, setServices] = useState<{ name: string; completed: boolean }[]>([]);
  const [materials, setMaterials] = useState<{ name: string; completed: boolean }[]>([]);
  const [newService, setNewService] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [requestType, setRequestType] = useState<'email' | 'processo' | ''>('');
  const [processNumber, setProcessNumber] = useState('');

  // Atualizar formulário quando o ticket mudar
  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title,
        priority: ticket.priority,
        type: ticket.type,
        location: ticket.location,
        assignee: ticket.assignee,
        status: ticket.status || 'Em andamento' // Definir um status padrão se estiver vazio
      });
      setObservations(ticket.observations || []);
      setServices(ticket.services || []);
      setMaterials(ticket.materials || []);
      setRequestType(ticket.requestType || '');
      setProcessNumber(ticket.processNumber || '');
    }
  }, [ticket]);

  const addObservation = () => {
    if (observation.trim()) {
      const newObs = `${observation} - Usuário Admin (${new Date().toLocaleString()})`;
      setObservations(prev => [...prev, newObs]);
      setObservation('');
    }
  };

  const removeObservation = (index: number) => {
    setObservations(prev => prev.filter((_, i) => i !== index));
  };

  const addService = () => {
    if (newService.trim()) {
      setServices(prev => [...prev, { name: newService, completed: false }]);
      setNewService('');
    }
  };

  const toggleService = (index: number) => {
    setServices(prev => prev.map((service, i) => 
      i === index ? { ...service, completed: !service.completed } : service
    ));
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials(prev => [...prev, { name: newMaterial, completed: false }]);
      setNewMaterial('');
    }
  };

  const toggleMaterial = (index: number) => {
    setMaterials(prev => prev.map((material, i) => 
      i === index ? { ...material, completed: !material.completed } : material
    ));
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const getServicesProgress = () => {
    if (services.length === 0) return 0;
    const completed = services.filter(s => s.completed).length;
    return (completed / services.length) * 100;
  };

  const getMaterialsProgress = () => {
    if (materials.length === 0) return 0;
    const completed = materials.filter(m => m.completed).length;
    return (completed / materials.length) * 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se o status está preenchido
    if (!formData.status) {
      console.error('Status é obrigatório');
      return;
    }
    
    // Para usuários de manutenção, não validar requestType pois eles não podem editar esse campo
    const requiredFieldsValid = ticket && formData.title && formData.priority && formData.type && formData.location && formData.assignee;
    const requestTypeValid = isManutencao || requestType;
    
    if (!requiredFieldsValid || !requestTypeValid) {
      console.error('Campos obrigatórios não preenchidos');
      return;
    }

    const selectedTaskType = taskTypes.find(t => t.value === formData.type);
    
    const updatedTicket: Ticket = {
      ...ticket,
      title: isManutencao ? ticket.title : formData.title,
      priority: isManutencao ? ticket.priority : formData.priority as 'Alta' | 'Média' | 'Baixa',
      type: isManutencao ? ticket.type : formData.type,
      location: isManutencao ? ticket.location : formData.location,
      assignee: isManutencao ? ticket.assignee : formData.assignee,
      icon: selectedTaskType?.icon || ticket.icon,
      status: formData.status,
      observations,
      services,
      materials,
      requestType: isManutencao ? ticket.requestType : requestType as 'email' | 'processo',
      processNumber: isManutencao ? ticket.processNumber : (requestType === 'processo' ? processNumber : undefined)
    };

    try {
      await onUpdateTask(updatedTicket);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarefa - {ticket.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Descreva o problema..."
              disabled={isManutencao}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'Alta' | 'Média' | 'Baixa' }))}
                required
                disabled={isManutencao}
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                required
                disabled={isManutencao}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.value}
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
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Ex: Sala 301, Recepção..."
              disabled={isManutencao}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Responsável</Label>
            <Input
              id="assignee"
              value={formData.assignee}
              onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
              placeholder="Nome do responsável"
              disabled={isManutencao}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
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

          {/* Observações */}
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
                  <div key={index} className="flex justify-between items-start gap-2">
                    <div className="text-sm text-muted-foreground flex-1">
                      {obs}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObservation(index)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Serviços */}
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
              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progresso dos Serviços</span>
                    <span className="text-sm text-muted-foreground">{Math.round(getServicesProgress())}%</span>
                  </div>
                  <Progress value={getServicesProgress()} className="w-full" />
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          checked={service.completed}
                          onCheckedChange={() => toggleService(index)}
                        />
                        <span className={`text-sm ${service.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {service.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeService(index)}
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

          {/* Materiais */}
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progresso dos Materiais</span>
                    <span className="text-sm text-muted-foreground">{Math.round(getMaterialsProgress())}%</span>
                  </div>
                  <Progress value={getMaterialsProgress()} className="w-full" />
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-2 p-2 border rounded-md bg-muted/30">
                  {materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Checkbox
                          checked={material.completed}
                          onCheckedChange={() => toggleMaterial(index)}
                        />
                        <span className={`text-sm ${material.completed ? 'line-through text-muted-foreground' : ''}`}>
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

          {/* Tipo de Solicitação */}
          {!isManutencao && (
            <div className="space-y-3">
              <Label>Tipo de Solicitação *</Label>
              <RadioGroup
                value={requestType}
                onValueChange={(value) => setRequestType(value as 'email' | 'processo')}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">E-mail</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="processo" id="processo" />
                  <Label htmlFor="processo">Processo</Label>
                </div>
              </RadioGroup>
              
              {requestType === 'processo' && (
                <div className="space-y-2">
                  <Label htmlFor="processNumber">Número do Processo</Label>
                  <Input
                    id="processNumber"
                    value={processNumber}
                    onChange={(e) => setProcessNumber(e.target.value)}
                    placeholder="Digite o número do processo..."
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}