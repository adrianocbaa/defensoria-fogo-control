import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface Props { organizationId: string; organizationName: string }

export function InviteOrgAdminCard({ organizationId, organizationName }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast({ title: 'Informe um e-mail válido', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: e, displayName: nome.trim() || undefined, role: 'admin', organizationId },
    });
    setSending(false);
    const msg = (data as { error?: string } | null)?.error ?? error?.message;
    if (msg) {
      toast({ title: 'Não foi possível convidar', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Administrador convidado', description: `${e} recebeu por e-mail o acesso a ${organizationName}.` });
    setEmail(''); setNome('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Convidar administrador do órgão</CardTitle>
        <CardDescription>
          O administrador recebe por e-mail uma senha temporária e troca no primeiro acesso. Depois ele cadastra os demais usuários do órgão, dentro dos limites do plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-1"><Label>Nome</Label><Input value={nome} onChange={ev => setNome(ev.target.value)} placeholder="Nome do administrador" /></div>
        <div className="space-y-1"><Label>E-mail institucional</Label><Input type="email" value={email} onChange={ev => setEmail(ev.target.value)} placeholder="nome@orgao.gov.br" /></div>
        <Button onClick={handleInvite} disabled={sending}>{sending ? 'Enviando…' : 'Enviar convite'}</Button>
      </CardContent>
    </Card>
  );
}
