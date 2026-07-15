import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Clock,
  User,
  FileText,
  Settings,
  Wrench,
  Zap,
  Droplets,
  Shield,
  Wind,
  PaintRoller,
  UserCheck,
  Calendar as CalendarIcon,
  Paperclip,
  CheckCheck,
  Loader2,
  ExternalLink,
  AlertOctagon,
} from 'lucide-react';
import { TicketImpedimentsHistory } from './TicketImpedimentsHistory';
import { TicketStatusHistory } from './TicketStatusHistory';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { useNucleiList } from '@/hooks/useNucleiList';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { UITicket } from '@/types/maintenanceTicket';
import type { TicketService } from '@/hooks/useTicketServices';
import { TaskPhotoUploader, type TaskPhoto } from '@/components/maintenance/TaskPhotoUploader';

interface ViewTaskModalProps {
  ticket: UITicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
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

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function ViewTaskModal({ ticket, open, onOpenChange, onChanged }: ViewTaskModalProps) {
  const { managers } = useMaintenanceManagers(false);
  const { nuclei } = useNucleiList();
  const { isGM, canEdit } = useUserRole();

  const [services, setServices] = useState<TicketService[]>([]);
  const [materials, setMaterials] = useState<{ name: string; completed: boolean }[]>([]);
  const [savingSvc, setSavingSvc] = useState<string | null>(null);
  const [savingMat, setSavingMat] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalNote, setFinalNote] = useState('');
  const [finalFile, setFinalFile] = useState<File | null>(null);

  useEffect(() => {
    setServices(ticket?.services ?? []);
    setMaterials(ticket?.materials ?? []);
    setFinalNote('');
    setFinalFile(null);
  }, [ticket?.id, open]);

  const ticketManagerIds = useMemo(() => {
    if (!ticket) return [];
    return (ticket.managerIds && ticket.managerIds.length > 0)
      ? ticket.managerIds
      : (ticket.managerId ? [ticket.managerId] : []);
  }, [ticket]);

  const ticketManagerNames = ticketManagerIds
    .map((id) => managers.find((m) => m.id === id)?.nome)
    .filter(Boolean) as string[];
  const nucleoName = ticket?.nucleoId ? nuclei.find(n => n.id === ticket.nucleoId)?.name : null;

  const servicesProgress = services.length
    ? (services.filter(s => s.completed).length / services.length) * 100
    : 0;
  const materialsProgress = materials.length
    ? (materials.filter(m => m.completed).length / materials.length) * 100
    : 0;

  const canToggle = canEdit || isGM;
  const isConcluido = ticket?.status === 'Concluído';
  const requiresAttachment = ticket?.requestType === 'email';
  // Fiscal (não GM) finaliza. GM apenas move para Concluído.
  const canFinalize = isConcluido && canEdit && !isGM;

  if (!ticket) return null;

