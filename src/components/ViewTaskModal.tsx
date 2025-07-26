import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, User, FileText, Settings, CheckCircle2, Wrench, Zap, Droplets, Shield, Wind, PaintRoller } from 'lucide-react';

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

interface ViewTaskModalProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors = {
  'Alta': 'destructive',
  'Média': 'warning',
  'Baixa': 'secondary'
};

const typeIcons = {
  'Hidráulica': Droplets,
  'Elétrica': Zap,
  'Climatização': Wind,
  'Segurança': Shield,
  'Pintura': PaintRoller,
  'Geral': Wrench,
};

export function ViewTaskModal({ ticket, open, onOpenChange }: ViewTaskModalProps) {
  if (!ticket) return null;

  const getServicesProgress = () => {
    if (!ticket.services || ticket.services.length === 0) return 0;
    const completed = ticket.services.filter(s => s.completed).length;
    return (completed / ticket.services.length) * 100;
  };

  const getMaterialsProgress = () => {
    if (!ticket.materials || ticket.materials.length === 0) return 0;
    const completed = ticket.materials.filter(m => m.completed).length;
    return (completed / ticket.materials.length) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(() => {
              const IconComponent = typeIcons[ticket.type as keyof typeof typeIcons] || Wrench;
              return <IconComponent className="h-5 w-5" />;
            })()}
            {ticket.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">TÍTULO</h3>
              <p className="text-base">{ticket.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">PRIORIDADE</h3>
                <Badge variant={priorityColors[ticket.priority] as any}>
                  {ticket.priority}
                </Badge>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">TIPO</h3>
                <Badge variant="outline">{ticket.type}</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">STATUS</h3>
              <Badge variant="outline">{ticket.status}</Badge>
            </div>
          </div>

          <Separator />

          {/* Localização e Responsável */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">LOCALIZAÇÃO</h3>
                <p className="text-sm">{ticket.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">RESPONSÁVEL</h3>
                <p className="text-sm">{ticket.assignee}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">CRIADO EM</h3>
                <p className="text-sm">{ticket.createdAt}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tipo de Solicitação */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">TIPO DE SOLICITAÇÃO</h3>
            </div>
            <p className="text-sm ml-7">
              {ticket.requestType === 'email' ? 'E-mail' : 'Processo'}
              {ticket.processNumber && ` - Nº ${ticket.processNumber}`}
            </p>
          </div>

          {/* Serviços */}
          {ticket.services && ticket.services.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">SERVIÇOS</h3>
                </div>
                
                <div className="ml-7 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progresso</span>
                      <span className="text-sm text-muted-foreground">{Math.round(getServicesProgress())}%</span>
                    </div>
                    <Progress value={getServicesProgress()} className="w-full" />
                  </div>
                  
                  <div className="space-y-2">
                    {ticket.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 
                          className={`h-4 w-4 ${
                            service.completed 
                              ? 'text-green-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <span className={`text-sm ${
                          service.completed 
                            ? 'line-through text-muted-foreground' 
                            : ''
                        }`}>
                          {service.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Materiais */}
          {ticket.materials && ticket.materials.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">MATERIAIS</h3>
                </div>
                
                <div className="ml-7 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progresso</span>
                      <span className="text-sm text-muted-foreground">{Math.round(getMaterialsProgress())}%</span>
                    </div>
                    <Progress value={getMaterialsProgress()} className="w-full" />
                  </div>
                  
                  <div className="space-y-2">
                    {ticket.materials.map((material, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 
                          className={`h-4 w-4 ${
                            material.completed 
                              ? 'text-green-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <span className={`text-sm ${
                          material.completed 
                            ? 'line-through text-muted-foreground' 
                            : ''
                        }`}>
                          {material.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {ticket.observations && ticket.observations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">OBSERVAÇÕES</h3>
                 <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                   {ticket.observations.slice().reverse().map((obs, index) => (
                     <div key={index} className="text-sm text-muted-foreground">
                       {obs}
                     </div>
                   ))}
                 </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}