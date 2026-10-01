import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Check, Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmtBRL = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Plan { id: string; key: string; nome: string; descricao: string | null; ordem: number; destaque?: boolean; }
interface Tier { id: string; key: string; nome: string; descricao: string | null; module_id: string; commercial_modules?: { nome: string; key: string }; }
interface Addon { id: string; key: string; nome: string; descricao: string | null; }
interface PriceItem { plan_id: string | null; module_tier_id: string | null; addon_id: string | null; amount_cents: number; }

export default function Planos() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      const [p, t, a, pt] = await Promise.all([
        supabase.from('plans').select('*').eq('ativo', true).order('ordem'),
        supabase.from('module_tiers').select('*, commercial_modules(nome, key)').eq('ativo', true).order('ordem'),
        supabase.from('addons').select('*').eq('ativo', true),
        supabase.from('price_tables').select('id').eq('status', 'active').limit(1).maybeSingle(),
      ]);
      setPlans((p.data as Plan[]) ?? []);
      setTiers((t.data as unknown as Tier[]) ?? []);
      setAddons((a.data as Addon[]) ?? []);
      if (pt.data) {
        const { data: pi } = await supabase.from('price_items').select('plan_id, module_tier_id, addon_id, amount_cents').eq('price_table_id', pt.data.id).limit(10000);
        setPrices((pi as PriceItem[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const planPrice = (planId: string) => prices.find(p => p.plan_id === planId)?.amount_cents;
  const tierPrice = (tierId: string) => prices.find(p => p.module_tier_id === tierId)?.amount_cents;
  const addonPrice = (addonId: string) => prices.find(p => p.addon_id === addonId)?.amount_cents;

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

  const tiersByModule = tiers.reduce<Record<string, { nome: string; tiers: Tier[] }>>((acc, t) => {
    const k = t.commercial_modules?.nome ?? 'Outros';
    acc[k] = acc[k] ?? { nome: k, tiers: [] };
    acc[k].tiers.push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 space-y-10 max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao portal
          </Link>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Planos e preços do SiDIF</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gestão de obras, RDO, manutenção e preventivos para órgãos públicos. Núcleos e unidades ilimitados em todos os planos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : (
          <>
            {/* Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(p => (
                <Card key={p.id} className={p.key === 'institucional' ? 'border-primary shadow-md' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {p.nome}
                      {p.key === 'institucional' && <Badge>Mais completo</Badge>}
                    </CardTitle>
                    {p.descricao && <CardDescription>{p.descricao}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      {p.key === 'enterprise' ? (
                        <div className="text-2xl font-bold">Sob consulta</div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">{fmtBRL(planPrice(p.id))}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                        </>
                      )}
                    </div>
                    <Button className="w-full" variant={p.key === 'institucional' ? 'default' : 'outline'} onClick={() => openLead(p.key)}>
                      Solicitar proposta
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Módulos */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Módulos adicionais</h2>
              <p className="text-center text-muted-foreground text-sm">Contrate apenas o que o seu órgão precisa. O módulo de Obras — Gestão Completa já inclui a Medição.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(tiersByModule).map(mod => (
                  <Card key={mod.nome}>
                    <CardHeader><CardTitle className="text-lg">{mod.nome}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {mod.tiers.map(t => (
                        <div key={t.id} className="flex justify-between items-start gap-2 text-sm">
                          <div>
                            <div className="font-medium flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> {t.nome}</div>
                            {t.descricao && <div className="text-muted-foreground text-xs">{t.descricao}</div>}
                          </div>
                          <div className="font-semibold whitespace-nowrap">{fmtBRL(tierPrice(t.id))}/mês</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Armazenamento adicional</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {addons.map(a => (
                  <Card key={a.id}>
                    <CardContent className="pt-6 text-center space-y-1">
                      <div className="font-semibold">{a.nome}</div>
                      <div className="text-sm text-muted-foreground">{fmtBRL(addonPrice(a.id))}/mês</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="bg-accent/50">
              <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-semibold">Contratação administrativa</div>
                    <div className="text-sm text-muted-foreground">Atendemos dispensa, inexigibilidade e licitação. A proposta é montada sob medida para o seu órgão.</div>
                  </div>
                </div>
                <Button onClick={() => openLead()}>Falar com a equipe</Button>
              </CardContent>
            </Card>
          </>
        )}

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
                          <Checkbox checked={leadTiers.includes(t.key)} onCheckedChange={c => setLeadTiers(c ? [...leadTiers, t.key] : leadTiers.filter(k => k !== t.key))} />
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
                          <Checkbox checked={leadAddons.includes(a.key)} onCheckedChange={c => setLeadAddons(c ? [...leadAddons, a.key] : leadAddons.filter(k => k !== a.key))} />
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
