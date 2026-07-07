import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NucleoCombobox } from '@/components/ui/nucleo-combobox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { ManagersMultiSelect } from '@/components/ManagersMultiSelect';
import { useNucleiList } from '@/hooks/useNucleiList';
import { useAvailableTravels } from '@/hooks/useAvailableTravels';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TicketService } from '@/hooks/useTicketServices';
import { checkTravelLimit, LimitViolation } from '@/lib/travelDaysLimit';
import { TravelLimitConfirmDialog } from '@/components/TravelLimitConfirmDialog';

interface Props {
  services: TicketService[];
  onChange: (next: TicketService[]) => void;
  /** Se true, mostra checkboxes de conclusão em vez de campos editáveis */
  executionMode?: boolean;
  disabled?: boolean;
  /** Cidade padrão do procedimento (do núcleo requerente), usada como fallback para viagens */
  defaultNucleoCidade?: string | null;
  /** Servidores padrão do procedimento (usados em serviços sem responsável personalizado) */
  defaultManagerIds?: string[];
  /** Id da viagem já vinculada ao ticket sendo editado (para excluir da contagem) */
  excludeTravelIds?: string[];
}

const emptyService = (order: number): TicketService => ({
  title: '',
  description: '',
  order_index: order,
  completed: false,
  status: 'Em Análise',
  custom_assignment: false,
  nucleo_id: null,
  location: null,
  manager_id: null,
  manager_ids: [],
  scheduled_date: null,
  materials: [],
  envolve_viagem: false,
  travel_cidade: null,
  travel_data_ida: null,
  travel_data_volta: null,
  travel_sem_previsao: false,
});

