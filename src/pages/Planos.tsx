import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Building2, ArrowLeft, ArrowRight, Users, HardDrive, ShieldCheck, ClipboardList, Crown, FileText, Wrench, Flame, BriefcaseBusiness } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoSidif from '@/assets/sidif-logo-oficial.png';

const fmtBRL = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Plan { id: string; key: string; nome: string; descricao?: string | null; ordem: number; }
interface Tier { id: string; key: string; nome: string; descricao: string | null; module_id: string; commercial_modules?: { nome: string; key: string }; }
interface Addon { id: string; key: string; nome: string; descricao?: string | null; }
interface PriceItem { plan_id: string | null; module_tier_id: string | null; addon_id: string | null; amount_cents: number; }
interface PlanVersion { plan_id: string; internal_users_limit: number; external_users_limit: number; storage_limit_bytes: number; valid_to: string | null; }

export default function Planos() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPlan, setLeadPlan] = useState('');
  const [leadTiers, setLeadTiers] = useState<string[]>([]);
  const [leadAddons, setLeadAddons] = useState<string[]>([]);
  const [nomeOrgao, setNomeOrgao] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, t, a, pt, pv] = await Promise.all([
        supabase.from('plans').select('*').eq('ativo', true).order('ordem'),
        supabase.from('module_tiers').select('*, commercial_modules(nome, key)').eq('ativo', true).order('ordem'),
        supabase.from('addons').select('*').eq('ativo', true),
        supabase.from('price_tables').select('id').eq('status', 'active').limit(1).maybeSingle(),
        supabase.from('plan_versions').select('plan_id, internal_users_limit, external_users_limit, storage_limit_bytes, valid_to').is('valid_to', null).limit(10000),
      ]);
      setPlans((p.data as Plan[]) ?? []);
      setTiers((t.data as unknown as Tier[]) ?? []);
      setAddons((a.data as Addon[]) ?? []);
      setVersions((pv.data as PlanVersion[]) ?? []);
      setLoadError(Boolean(p.error || t.error || a.error || pt.error || pv.error || !pt.data));
      if (pt.data) {
        const { data: pi, error } = await supabase.from('price_items').select('plan_id, module_tier_id, addon_id, amount_cents').eq('price_table_id', pt.data.id).limit(10000);
        setPrices((pi as PriceItem[]) ?? []);
        if (error) setLoadError(true);
      }
      setLoading(false);
    })();
  }, []);

  const planPrice = (planId: string) => prices.find(p => p.plan_id === planId)?.amount_cents;
  const tierPrice = (tierId: string, planId?: string) => prices.find(p => p.module_tier_id === tierId && p.plan_id === planId)?.amount_cents;
  const addonPrice = (addonId: string) => prices.find(p => p.addon_id === addonId)?.amount_cents;

  const selectedPlan = plans.find(p => p.key === leadPlan);
  const selectedTiers = tiers.filter(t => leadTiers.includes(t.key));
  const selectedAddons = addons.filter(a => leadAddons.includes(a.key));
  const total = selectedPlan && prices.length
    ? (planPrice(selectedPlan.id) ?? 0) + selectedTiers.reduce((sum, t) => sum + (tierPrice(t.id, selectedPlan.id) ?? 0), 0) + selectedAddons.reduce((sum, a) => sum + (addonPrice(a.id) ?? 0), 0)
    : null;

  const toggleTier = (tier: Tier) => {
    setLeadTiers(current => {
      if (current.includes(tier.key)) return current.filter(k => k !== tier.key);
      // Each commercial module has one tier; Gestão Completa already includes Medição.
      return [...current.filter(k => !tiers.some(t => t.key === k && t.module_id === tier.module_id)), tier.key];
    });
  };

  const toggleAddon = (addon: Addon) => setLeadAddons(current => current.includes(addon.key) ? current.filter(k => k !== addon.key) : [...current, addon.key]);

  const openLead = (planKey?: string) => {
    if (planKey) setLeadPlan(planKey);
    setSent(false);
    setLeadOpen(true);
  };

  const handleSend = async () => {
    if (!nomeOrgao || !contatoNome || !email) {
      toast({ title: 'Preencha órgão, nome do contato e e-mail', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('commercial_leads').insert({
      nome_orgao: nomeOrgao,
      cnpj: cnpj || null,
      contato_nome: contatoNome,
      email,
      telefone: telefone || null,
      plan_key: leadPlan || null,
      module_tier_keys: leadTiers,
      addon_keys: leadAddons,
      mensagem: mensagem || null,
    } as never);
    setSending(false);
    if (error) {
      toast({ title: 'Não foi possível enviar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
          <Link to="/landing" aria-label="SiDIF — início"><img src={logoSidif} alt="SiDIF" className="h-9 w-auto object-contain" /></Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/landing"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/auth">Acessar sistema</Link></Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase text-primary">PLANOS E CONTRATAÇÃO</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Escolha o plano ideal para sua instituição</h1>
          <p className="mt-1 text-sm text-muted-foreground">Selecione o porte da operação, adicione módulos e ajuste a capacidade conforme a necessidade.</p>
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          : loadError ? <div role="alert" className="border border-destructive/40 p-6 text-sm">Não foi possível carregar os planos agora. Tente novamente mais tarde.</div>
          : <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
            <main className="min-w-0 space-y-9">
              <section aria-labelledby="plan-heading">
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  {['Plano', 'Módulos', 'Capacidade', 'Resumo'].map((step, i) => <div key={step} className="flex flex-1 items-center gap-2 border-t border-border pt-2"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span><span className="hidden sm:inline">{step}</span></div>)}
                </div>
                <h2 id="plan-heading" className="text-lg font-semibold">Seleção do plano</h2>
                <p className="mb-4 text-sm text-muted-foreground">Escolha o plano que melhor se ajusta ao porte da sua operação.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {plans.map(p => {
                    const version = versions.find(v => v.plan_id === p.id);
                    const selected = leadPlan === p.key;
                    const Icon = p.key === 'base' ? Building2 : p.key === 'equipe' ? Users : p.key === 'institucional' ? BriefcaseBusiness : Crown;
                    return <Card key={p.id} className={`flex min-w-0 flex-col rounded-md transition-colors ${selected ? 'border-primary ring-1 ring-primary' : ''}`}>
                      <CardContent className="flex h-full flex-col p-4">
                        <div className="mb-3 flex min-h-9 items-start justify-between gap-1"><div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>{p.key === 'institucional' && <Badge variant="secondary" className="whitespace-normal text-center text-[10px]">Instituições maiores</Badge>}</div>
                        <h3 className="text-sm font-bold uppercase">{p.nome}</h3>
                        <p className="mt-1 min-h-9 text-xs text-muted-foreground">{p.key === 'base' ? 'Para operações menores' : p.key === 'equipe' ? 'Para equipes estruturadas' : p.key === 'institucional' ? 'Para instituições com múltiplas unidades' : 'Para operações de alta complexidade'}</p>
                        <ul className="mt-3 min-h-[100px] space-y-1.5 text-xs">
                          {version && <><li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-primary" />{version.internal_users_limit} usuários internos</li><li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-primary" />{version.external_users_limit} colaboradores externos</li><li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-primary" />{Math.round(version.storage_limit_bytes / 1e9).toLocaleString('pt-BR')} GB de armazenamento</li></>}
                          <li className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-primary" />Núcleos ilimitados</li>
                        </ul>
                        <div className="mt-auto pt-4"><p className="mb-2 text-lg font-bold">{p.key === 'enterprise' ? 'Sob consulta' : <>{fmtBRL(planPrice(p.id))}<span className="text-xs font-normal text-muted-foreground">/mês</span></>}</p>
                          <Button className="w-full" size="sm" variant={selected ? 'default' : 'outline'} aria-pressed={selected} onClick={() => setLeadPlan(p.key)}>{selected ? <><Check className="mr-2 h-4 w-4" />Selecionado</> : 'Selecionar'}</Button>
                        </div>
                      </CardContent>
                    </Card>;
                  })}
                </div>
              </section>

              <section aria-labelledby="modules-heading">
                <h2 id="modules-heading" className="text-lg font-semibold">Módulos disponíveis</h2>
                <p className="mb-4 text-sm text-muted-foreground">Adicione os módulos necessários à sua instituição. Gestão Completa de Obras já inclui Medição.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {tiers.map(t => {
                    const selected = leadTiers.includes(t.key);
                    const price = selectedPlan ? tierPrice(t.id, selectedPlan.id) : undefined;
                    const Icon = t.commercial_modules?.key === 'obras' ? ClipboardList : t.commercial_modules?.key === 'manutencao' ? Wrench : Flame;
                    return <Card key={t.id} className={`flex flex-col rounded-md transition-colors ${selected ? 'border-primary ring-1 ring-primary' : ''}`}><CardContent className="flex h-full flex-col p-4">
                      <div className="mb-3 flex items-start gap-2"><span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0"><h3 className="text-sm font-semibold leading-snug">{t.nome}</h3><p className="text-xs text-muted-foreground">{t.commercial_modules?.nome}</p></div></div>
                      <p className="mt-auto pt-3 text-sm font-semibold">{price == null ? 'Selecione um plano' : `+ ${fmtBRL(price)}/mês`}</p>
                      <Button className="mt-2 w-full" size="sm" variant={selected ? 'secondary' : 'outline'} aria-pressed={selected} onClick={() => toggleTier(t)}>{selected ? <><Check className="mr-2 h-4 w-4" />Adicionado</> : 'Adicionar'}</Button>
                    </CardContent></Card>;
                  })}
                </div>
              </section>

              <section aria-labelledby="capacity-heading">
                <h2 id="capacity-heading" className="text-lg font-semibold">Capacidade adicional</h2>
                <p className="mb-4 text-sm text-muted-foreground">Adicione mais espaço de armazenamento conforme a necessidade da sua operação.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{addons.map(a => <Card key={a.id} className={`rounded-md transition-colors ${leadAddons.includes(a.key) ? 'border-primary ring-1 ring-primary' : ''}`}><CardContent className="flex items-center gap-3 p-3"><HardDrive className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{a.nome.replace('Armazenamento adicional SiDIF ', '')}</p><p className="text-xs text-muted-foreground">+ {fmtBRL(addonPrice(a.id))}/mês</p></div><Checkbox aria-label={`Adicionar ${a.nome}`} checked={leadAddons.includes(a.key)} onCheckedChange={() => toggleAddon(a)} /></CardContent></Card>)}</div>
              </section>

              <div className="flex items-start gap-3 border-t pt-5 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Contratação administrativa: atendemos dispensa, inexigibilidade e licitação. Os valores exibidos são uma estimativa; a proposta é formalizada com seu órgão.</p></div>
            </main>

            <aside aria-label="Resumo da contratação" className="xl:sticky xl:top-6 xl:self-start">
              <Card className="rounded-md"><CardContent className="p-5">
                <h2 className="mb-4 text-lg font-semibold">Resumo da contratação</h2>
                <div className="space-y-4 text-sm">
                  <div className="border-t pt-3"><p className="font-semibold">Plano</p><div className="mt-2 flex justify-between gap-2 text-muted-foreground"><span>{selectedPlan?.nome ?? 'Selecione um plano'}</span><span className="whitespace-nowrap">{selectedPlan ? selectedPlan.key === 'enterprise' ? 'Sob consulta' : fmtBRL(planPrice(selectedPlan.id)) : '—'}</span></div></div>
                  <div className="border-t pt-3"><p className="font-semibold">Módulos</p>{selectedTiers.length ? selectedTiers.map(t => <div key={t.key} className="mt-2 flex justify-between gap-2 text-muted-foreground"><span>{t.nome}</span><span className="whitespace-nowrap">{selectedPlan ? fmtBRL(tierPrice(t.id, selectedPlan.id)) : '—'}</span></div>) : <p className="mt-2 text-muted-foreground">Nenhum selecionado</p>}</div>
                  <div className="border-t pt-3"><p className="font-semibold">Capacidade extra</p>{selectedAddons.length ? selectedAddons.map(a => <div key={a.key} className="mt-2 flex justify-between gap-2 text-muted-foreground"><span>{a.nome.replace('Armazenamento adicional SiDIF ', '')}</span><span className="whitespace-nowrap">{fmtBRL(addonPrice(a.id))}</span></div>) : <p className="mt-2 text-muted-foreground">Nenhuma selecionada</p>}</div>
                  <div className="border-t pt-3"><div className="flex justify-between gap-2 font-bold"><span>Total mensal</span><span>{selectedPlan?.key === 'enterprise' ? 'Sob consulta' : total == null ? '—' : fmtBRL(total)}</span></div>{total != null && selectedPlan?.key !== 'enterprise' && <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>Estimativa anual</span><span>{fmtBRL(total * 12)}</span></div>}</div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Valores sujeitos à proposta e formalização contratual.</p>
                <Button className="mt-5 w-full" onClick={() => openLead()}><FileText className="mr-2 h-4 w-4" />Solicitar proposta <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </CardContent></Card>
            </aside>
          </div>}

        {/* Dialog: pedido de proposta */}
        <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {sent ? (
              <div className="py-8 text-center space-y-3">
                <DialogHeader><DialogTitle>Pedido enviado</DialogTitle></DialogHeader>
                <p className="text-muted-foreground">Recebemos seu pedido de proposta. Nossa equipe entrará em contato pelo e-mail informado.</p>
                <Button onClick={() => setLeadOpen(false)}>Fechar</Button>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Solicitar proposta</DialogTitle>
                  <DialogDescription>Sem compromisso: montamos a proposta e enviamos por e-mail.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Órgão *</Label><Input value={nomeOrgao} onChange={e => setNomeOrgao(e.target.value)} placeholder="Prefeitura Municipal de..." /></div>
                    <div><Label>CNPJ</Label><Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" /></div>
                    <div><Label>Seu nome *</Label><Input value={contatoNome} onChange={e => setContatoNome(e.target.value)} /></div>
                    <div><Label>E-mail institucional *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(65) 99999-0000" /></div>
                    <div>
                      <Label>Plano de interesse</Label>
                      <Select value={leadPlan} onValueChange={setLeadPlan}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{plans.map(p => <SelectItem key={p.key} value={p.key}>{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Módulos de interesse</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {tiers.map(t => (
                        <label key={t.key} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={leadTiers.includes(t.key)} onCheckedChange={() => toggleTier(t)} />
                          {t.commercial_modules?.nome} — {t.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Extras</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {addons.map(a => (
                        <label key={a.key} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={leadAddons.includes(a.key)} onCheckedChange={() => toggleAddon(a)} />
                          {a.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><Label>Mensagem</Label><Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Conte um pouco sobre a necessidade do órgão..." /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLeadOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSend} disabled={sending}>{sending ? 'Enviando...' : 'Enviar pedido'}</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
