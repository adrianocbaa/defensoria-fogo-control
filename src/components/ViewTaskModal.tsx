import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Clock,
  User,
  FileText,
  Settings,
  CheckCircle2,
  Wrench,
  Zap,
  Droplets,
  Shield,
  Wind,
  PaintRoller,
  UserCheck,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useNucleiList } from '@/hooks/useNucleiList';
import type { UITicket } from '@/types/maintenanceTicket';

interface ViewTaskModalProps {
  ticket: UITicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors: Record<string, string> = {
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
} as const;

function formatBRDate(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function ViewTaskModal({ ticket, open, onOpenChange }: ViewTaskModalProps) {
  const { managers } = useMaintenanceManagers(false);
  const { nuclei } = useNucleiList();
  if (!ticket) return null;
  const ticketManagerIds = (ticket.managerIds && ticket.managerIds.length > 0)
    ? ticket.managerIds
    : (ticket.managerId ? [ticket.managerId] : []);
  const ticketManagerNames = ticketManagerIds
    .map((id) => managers.find((m) => m.id === id)?.nome)
    .filter(Boolean) as string[];
  const nucleoName = ticket.nucleoId ? nuclei.find(n => n.id === ticket.nucleoId)?.name : null;

  const services = ticket.services ?? [];
  const servicesProgress = services.length
    ? (services.filter(s => s.completed).length / services.length) * 100
    : 0;

  const materials = ticket.materials ?? [];
  const materialsProgress = materials.length
    ? (materials.filter(m => m.completed).length / materials.length) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">PRIORIDADE</h3>
              <Badge variant={priorityColors[ticket.priority] as any}>{ticket.priority}</Badge>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">TIPO</h3>
              <Badge variant="outline">{ticket.type}</Badge>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">STATUS</h3>
              <Badge variant="outline">{ticket.status}</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-xs text-muted-foreground">LOCALIZAÇÃO PADRÃO</h3>
                <p className="text-sm">{ticket.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-xs text-muted-foreground">SOLICITANTE</h3>
                <p className="text-sm">{ticket.assignee}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-xs text-muted-foreground">
                  SERVIDOR{ticketManagerNames.length > 1 ? 'ES' : ''} DA MANUTENÇÃO
                </h3>
                <p className="text-sm">{ticketManagerNames.length > 0 ? ticketManagerNames.join(', ') : 'Não atribuído'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-xs text-muted-foreground">NÚCLEO REQUERENTE</h3>
                <p className="text-sm">{nucleoName || 'Não atribuído'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-xs text-muted-foreground">DATA DE SOLICITAÇÃO</h3>
                <p className="text-sm">{formatBRDate(ticket.requestedAt) || ticket.createdAt}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">TIPO DE SOLICITAÇÃO</h3>
            </div>
            <p className="text-sm ml-7">
              {ticket.requestType === 'email'
                ? 'E-mail'
                : ticket.requestType === 'direto'
                  ? 'Direto'
                  : 'SEI'}
              {ticket.processNumber && ` — Nº ${ticket.processNumber}`}
            </p>
          </div>

          {services.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm text-muted-foreground">
                      SERVIÇOS ({services.length})
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(servicesProgress)}%
                  </span>
                </div>
                <Progress value={servicesProgress} className="w-full" />

                <div className="space-y-3">
                  {services.map((s, index) => {
                    const svcManagerIds = s.custom_assignment
                      ? (s.manager_ids && s.manager_ids.length > 0
                          ? s.manager_ids
                          : (s.manager_id ? [s.manager_id] : []))
                      : [];
                    const svcManagerNames = svcManagerIds
                      .map((id) => managers.find((m) => m.id === id)?.nome)
                      .filter(Boolean) as string[];
                    const svcNucleo = s.custom_assignment && s.nucleo_id
                      ? nuclei.find(n => n.id === s.nucleo_id)?.name
                      : null;
                    return (
                      <div key={s.id ?? index} className="rounded-md border p-3 bg-muted/20">
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className={`h-4 w-4 mt-0.5 ${s.completed ? 'text-green-500' : 'text-muted-foreground'}`}
                          />
                          <div className="flex-1 space-y-1">
                            <div className={`text-sm font-medium ${s.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {s.title}
                            </div>
                            {s.description && (
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {s.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {s.custom_assignment ? (
                                <>
                                  {svcNucleo && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Núcleo: {svcNucleo}
                                    </Badge>
                                  )}
                                  {s.location && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <MapPin className="h-2.5 w-2.5 mr-1" />
                                      {s.location}
                                    </Badge>
                                  )}
                                  {svcManagerNames.map((nome) => (
                                    <Badge key={nome} variant="outline" className="text-[10px]">
                                      <UserCheck className="h-2.5 w-2.5 mr-1" />
                                      {nome}
                                    </Badge>
                                  ))}
                                  {s.scheduled_date && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                                      {formatBRDate(s.scheduled_date)}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Herda do procedimento
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {materials.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm text-muted-foreground">MATERIAIS</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(materialsProgress)}%
                  </span>
                </div>
                <Progress value={materialsProgress} className="w-full" />
                <div className="space-y-1.5">
                  {materials.map((material, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 ${material.completed ? 'text-green-500' : 'text-muted-foreground'}`}
                      />
                      <span className={`text-sm ${material.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {material.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {ticket.observations && ticket.observations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">OBSERVAÇÕES</h3>
                <div className="space-y-1 p-3 border rounded-md bg-muted/30">
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