  const toggleService = async (svc: TicketService, checked: boolean) => {
    if (!canToggle || !svc.id) return;
    setSavingSvc(svc.id);
    // otimista
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, completed: checked } : s));
    try {
      const { error } = await supabase
        .from('maintenance_ticket_services')
        .update({ completed: checked } as any)
        .eq('id', svc.id);
      if (error) throw error;
      onChanged?.();
    } catch (err: any) {
      // reverte
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, completed: !checked } : s));
      toast({ title: 'Erro', description: 'Não foi possível atualizar o serviço.', variant: 'destructive' });
    } finally {
      setSavingSvc(null);
    }
  };

  const updateServicePhotos = async (
    svc: TicketService,
    field: 'reference_photos' | 'execution_photos',
    photos: TaskPhoto[],
  ) => {
    if (!svc.id) {
      toast({
        title: 'Serviço ainda não salvo',
        description: 'Salve o procedimento antes de anexar fotos neste serviço.',
        variant: 'destructive',
      });
      return;
    }
    const prev = services;
    setServices((ss) => ss.map((s) => (s.id === svc.id ? { ...s, [field]: photos } : s)));
    try {
      const { error } = await supabase
        .from('maintenance_ticket_services')
        .update({ [field]: photos } as any)
        .eq('id', svc.id);
      if (error) throw error;
      toast({ title: 'Fotos salvas', description: 'As alterações foram gravadas.' });
      onChanged?.();
    } catch (err: any) {
      console.error('[ViewTaskModal] Erro ao salvar fotos:', err);
      setServices(prev);
      toast({ title: 'Erro ao salvar fotos', description: err?.message ?? 'Tente novamente.', variant: 'destructive' });
    }
  };

  const updateTicketReferencePhotos = async (photos: TaskPhoto[]) => {
    if (!ticket) return;
    const prev = ticket.referencePhotos ?? [];
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ reference_photos: photos } as any)
        .eq('id', ticket.id);
      if (error) throw error;
      // Muta localmente para refletir na sessão até o próximo fetch
      (ticket as any).referencePhotos = photos;
      onChanged?.();
    } catch (err: any) {
      (ticket as any).referencePhotos = prev;
      toast({ title: 'Erro ao salvar fotos', description: err?.message ?? 'Tente novamente.', variant: 'destructive' });
    }
  };



  const toggleMaterial = async (index: number, checked: boolean) => {
    if (!canToggle) return;
    setSavingMat(index);
    const next = materials.map((m, i) => i === index ? { ...m, completed: checked } : m);
    setMaterials(next);
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ materials: next as any })
        .eq('id', ticket.id);
      if (error) throw error;
      onChanged?.();
    } catch (err: any) {
      setMaterials(materials);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o material.', variant: 'destructive' });
    } finally {
      setSavingMat(null);
    }
  };

  const handleFinalize = async () => {
    if (!ticket) return;
    if (requiresAttachment && !finalFile) {
      toast({
        title: 'Anexo obrigatório',
        description: 'Anexe o e-mail de confirmação do núcleo para finalizar tarefas do tipo E-mail.',
        variant: 'destructive',
      });
      return;
    }
    setFinalizing(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      if (finalFile) {
        const cleanName = sanitizeFileName(finalFile.name);
        const path = `maintenance-confirmations/${ticket.id}/${Date.now()}_${cleanName}`;
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, finalFile, { upsert: false, contentType: finalFile.type || undefined });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
        fileUrl = pub.publicUrl;
        fileName = finalFile.name;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error: finErr } = await supabase
        .from('maintenance_tickets')
        .update({
          finalized_at: new Date().toISOString(),
          finalized_by: userRes.user?.id ?? null,
          confirmation_file_url: fileUrl,
          confirmation_file_name: fileName,
          finalization_note: finalNote.trim() || null,
        } as any)
        .eq('id', ticket.id);
      if (finErr) throw finErr;
      toast({
        title: 'Tarefa finalizada',
        description: 'A tarefa saiu do kanban e foi arquivada nas estatísticas.',
      });
      onChanged?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao finalizar',
        description: err?.message || 'Não foi possível concluir a finalização.',
        variant: 'destructive',
      });
    } finally {
      setFinalizing(false);
    }
  };

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

          <Separator />
          <div className="space-y-2">
            <TaskPhotoUploader
              photos={ticket.referencePhotos ?? []}
              onChange={updateTicketReferencePhotos}
              mode="reference"
              disabled={isGM}
              readOnly={isGM}
              label="Fotos de referência do procedimento"
              folder="reference-tickets"
            />
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
                    const busy = savingSvc === s.id;
                    return (
                      <div key={s.id ?? index} className="rounded-md border p-3 bg-muted/20">
                        <div className="flex items-start gap-2">
                          <div className="pt-0.5">
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Checkbox
                                checked={!!s.completed}
                                onCheckedChange={(v) => toggleService(s, !!v)}
                                disabled={!canToggle || !s.id}
                                aria-label="Marcar serviço"
                              />
                            )}
                          </div>
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

                        <div className="pl-6 mt-3 space-y-3">
                          <TaskPhotoUploader
                            photos={s.reference_photos ?? []}
                            onChange={(ph) => updateServicePhotos(s, 'reference_photos', ph)}
                            mode="reference"
                            disabled={!canToggle || isGM}
                            readOnly={isGM}
                            label="Referência do fiscal"
                            folder={`service-reference/${s.id ?? 'x'}`}
                          />
                          <TaskPhotoUploader
                            photos={s.execution_photos ?? []}
                            onChange={(ph) => updateServicePhotos(s, 'execution_photos', ph)}
                            mode="execution"
                            disabled={!canToggle}
                            label="Fotos da execução"
                            folder={`service-execution/${s.id ?? 'x'}`}
                          />
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
                  {materials.map((material, index) => {
                    const busy = savingMat === index;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={!!material.completed}
                            onCheckedChange={(v) => toggleMaterial(index, !!v)}
                            disabled={!canToggle}
                            aria-label="Marcar material"
                          />
                        )}
                        <span className={`text-sm ${material.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {material.name}
                        </span>
                      </div>
                    );
                  })}
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

          {isConcluido && (
            <>
              <Separator />
              <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">Finalização pelo fiscal</h3>
                </div>

                {isGM ? (
                  <p className="text-xs text-muted-foreground">
                    Aguardando o fiscal responsável conferir os serviços executados
                    {requiresAttachment ? ' e anexar o e-mail de confirmação do núcleo' : ''} para
                    finalizar a tarefa.
                  </p>
                ) : !canFinalize ? (
                  <p className="text-xs text-muted-foreground">
                    Apenas o fiscal (ou administrador) pode finalizar esta tarefa.
                  </p>
                ) : (
                  <>
                    {requiresAttachment ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Anexo do e-mail de confirmação do núcleo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="file"
                          accept=".pdf,.eml,.msg,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => setFinalFile(e.target.files?.[0] ?? null)}
                        />
                        {finalFile && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3" /> {finalFile.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Anexo (opcional)</Label>
                        <Input
                          type="file"
                          accept=".pdf,.eml,.msg,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => setFinalFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação da finalização (opcional)</Label>
                      <Textarea
                        value={finalNote}
                        onChange={(e) => setFinalNote(e.target.value)}
                        rows={2}
                        placeholder="Ex.: confirmação recebida por e-mail em 07/07/2026"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleFinalize} disabled={finalizing} size="sm">
                        {finalizing ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Finalizando…</>
                        ) : (
                          <><CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Finalizar tarefa</>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {ticket.confirmationFileUrl && (
                  <a
                    href={ticket.confirmationFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {ticket.confirmationFileName || 'Anexo de confirmação'}
                  </a>
                )}
              </div>
            </>
          )}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              <h3 className="font-medium text-sm">Histórico de impedimentos</h3>
            </div>
            <TicketImpedimentsHistory ticketId={ticket?.id} />
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Histórico de movimentação</h3>
            </div>
            <TicketStatusHistory ticketId={ticket?.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
