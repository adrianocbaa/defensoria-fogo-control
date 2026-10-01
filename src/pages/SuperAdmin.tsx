import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Building2, Plus, History, Ban, PlayCircle, PauseCircle, Sparkles, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const fmtBRL = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtGB = (bytes: number | null | undefined) =>
  bytes == null ? 'Ilimitado' : `${(bytes / 1073741824).toFixed(0)} GB`;

const STATUS_LABELS: Record<string, string> = {
  trial: 'Teste', active: 'Ativa', past_due: 'Em atraso',
  suspended: 'Suspensa', cancelled: 'Cancelada', expired: 'Expirada',
};

interface Organization { id: string; nome: string; cnpj: string | null; slug: string; status: string; }
interface Subscription { id: string; organization_id: string; status: string; billing_cycle: string; started_at: string; current_period_end: string | null; origin: string; contracted_amount_cents: number | null; discount_cents: number | null; external_reference: string | null; notes: string | null; plan_versions?: { plans?: { nome: string } }; }
interface SubItem { id: string; subscription_id: string; item_type: string; descricao: string | null; amount_cents: number; quantity: number; }
interface Usage { organization_id: string; internal_users_count: number; external_users_count: number; storage_bytes_used: number; }
interface Entitlements { organization_id: string; can_use_obras: boolean; can_use_rdo: boolean; can_use_manutencao: boolean; can_use_preventivos: boolean; internal_users_limit: number | null; external_users_limit: number | null; storage_limit_bytes: number | null; }
interface Override { id: string; organization_id: string; key: string; value: unknown; motivo: string; valid_to: string | null; }
interface HistoryRow { id: string; entity: string; action: string; reason: string | null; created_at: string; new_value: unknown; old_value: unknown; }
interface Plan { id: string; key: string; nome: string; }
interface Tier { id: string; key: string; nome: string; module_id: string; commercial_modules?: { nome: string; key: string }; }
interface Addon { id: string; key: string; nome: string; }
interface Lead { id: string; nome_orgao: string; cnpj: string | null; contato_nome: string; email: string; telefone: string | null; plan_key: string | null; module_tier_keys: string[]; addon_keys: string[]; mensagem: string | null; status: string; notas_internas: string | null; created_at: string; }

const LEAD_STATUS: Record<string, string> = { novo: 'Novo', em_contato: 'Em contato', convertido: 'Convertido', descartado: 'Descartado' };

