import { useEffect, useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { INBOUND_POLICIES, inboundConfigError, normalizeInboundConfig, validateInboundConfig, type InboundConfig, type InboundPolicy } from '@/lib/maintenanceInboundConfig';

export function MaintenanceInboundSettings({ organizationId }: { organizationId: string }) {
  const { toast } = useToast();
  const [form,setForm] = useState<InboundConfig>({ enabled:false, alias:'',policy:'allowed_domains', domains:'',addresses:'' });
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [failed,setFailed] = useState(false);
  const [revision,setRevision] = useState(0);
  useEffect(()=> {
    let cancelled=false;
    setLoading(true); setFailed(false);
    (async()=> {
      const [org,addresses] = await Promise.all([
        supabase.from('organizations').select('maintenance_inbound_enabled,maintenance_inbound_alias,maintenance_sender_policy,maintenance_allowed_domains').eq('id',organizationId).single(),
        supabase.from('maintenance_inbound_addresses').select('address').eq('organization_id',organizationId).order('address').limit(10000),
      ]);
      if (cancelled) return;
      if (org.error || addresses.error || !org.data) setFailed(true);
      else setForm({enabled:org.data.maintenance_inbound_enabled,alias:org.data.maintenance_inbound_alias || '',policy:org.data.maintenance_sender_policy as InboundPolicy,domains:(org.data.maintenance_allowed_domains || []).join('\n'),addresses:(addresses.data || []).map(a=>a.address).join('\n')});
      setLoading(false);
    })().catch(()=> { if (!cancelled) { setFailed(true);setLoading(false); } });
    return ()=> {cancelled=true;};
  },[organizationId,revision]);
  const save=async()=> {
    const error=validateInboundConfig(form);
    if(error) {toast({title:error,variant:'destructive'});return;}
    const config=normalizeInboundConfig(form);setSaving(true);
    try {
      const {error:rpcError}=await supabase.rpc('super_admin_save_maintenance_inbound',{
        p_organization_id:organizationId,p_enabled:config.enabled,p_alias:config.alias || null,
        p_sender_policy:config.policy,p_allowed_domains:config.domains,p_addresses:config.addresses,
      });
      if(rpcError) {toast({title:inboundConfigError(rpcError.code),variant:'destructive'});return;}
      toast({title:'E-mail de Manutenção atualizado'});setRevision(r=>r+1);
    } catch { toast({title:inboundConfigError(),variant:'destructive'}); }
    finally {setSaving(false);}
  };
  if(loading) return <p className="text-muted-foreground py-4">Carregando configuração…</p>;
  if(failed) return <div className="space-y-3 py-4"><p className="text-destructive">Não foi possível carregar a configuração.</p><Button variant="outline" onClick={()=>setRevision(r=>r+1)}>Tentar novamente</Button></div>;
  return <section className="space-y-5 py-4" aria-label="E-mail de Manutenção">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-5 w-5"/>E-mail de Manutenção</h2>
    <fieldset disabled={saving} className="space-y-4">
      <div className="flex items-center gap-3"><Switch id="inbound-enabled" checked={form.enabled} onCheckedChange={enabled=>setForm(f=>({...f,enabled}))}/><Label htmlFor="inbound-enabled">Recebimento habilitado</Label></div>
      <div className="space-y-1"><Label htmlFor="inbound-alias">Alias inbound</Label><Input id="inbound-alias" maxLength={41} value={form.alias} onChange={e=>setForm(f=>({...f,alias:e.target.value.toLowerCase()}))}/>
        {form.alias.trim() && <div className="text-sm text-muted-foreground break-all">{form.alias.trim()}@manutencao.sidif.com.br<br/>chamados+{form.alias.trim()}@sidif.com.br</div>}
      </div>
      <div className="space-y-1"><Label htmlFor="inbound-policy">Política de remetente</Label><Select value={form.policy} onValueChange={policy=>setForm(f=>({...f,policy:policy as InboundPolicy}))}><SelectTrigger id="inbound-policy"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(INBOUND_POLICIES).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor="inbound-domains">Domínios permitidos</Label><Textarea id="inbound-domains" value={form.domains} onChange={e=>setForm(f=>({...f,domains:e.target.value}))} placeholder="orgao.gov.br" rows={3}/></div>
      <div className="space-y-1"><Label htmlFor="inbound-addresses">Endereços inbound exatos</Label><Textarea id="inbound-addresses" value={form.addresses} onChange={e=>setForm(f=>({...f,addresses:e.target.value}))} placeholder="manutencao@orgao.gov.br" rows={3}/></div>
      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2"/>{saving?'Salvando…':'Salvar configuração'}</Button>
    </fieldset>
  </section>;
}