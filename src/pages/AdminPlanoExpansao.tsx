import { useMemo, useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanoExpansao } from '@/hooks/usePlanoExpansao';
import { useUserRole } from '@/hooks/useUserRole';
import {
  ESTAGIOS_ECONUCLEO,
  JORNADAS,
  SITUACAO_CLASS,
  SITUACAO_LABEL,
  TIPOS_INTERVENCAO,
  formatDateBR,
  progressoPorEtapa,
  type CategoriaMeta,
  type JornadaTipo,
  type NivelAtencao,
  type PlanoMeta,
  type SituacaoMeta,
  type StatusPlano,
} from '@/lib/planoExpansao';

type Form = Partial<PlanoMeta>;

const vazio = (categoria: CategoriaMeta): Form => ({
  categoria,
  municipio: '',
  tipo_intervencao: categoria === 'econucleo' ? 'Econúcleo' : 'Nova locação',
  jornada: categoria === 'econucleo' ? 'econucleo' : 'nova_locacao',
  etapa_index: 0,
  progresso: 0,
  situacao: 'pendente',
  nivel_atencao: 'normal',
  status_plano: 'mantido',
  estagio_econucleo: categoria === 'econucleo' ? 1 : null,
  ativo: true,
  ordem: 0,
});

export default function AdminPlanoExpansao() {
  const { canEdit, loading: roleLoading } = useUserRole();
  const { metas, revisaoVigente, loading, salvarMeta, excluirMeta } = usePlanoExpansao();
  const [aba, setAba] = useState<CategoriaMeta>('empreendimento');
  const [form, setForm] = useState<Form | null>(null);
  const [excluindo, setExcluindo] = useState<PlanoMeta | null>(null);
  const [salvando, setSalvando] = useState(false);

  const lista = useMemo(
    () => metas.filter((m) => m.categoria === aba),
    [metas, aba]
  );

  const set = (patch: Form) => setForm((f) => ({ ...(f || {}), ...patch }));

  const salvar = async () => {
    if (!form?.municipio?.trim()) return;
    setSalvando(true);
    const payload: Form = {
      ...form,
      municipio: form.municipio.trim(),
      revisao_id: form.revisao_id ?? revisaoVigente?.id ?? null,
      progresso:
        form.progresso ?? progressoPorEtapa(form.jornada as JornadaTipo, form.etapa_index ?? 0),
    };
    const ok = await salvarMeta(payload);
    setSalvando(false);
    if (ok) setForm(null);
  };

  if (!roleLoading && !canEdit) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Você não tem permissão para gerenciar o Plano de Expansão.
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background pb-12">
        <PageHeader
          title="Plano de Expansão — Cadastro"
          subtitle="Cadastro e atualização das metas estratégicas acompanhadas pela administração superior"
          actions={
            <Button onClick={() => setForm(vazio(aba))} className="gap-2">
              <Plus className="h-4 w-4" /> Nova meta
            </Button>
          }
        />

        <div className="container mx-auto px-4">
          <Tabs value={aba} onValueChange={(v) => setAba(v as CategoriaMeta)}>
            <TabsList className="mb-4">
              <TabsTrigger value="empreendimento">Empreendimentos</TabsTrigger>
              <TabsTrigger value="econucleo">Econúcleos</TabsTrigger>
            </TabsList>

            <TabsContent value={aba}>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="p-3">Núcleo</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Etapa</th>
                            <th className="p-3">Progresso</th>
                            <th className="p-3">Previsão</th>
                            <th className="p-3">Situação</th>
                            <th className="p-3">Plano</th>
                            <th className="p-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lista.map((m) => (
                            <tr key={m.id} className="border-b last:border-0">
                              <td className="p-3 font-medium">
                                {m.municipio}
                                {!m.ativo && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">
                                    inativo
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-muted-foreground">{m.tipo_intervencao}</td>
                              <td className="p-3">
                                {m.etapa_atual || JORNADAS[m.jornada]?.etapas[m.etapa_index] || '—'}
                              </td>
                              <td className="p-3">{m.progresso}%</td>
                              <td className="p-3">{formatDateBR(m.previsao_conclusao)}</td>
                              <td className="p-3">
                                <Badge variant="outline" className={cn(SITUACAO_CLASS[m.situacao])}>
                                  {SITUACAO_LABEL[m.situacao]}
                                </Badge>
                              </td>
                              <td className="p-3 capitalize text-muted-foreground">
                                {m.status_plano}
                              </td>
                              <td className="p-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setForm(m)}
                                    aria-label="Editar meta"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setExcluindo(m)}
                                    aria-label="Excluir meta"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {lista.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                Nenhuma meta cadastrada nesta categoria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Formulário */}
        <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form?.id ? 'Editar meta' : 'Nova meta do plano'}</DialogTitle>
            </DialogHeader>

            {form && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Município / Núcleo</Label>
                  <Input
                    value={form.municipio || ''}
                    onChange={(e) => set({ municipio: e.target.value })}
                    placeholder="Ex.: Cuiabá"
                  />
                </div>

                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => set({ categoria: v as CategoriaMeta })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empreendimento">Empreendimento</SelectItem>
                      <SelectItem value="econucleo">Econúcleo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de intervenção</Label>
                  <Select
                    value={form.tipo_intervencao}
                    onValueChange={(v) => set({ tipo_intervencao: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_INTERVENCAO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Jornada</Label>
                  <Select
                    value={form.jornada}
                    onValueChange={(v) => set({ jornada: v as JornadaTipo, etapa_index: 0 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(JORNADAS) as JornadaTipo[]).map((j) => (
                        <SelectItem key={j} value={j}>
                          {JORNADAS[j].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Etapa atual</Label>
                  <Select
                    value={String(form.etapa_index ?? 0)}
                    onValueChange={(v) => {
                      const idx = Number(v);
                      set({
                        etapa_index: idx,
                        etapa_atual: JORNADAS[form.jornada as JornadaTipo]?.etapas[idx] ?? null,
                        progresso: progressoPorEtapa(form.jornada as JornadaTipo, idx),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(JORNADAS[form.jornada as JornadaTipo]?.etapas ?? []).map((e, i) => (
                        <SelectItem key={e} value={String(i)}>
                          {i + 1}. {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Progresso (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progresso ?? 0}
                    onChange={(e) => set({ progresso: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Previsão de conclusão</Label>
                  <Input
                    type="date"
                    value={form.previsao_conclusao?.slice(0, 10) || ''}
                    onChange={(e) => set({ previsao_conclusao: e.target.value || null })}
                  />
                </div>

                <div>
                  <Label>Situação</Label>
                  <Select
                    value={form.situacao}
                    onValueChange={(v) => set({ situacao: v as SituacaoMeta })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SITUACAO_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nível de atenção</Label>
                  <Select
                    value={form.nivel_atencao}
                    onValueChange={(v) => set({ nivel_atencao: v as NivelAtencao })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="atencao">Atenção</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.categoria === 'econucleo' && (
                  <div>
                    <Label>Estágio do econúcleo</Label>
                    <Select
                      value={String(form.estagio_econucleo ?? 1)}
                      onValueChange={(v) => set({ estagio_econucleo: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTAGIOS_ECONUCLEO.map((e) => (
                          <SelectItem key={e.valor} value={String(e.valor)}>
                            {e.valor} — {e.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Processo SEI</Label>
                  <Input
                    value={form.sei_numero || ''}
                    onChange={(e) => set({ sei_numero: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Status no plano</Label>
                  <Select
                    value={form.status_plano}
                    onValueChange={(v) => set({ status_plano: v as StatusPlano })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mantido">Mantido</SelectItem>
                      <SelectItem value="incluido">Incluído na revisão</SelectItem>
                      <SelectItem value="retirado">Retirado do plano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label>Motivo / próxima ação</Label>
                  <Input
                    value={form.motivo_atencao || ''}
                    onChange={(e) => set({ motivo_atencao: e.target.value })}
                    placeholder="Ex.: Aguardando parecer jurídico"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Justificativa (inclusão / retirada)</Label>
                  <Textarea
                    rows={2}
                    value={form.justificativa || ''}
                    onChange={(e) => set({ justificativa: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={form.observacoes || ''}
                    onChange={(e) => set({ observacoes: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch
                    checked={form.ativo !== false}
                    onCheckedChange={(v) => set({ ativo: v })}
                    id="ativo"
                  />
                  <Label htmlFor="ativo">Meta ativa no acompanhamento</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={salvando || !form?.municipio?.trim()}>
                {salvando ? 'Salvando...' : 'Salvar meta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir meta do plano?</AlertDialogTitle>
              <AlertDialogDescription>
                A meta “{excluindo?.municipio}” e todo o seu histórico serão removidos
                permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (excluindo) await excluirMeta(excluindo.id);
                  setExcluindo(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SimpleHeader>
  );
}