export default function SuperAdmin() {
  const { toast } = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [items, setItems] = useState<SubItem[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlements[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Criar órgão + assinatura
  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [newTiers, setNewTiers] = useState<string[]>([]);
  const [newAddons, setNewAddons] = useState<string[]>([]);
  const [newCycle, setNewCycle] = useState('monthly');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [creating, setCreating] = useState(false);

  // Status / override
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; status: string }>({ open: false, status: '' });
  const [statusReason, setStatusReason] = useState('');
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [ovKey, setOvKey] = useState('');
  const [ovValue, setOvValue] = useState('');
  const [ovMotivo, setOvMotivo] = useState('');
  const [ovValidTo, setOvValidTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [o, s, i, u, e, ov, h, p, t, a, l] = await Promise.all([
      supabase.from('organizations').select('*').order('nome'),
      supabase.from('subscriptions').select('*, plan_versions(plans(nome))').order('created_at', { ascending: false }),
      supabase.from('subscription_items').select('*').limit(10000),
      supabase.from('organization_usage_counters').select('*').limit(10000),
      supabase.from('organization_entitlements').select('*').limit(10000),
      supabase.from('organization_entitlement_overrides').select('*').order('created_at', { ascending: false }).limit(10000),
      supabase.from('subscription_history').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('plans').select('*').eq('ativo', true).order('ordem'),
      supabase.from('module_tiers').select('*, commercial_modules(nome, key)').eq('ativo', true).order('ordem'),
      supabase.from('addons').select('*').eq('ativo', true),
      supabase.from('commercial_leads').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    setOrgs((o.data as Organization[]) ?? []);
    setSubs((s.data as unknown as Subscription[]) ?? []);
    setItems((i.data as SubItem[]) ?? []);
    setUsage((u.data as Usage[]) ?? []);
    setEntitlements((e.data as Entitlements[]) ?? []);
    setOverrides((ov.data as Override[]) ?? []);
    setHistory((h.data as HistoryRow[]) ?? []);
    setPlans((p.data as Plan[]) ?? []);
    setTiers((t.data as unknown as Tier[]) ?? []);
    setAddons((a.data as Addon[]) ?? []);
    setLeads((l.data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAllowed(false); return; }
      const { data, error } = await supabase.rpc('is_super_admin' as never, { _user_id: user.id } as never);
      setAllowed(!error && data === true);
      if (!error && data === true) load(); else setLoading(false);
    })();
  }, [load]);

  if (allowed === false) return <Navigate to="/" replace />;

  const orgSub = (orgId: string) => subs.find(s => s.organization_id === orgId && ['active', 'trial', 'past_due'].includes(s.status)) ?? subs.find(s => s.organization_id === orgId);
  const orgUsage = (orgId: string) => usage.find(u => u.organization_id === orgId);
  const orgEnt = (orgId: string) => entitlements.find(e => e.organization_id === orgId);
  const sel = selectedOrg ? orgs.find(o => o.id === selectedOrg) : null;
  const selSub = selectedOrg ? orgSub(selectedOrg) : null;

  const handleCreate = async () => {
    if (!newNome || !newSlug || !newPlan) {
      toast({ title: 'Preencha nome, sigla (slug) e plano', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data: orgId, error: e1 } = await supabase.rpc('super_admin_create_organization' as never, {
        p_nome: newNome, p_cnpj: newCnpj || null, p_slug: newSlug,
      } as never);
      if (e1) throw e1;
      const { error: e2 } = await supabase.rpc('super_admin_create_subscription' as never, {
        p_organization_id: orgId,
        p_plan_key: newPlan,
        p_module_tier_keys: newTiers,
        p_addon_keys: newAddons,
        p_billing_cycle: newCycle,
        p_period_end: newPeriodEnd || null,
        p_origin: 'manual',
        p_external_reference: newReference || null,
        p_notes: newNotes || null,
        p_discount_cents: newDiscount ? Math.round(parseFloat(newDiscount.replace(',', '.')) * 100) : 0,
      } as never);
      if (e2) throw e2;
      toast({ title: 'Órgão criado e assinatura ativada' });
      setCreateOpen(false);
      setNewNome(''); setNewCnpj(''); setNewSlug(''); setNewPlan(''); setNewTiers([]); setNewAddons([]);
      setNewReference(''); setNewNotes(''); setNewDiscount(''); setNewPeriodEnd('');
      load();
    } catch (err) {
      toast({ title: 'Erro ao criar', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const handleStatus = async () => {
    if (!selSub || !statusReason) return;
    const { error } = await supabase.rpc('super_admin_set_subscription_status' as never, {
      p_subscription_id: selSub.id, p_status: statusDialog.status, p_reason: statusReason,
    } as never);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Status atualizado' }); setStatusDialog({ open: false, status: '' }); setStatusReason(''); load(); }
  };

  const handleAddOverride = async () => {
    if (!selectedOrg || !ovKey || !ovMotivo) return;
    let parsed: unknown = ovValue;
    try { parsed = JSON.parse(ovValue); } catch { /* mantém texto */ }
    const { error } = await supabase.rpc('super_admin_add_override' as never, {
      p_organization_id: selectedOrg, p_key: ovKey, p_value: parsed,
      p_motivo: ovMotivo, p_valid_to: ovValidTo || null,
    } as never);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Exceção concedida' }); setOverrideDialog(false); setOvKey(''); setOvValue(''); setOvMotivo(''); setOvValidTo(''); load(); }
  };

  const handleLeadStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('commercial_leads').update({ status } as never).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setLeads(prev => prev.map(x => x.id === id ? { ...x, status } : x));
  };

  const handleRemoveOverride = async (id: string) => {
    const reason = window.prompt('Motivo da remoção:');
    if (!reason) return;
    const { error } = await supabase.rpc('super_admin_remove_override' as never, { p_override_id: id, p_reason: reason } as never);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Exceção removida' }); load(); }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <PageHeader title="Administração Geral (SaaS)" />
        <p className="text-muted-foreground -mt-2">Organizações, assinaturas, limites e exceções contratuais</p>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de organizações */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Organizações</CardTitle>
                <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo órgão</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {orgs.map(o => {
                  const s = orgSub(o.id);
                  return (
                    <button key={o.id} onClick={() => setSelectedOrg(o.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedOrg === o.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'}`}>
                      <div className="font-medium">{o.nome}</div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {s ? <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{STATUS_LABELS[s.status] ?? s.status}</Badge> : <Badge variant="outline">Sem assinatura</Badge>}
                        {s?.plan_versions?.plans?.nome && <Badge variant="outline">{s.plan_versions.plans.nome}</Badge>}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Detalhe da organização */}
            <div className="lg:col-span-2">
              {!sel ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione uma organização ao lado.</CardContent></Card>
              ) : (
                <Tabs defaultValue="resumo">
                  <TabsList>
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                    <TabsTrigger value="itens">Itens e valores</TabsTrigger>
                    <TabsTrigger value="excecoes">Exceções</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                  </TabsList>

                  <TabsContent value="resumo" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{sel.nome}</CardTitle>
                        <CardDescription>{sel.cnpj ?? 'Sem CNPJ'} · {sel.slug}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selSub ? (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div><div className="text-muted-foreground">Status</div><Badge>{STATUS_LABELS[selSub.status] ?? selSub.status}</Badge></div>
                              <div><div className="text-muted-foreground">Valor mensal</div><div className="font-semibold">{fmtBRL(selSub.contracted_amount_cents)}</div></div>
                              <div><div className="text-muted-foreground">Desconto</div><div className="font-semibold">{fmtBRL(selSub.discount_cents)}</div></div>
                              <div><div className="text-muted-foreground">Vigência até</div><div className="font-semibold">{selSub.current_period_end ? new Date(selSub.current_period_end + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div></div>
                            </div>
                            {(() => {
                              const u = orgUsage(sel.id); const e = orgEnt(sel.id);
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t pt-4">
                                  <div><div className="text-muted-foreground">Usuários internos</div><div className="font-semibold">{u?.internal_users_count ?? 0} / {e?.internal_users_limit ?? 'Ilimitado'}</div></div>
                                  <div><div className="text-muted-foreground">Usuários externos</div><div className="font-semibold">{u?.external_users_count ?? 0} / {e?.external_users_limit ?? 'Ilimitado'}</div></div>
                                  <div><div className="text-muted-foreground">Armazenamento</div><div className="font-semibold">{fmtGB(u?.storage_bytes_used)} / {fmtGB(e?.storage_limit_bytes)}</div></div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const e = orgEnt(sel.id);
                              if (!e) return null;
                              const mods = [
                                ['Obras/Medição', e.can_use_obras], ['RDO', e.can_use_rdo],
                                ['Manutenção', e.can_use_manutencao], ['Preventivos', e.can_use_preventivos],
                              ] as const;
                              return (
                                <div className="flex gap-2 flex-wrap border-t pt-4">
                                  {mods.map(([label, on]) => <Badge key={label} variant={on ? 'default' : 'outline'}>{label}</Badge>)}
                                </div>
                              );
                            })()}
                            <div className="flex gap-2 flex-wrap border-t pt-4">
                              {selSub.status === 'active' && (
                                <Button size="sm" variant="outline" onClick={() => setStatusDialog({ open: true, status: 'suspended' })}><PauseCircle className="h-4 w-4 mr-1" /> Suspender</Button>
                              )}
                              {['suspended', 'past_due'].includes(selSub.status) && (
                                <Button size="sm" variant="outline" onClick={() => setStatusDialog({ open: true, status: 'active' })}><PlayCircle className="h-4 w-4 mr-1" /> Reativar</Button>
                              )}
                              {selSub.status !== 'cancelled' && (
                                <Button size="sm" variant="destructive" onClick={() => setStatusDialog({ open: true, status: 'cancelled' })}><Ban className="h-4 w-4 mr-1" /> Cancelar</Button>
                              )}
                            </div>
                          </>
                        ) : <p className="text-muted-foreground">Esta organização ainda não tem assinatura.</p>}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="itens" className="mt-4">
                    <Card>
                      <CardHeader><CardTitle>Itens da assinatura</CardTitle></CardHeader>
                      <CardContent>
                        {!selSub ? <p className="text-muted-foreground">Sem assinatura.</p> : (
                          <div className="space-y-2">
                            {items.filter(i => i.subscription_id === selSub.id).map(i => (
                              <div key={i.id} className="flex justify-between items-center border-b pb-2 text-sm">
                                <span>{i.descricao ?? i.item_type}</span>
                                <span className="font-semibold">{fmtBRL(i.amount_cents)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="excecoes" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Exceções contratuais</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setOverrideDialog(true)}><Sparkles className="h-4 w-4 mr-1" /> Conceder exceção</Button>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {overrides.filter(o => o.organization_id === sel.id).length === 0 && <p className="text-muted-foreground text-sm">Nenhuma exceção.</p>}
                        {overrides.filter(o => o.organization_id === sel.id).map(o => (
                          <div key={o.id} className="flex justify-between items-center border-b pb-2 text-sm">
                            <div>
                              <div className="font-medium">{o.key} = {JSON.stringify(o.value)}</div>
                              <div className="text-muted-foreground text-xs">{o.motivo}{o.valid_to ? ` · até ${o.valid_to}` : ''}</div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveOverride(o.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="historico" className="mt-4">
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {history.filter(h => (h as { organization_id?: string }).organization_id === sel.id || true).slice(0, 50).map(h => (
                          <div key={h.id} className="border-b pb-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{h.entity} · {h.action}</span>
                              <span className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            {h.reason && <div className="text-muted-foreground text-xs">{h.reason}</div>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}

        {/* Dialog: criar órgão + assinatura */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo órgão + assinatura</DialogTitle>
              <DialogDescription>Contratação administrativa: sem pagamento online, cobrança por boleto/PIX/empenho fora do sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nome do órgão *</Label><Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Prefeitura Municipal de..." /></div>
                <div><Label>CNPJ</Label><Input value={newCnpj} onChange={e => setNewCnpj(e.target.value)} placeholder="00.000.000/0001-00" /></div>
                <div><Label>Sigla (slug) *</Label><Input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="prefeitura-x" /></div>
                <div>
                  <Label>Plano *</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{plans.map(p => <SelectItem key={p.key} value={p.key}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={newCycle} onValueChange={setNewCycle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vigência até</Label><Input type="date" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)} /></div>
                <div><Label>Referência do contrato</Label><Input value={newReference} onChange={e => setNewReference(e.target.value)} placeholder="Empenho nº..." /></div>
                <div><Label>Desconto (R$)</Label><Input value={newDiscount} onChange={e => setNewDiscount(e.target.value)} placeholder="0,00" /></div>
              </div>
              <div>
                <Label>Módulos</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {tiers.map(t => (
                    <label key={t.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={newTiers.includes(t.key)} onCheckedChange={c => setNewTiers(c ? [...newTiers, t.key] : newTiers.filter(k => k !== t.key))} />
                      {t.commercial_modules?.nome} — {t.nome}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Extras</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {addons.map(a => (
                    <label key={a.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={newAddons.includes(a.key)} onCheckedChange={c => setNewAddons(c ? [...newAddons, a.key] : newAddons.filter(k => k !== a.key))} />
                      {a.nome}
                    </label>
                  ))}
                </div>
              </div>
              <div><Label>Observações</Label><Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating}>{creating ? 'Criando...' : 'Criar e ativar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: mudança de status */}
        <Dialog open={statusDialog.open} onOpenChange={o => setStatusDialog({ open: o, status: statusDialog.status })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{STATUS_LABELS[statusDialog.status] ?? statusDialog.status} assinatura</DialogTitle>
              <DialogDescription>Informe o motivo — ele fica registrado no histórico.</DialogDescription>
            </DialogHeader>
            <Textarea value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Motivo..." />
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialog({ open: false, status: '' })}>Voltar</Button>
              <Button onClick={handleStatus} disabled={!statusReason}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: exceção */}
        <Dialog open={overrideDialog} onOpenChange={setOverrideDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conceder exceção contratual</DialogTitle>
              <DialogDescription>Ex.: storage_limit_bytes = 750 GB em bytes, internal_users_limit = 80, api_enabled = true.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Chave *</Label><Input value={ovKey} onChange={e => setOvKey(e.target.value)} placeholder="storage_limit_bytes" /></div>
              <div><Label>Valor *</Label><Input value={ovValue} onChange={e => setOvValue(e.target.value)} placeholder="804722065920 ou true" /></div>
              <div><Label>Motivo *</Label><Textarea value={ovMotivo} onChange={e => setOvMotivo(e.target.value)} /></div>
              <div><Label>Válida até (opcional)</Label><Input type="date" value={ovValidTo} onChange={e => setOvValidTo(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddOverride} disabled={!ovKey || !ovValue || !ovMotivo}>Conceder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
