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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Wrench, Zap, Droplets, Shield, Wind, PaintRoller, X, CalendarIcon } from 'lucide-react';
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

interface ServicePhoto {
  id: string;
  url: string;
  description: string;
  uploadedAt: string;
  uploadedBy: string;
}

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
  requestType?: 'email' | 'processo';
  processNumber?: string;
  servicePhotos?: ServicePhoto[];
}

interface CreateTaskModalProps {
  onCreateTask: (task: Omit<Ticket, 'id' | 'createdAt'>) => void;
}

const taskTypes = [
  { value: 'Hidráulica', icon: Droplets },
  { value: 'Elétrica', icon: Zap },
  { value: 'Climatização', icon: Wind },
  { value: 'Segurança', icon: Shield },
  { value: 'Pintura', icon: PaintRoller },
  { value: 'Geral', icon: Wrench },
];

export function CreateTaskModal({ onCreateTask }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    priority: '' as 'Alta' | 'Média' | 'Baixa' | '',
    type: '',
    location: '',
    assignee: '',
    status: 'Em Análise'
  });
  
  const [observation, setObservation] = useState('');
  const [observations, setObservations] = useState<string[]>([]);
  const [services, setServices] = useState<{ name: string; completed: boolean }[]>([]);
  const [newService, setNewService] = useState('');
  const [requestType, setRequestType] = useState<'email' | 'processo' | ''>('');
  const [processNumber, setProcessNumber] = useState('');
  const [servicePhotos, setServicePhotos] = useState<ServicePhoto[]>([]);
  const [isTravel, setIsTravel] = useState(false);
  const [travelData, setTravelData] = useState({
    cidade: '',
    dataIda: undefined as Date | undefined,
    dataVolta: undefined as Date | undefined
  });
  const { toast } = useToast();

  const addObservation = () => {
    if (observation.trim()) {
      const newObs = `${observation} - Usuário Admin (${new Date().toLocaleString()})`;
      setObservations(prev => [...prev, newObs]);
      setObservation('');
    }
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

  const getServicesProgress = () => {
    if (services.length === 0) return 0;
    const completed = services.filter(s => s.completed).length;
    return (completed / services.length) * 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.priority || !formData.type || !formData.location || !formData.assignee || !requestType) {
      return;
    }

    // Validar campos de viagem se necessário
    if (isTravel && (!travelData.cidade || !travelData.dataIda || !travelData.dataVolta)) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de viagem.",
        variant: "destructive"
      });
      return;
    }

    if (isTravel && travelData.dataIda && travelData.dataVolta && travelData.dataIda >= travelData.dataVolta) {
      toast({
        title: "Erro",
        description: "A data de ida deve ser anterior à data de volta.",
        variant: "destructive"
      });
      return;
    }

    const selectedTaskType = taskTypes.find(t => t.value === formData.type);
    
    // Criar a tarefa
    onCreateTask({
      title: formData.title,
      priority: formData.priority as 'Alta' | 'Média' | 'Baixa',
      type: formData.type,
      location: formData.location,
      assignee: formData.assignee,
      icon: selectedTaskType?.icon || Wrench,
      status: formData.status,
      observations,
      services,
      requestType: requestType as 'email' | 'processo',
      processNumber: requestType === 'processo' ? processNumber : undefined,
      servicePhotos
    });

    // Criar viagem no calendário se necessário
    if (isTravel && travelData.cidade && travelData.dataIda && travelData.dataVolta) {
      try {
        const { error } = await supabase
          .from('travels')
          .insert({
            servidor: formData.assignee,
            destino: travelData.cidade,
            data_ida: format(travelData.dataIda, 'yyyy-MM-dd'),
            data_volta: format(travelData.dataVolta, 'yyyy-MM-dd'),
            motivo: formData.title
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Tarefa criada e viagem adicionada ao calendário.",
        });
      } catch (error) {
        console.error('Erro ao criar viagem:', error);
        toast({
          title: "Aviso",
          description: "Tarefa criada, mas houve erro ao adicionar a viagem ao calendário.",
          variant: "destructive"
        });
      }
    }

    // Reset form
    setFormData({
      title: '',
      priority: '' as 'Alta' | 'Média' | 'Baixa' | '',
      type: '',
      location: '',
      assignee: '',
      status: 'Em Análise'
    });
    setObservation('');
    setObservations([]);
    setServices([]);
    setNewService('');
    setRequestType('');
    setProcessNumber('');
    setServicePhotos([]);
    setIsTravel(false);
    setTravelData({
      cidade: '',
      dataIda: undefined,
      dataVolta: undefined
    });
    
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa de Manutenção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Descreva o problema..."
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
              required
            />
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
                  <div key={index} className="text-sm text-muted-foreground">
                    {obs}
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

          {/* Tipo de Solicitação */}
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

          {/* Opção de Viagem */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="travel"
                checked={isTravel}
                onCheckedChange={(checked) => setIsTravel(checked as boolean)}
              />
              <Label htmlFor="travel">Esta tarefa envolve viagem</Label>
            </div>
            
            {isTravel && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade de Destino *</Label>
                  <Input
                    id="cidade"
                    value={travelData.cidade}
                    onChange={(e) => setTravelData(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Digite a cidade de destino..."
                    required={isTravel}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Ida *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !travelData.dataIda && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {travelData.dataIda ? format(travelData.dataIda, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={travelData.dataIda}
                          onSelect={(date) => setTravelData(prev => ({ ...prev, dataIda: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Volta *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !travelData.dataVolta && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {travelData.dataVolta ? format(travelData.dataVolta, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={travelData.dataVolta}
                          onSelect={(date) => setTravelData(prev => ({ ...prev, dataVolta: date }))}
                          disabled={(date) => !travelData.dataIda || date <= travelData.dataIda}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fotos dos Serviços */}
          <ServicePhotos 
            photos={servicePhotos}
            onPhotosChange={setServicePhotos}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}