export function TicketServicesEditor({
  services,
  onChange,
  executionMode = false,
  disabled = false,
  defaultNucleoCidade = null,
  defaultManagerIds = [],
  excludeTravelIds = [],
}: Props) {
  const { managers } = useMaintenanceManagers();
  const { nuclei } = useNucleiList();
  const { travels: availableTravels } = useAvailableTravels();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [limitDialog, setLimitDialog] = useState<{
    open: boolean;
    violations: LimitViolation[];
    onConfirm: () => void;
    onCancel: () => void;
  }>({ open: false, violations: [], onConfirm: () => {}, onCancel: () => {} });

  const update = (idx: number, patch: Partial<TicketService>) => {
    onChange(services.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  /** Após alterar datas de viagem de um serviço, checa o limite mensal
   *  do(s) servidor(es). Se ultrapassar e usuário cancelar → limpa as datas. */
  const runTravelLimitCheck = async (
    idx: number,
    nextService: TicketService,
  ) => {
    if (!nextService.envolve_viagem) return;
    if (nextService.travel_is_linked) return;
    if (nextService.travel_sem_previsao) return;
    if (!nextService.travel_data_ida || !nextService.travel_data_volta) return;
    if (nextService.travel_data_ida >= nextService.travel_data_volta) return;
    const effectiveIds =
      nextService.custom_assignment
        ? (nextService.manager_ids ?? (nextService.manager_id ? [nextService.manager_id] : []))
        : defaultManagerIds;
    if (!effectiveIds || effectiveIds.length === 0) return;

    const violations = await checkTravelLimit({
      managerIds: effectiveIds,
      managers: managers.map((m: any) => ({ id: m.id, nome: m.nome })),
      dataIda: nextService.travel_data_ida,
      dataVolta: nextService.travel_data_volta,
      excludeTravelId: nextService.travel_id ?? excludeTravelIds[0],
    });
    if (violations.length === 0) return;

    setLimitDialog({
      open: true,
      violations,
      onConfirm: () => setLimitDialog((p) => ({ ...p, open: false })),
      onCancel: () => {
        setLimitDialog((p) => ({ ...p, open: false }));
        // reverte datas — força escolha de outro servidor / sem previsão
        update(idx, { travel_data_ida: null, travel_data_volta: null });
      },
    });
  };

  const remove = (idx: number) => {
    onChange(services.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_index: i })));
  };
  const add = () => {
    onChange([...services, emptyService(services.length)]);
    setExpanded((prev) => ({ ...prev, [services.length]: true }));
  };
  const toggleExpand = (idx: number) => setExpanded((p) => ({ ...p, [idx]: !p[idx] }));

  const progress = services.length
    ? (services.filter((s) => s.completed).length / services.length) * 100
    : 0;

  if (executionMode) {
    return (
      <div className="space-y-2">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum serviço cadastrado.
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progresso de execução</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="space-y-2 p-2 border rounded-md bg-muted/30 max-h-72 overflow-y-auto">
              {services.map((s, i) => (
                <div key={s.id ?? i} className="flex items-start gap-2">
                  <Checkbox
                    checked={s.completed}
                    disabled={disabled}
                    onCheckedChange={(v) => update(i, { completed: !!v })}
                  />
                  <div className="flex-1">
                    <div
                      className={`text-sm ${
                        s.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {s.title || <em className="text-muted-foreground">Sem título</em>}
                    </div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground">
                        {s.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Serviços do procedimento</Label>
        <Button type="button" size="sm" onClick={add} disabled={disabled}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar serviço
        </Button>
      </div>

      {services.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum serviço adicionado. Clique em "Adicionar serviço" para incluir um.
        </p>
      )}

      <div className="space-y-3">
        {services.map((s, i) => (
          <div key={i} className="border rounded-md p-3 bg-muted/20 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder={`Título do serviço ${i + 1}`}
                  value={s.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  disabled={disabled}
                />
                {expanded[i] && (
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={s.description ?? ''}
                    rows={2}
                    onChange={(e) => update(i, { description: e.target.value })}
                    disabled={disabled}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => toggleExpand(i)}
                  disabled={disabled}
                >
                  {expanded[i] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => remove(i)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {expanded[i] && (
              <>
                <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                  <Checkbox
                    checked={s.custom_assignment}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      update(i, {
                        custom_assignment: !!v,
                        ...(v
                          ? {}
                          : {
                              nucleo_id: null,
                              location: null,
                              manager_id: null,
                              manager_ids: [],
                              scheduled_date: null,
                            }),
                      })
                    }
                  />
                  Personalizar responsável, local e data (diferente do
                  procedimento)
                </label>

                {s.custom_assignment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Núcleo</Label>
                      <NucleoCombobox
                        options={nuclei}
                        value={s.nucleo_id ?? ''}
                        onChange={(v) => {
                          const chosen = nuclei.find((n) => n.id === v);
                          const cidade = chosen?.cidade ?? null;
                          update(i, {
                            nucleo_id: v || null,
                            location: cidade,
                            // Se serviço envolve viagem, também alimenta cidade destino
                            ...(s.envolve_viagem ? { travel_cidade: cidade } : {}),
                          });
                        }}
                        placeholder="Selecione..."
                        disabled={disabled}
                      />
                      {s.location && (
                        <p className="text-[11px] text-muted-foreground">
                          Cidade: <strong>{s.location}</strong> (obtida do cadastro do núcleo)
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Servidores da manutenção</Label>
                      <ManagersMultiSelect
                        value={s.manager_ids ?? (s.manager_id ? [s.manager_id] : [])}
                        onChange={(ids) =>
                          update(i, {
                            manager_ids: ids,
                            manager_id: ids[0] ?? null,
                          })
                        }
                        disabled={disabled}
                        placeholder="Selecione um ou mais servidores..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data prevista</Label>
                      <Input
                        type="date"
                        value={s.scheduled_date ?? ''}
                        onChange={(e) =>
                          update(i, { scheduled_date: e.target.value || null })
                        }
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t mt-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={!!s.envolve_viagem}
                      disabled={disabled}
                      onCheckedChange={(v) => {
                        const on = !!v;
                        // Ao ativar viagem: puxa cidade do núcleo (personalizado ou padrão do procedimento)
                        const chosen = s.nucleo_id
                          ? nuclei.find((n) => n.id === s.nucleo_id)?.cidade ?? null
                          : null;
                        const autoCidade = chosen ?? defaultNucleoCidade ?? null;
                        update(i, {
                          envolve_viagem: on,
                          ...(on
                            ? { travel_cidade: s.travel_cidade ?? autoCidade }
                            : {
                                travel_cidade: null,
                                travel_data_ida: null,
                                travel_data_volta: null,
                                travel_sem_previsao: false,
                              }),
                        });
                      }}
                    />
                    Este serviço envolve viagem (registrar no calendário)
                  </label>

                  {s.envolve_viagem && (
                    <div className="space-y-3 pl-6">
                      <RadioGroup
                        value={s.travel_is_linked ? 'linked' : 'new'}
                        onValueChange={(v) => {
                          if (v === 'linked') {
                            update(i, {
                              travel_is_linked: true,
                              // Ao vincular, limpa campos de "nova viagem"
                              travel_cidade: null,
                              travel_data_ida: null,
                              travel_data_volta: null,
                              travel_sem_previsao: false,
                              travel_id: null,
                            });
                          } else {
                            const chosen = s.nucleo_id
                              ? nuclei.find((n) => n.id === s.nucleo_id)?.cidade ?? null
                              : null;
                            update(i, {
                              travel_is_linked: false,
                              travel_id: null,
                              travel_cidade: chosen ?? defaultNucleoCidade ?? null,
                            });
                          }
                        }}
                        className="flex flex-col gap-1"
                      >
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <RadioGroupItem value="new" disabled={disabled} />
                          Criar nova viagem no calendário
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <RadioGroupItem value="linked" disabled={disabled} />
                          Vincular a uma viagem já cadastrada (evita duplicar)
                        </label>
                      </RadioGroup>

                      {s.travel_is_linked ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Viagem existente *</Label>
                          <Select
                            value={s.travel_id ?? ''}
                            onValueChange={(v) => update(i, { travel_id: v || null })}
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma viagem em aberto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTravels.length === 0 && (
                                <div className="px-2 py-4 text-xs text-muted-foreground">
                                  Nenhuma viagem futura/em aberto cadastrada.
                                </div>
                              )}
                              {availableTravels.map((t) => {
                                const datas = t.data_ida
                                  ? `${format(new Date(t.data_ida + 'T12:00:00'), 'dd/MM', { locale: ptBR })}${
                                      t.data_volta
                                        ? ' → ' + format(new Date(t.data_volta + 'T12:00:00'), 'dd/MM', { locale: ptBR })
                                        : ''
                                    }`
                                  : 'sem previsão';
                                return (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.servidor} · {t.destino} · {datas}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">
                            Nenhuma entrada nova será criada no calendário — o serviço apenas referencia a viagem existente.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-xs">Cidade de destino</Label>
                            <div className="text-sm rounded-md border bg-muted/30 px-3 py-2">
                              {s.travel_cidade ?? (
                                <span className="text-muted-foreground italic">
                                  Selecione um núcleo (no procedimento ou personalizado) para definir a cidade.
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Puxada automaticamente do cadastro do núcleo.
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-xs cursor-pointer md:col-span-2">
                            <Checkbox
                              checked={!!s.travel_sem_previsao}
                              disabled={disabled}
                              onCheckedChange={(v) =>
                                update(i, {
                                  travel_sem_previsao: !!v,
                                  ...(v
                                    ? { travel_data_ida: null, travel_data_volta: null }
                                    : {}),
                                })
                              }
                            />
                            Sem previsão de datas
                          </label>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Data de ida {!s.travel_sem_previsao && '*'}
                            </Label>
                            <Input
                              type="date"
                              value={s.travel_data_ida ?? ''}
                              disabled={disabled || !!s.travel_sem_previsao}
                              onChange={(e) =>
                                update(i, { travel_data_ida: e.target.value || null })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Data de volta {!s.travel_sem_previsao && '*'}
                            </Label>
                            <Input
                              type="date"
                              value={s.travel_data_volta ?? ''}
                              disabled={disabled || !!s.travel_sem_previsao}
                              onChange={(e) =>
                                update(i, { travel_data_volta: e.target.value || null })
                              }
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground md:col-span-2">
                            Servidor da viagem = gerente responsável (personalizado ou padrão do procedimento).
                            Uma entrada será criada em <strong>Viagens</strong> ao salvar.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
