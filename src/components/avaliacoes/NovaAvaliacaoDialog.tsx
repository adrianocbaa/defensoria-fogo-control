import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MunicipioCombobox } from '@/components/MunicipioCombobox';
import { UFS } from '@/lib/ufs';
import { rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { TIPO_LABEL } from '@/lib/avaliacao/labels';

export function NovaAvaliacaoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('NOVA_LOCACAO');
  const [uf, setUf] = useState('');
  const [mun, setMun] = useState<{ ibge: string; nome: string } | null>(null);
  const [tipoImovel, setTipoImovel] = useState('');
  const [resp, setResp] = useState('');
  const [processo, setProcesso] = useState('');
  const [saving, setSaving] = useState(false);
  const tecnicos = useQuery({
    queryKey: ['aval-tecnicos'],
    enabled: open,
    queryFn: () => rpc<{ user_id: string; display_name: string; cargo: string | null }[]>('aval_list_tecnicos', {}),
  });

  const submit = async () => {
    if (!uf || !mun || !tipoImovel.trim() || !resp) { toast.error('Preencha tipo, UF, município, tipo de imóvel e responsável.'); return; }
    setSaving(true);
    try {
      const id = await rpc<string>('aval_create', {
        p_tipo: tipo, p_uf: uf, p_municipio_nome: mun.nome, p_municipio_ibge: mun.ibge,
        p_tipo_imovel: tipoImovel.trim(), p_responsavel_id: resp, p_processo: processo.trim() || null,
      });
      toast.success('Avaliação criada.');
      onOpenChange(false);
      navigate(`/avaliacoes/${id}`);
    } catch (e) {
      toast.error(avalErrorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova avaliação</DialogTitle>
          <DialogDescription>O número é gerado automaticamente por organização e ano. O processo administrativo pode ser informado depois, mas é obrigatório para emitir o laudo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div className="grid gap-2">
              <Label>UF</Label>
              <Select value={uf} onValueChange={(v) => { setUf(v); setMun(null); }}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>{UFS.map((u) => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Município</Label>
              <MunicipioCombobox uf={uf} value={mun?.ibge ?? ''} onChange={(m) => setMun({ ibge: m.ibge, nome: m.nome })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="av-tipo-imovel">Tipo de imóvel</Label>
            <Input id="av-tipo-imovel" value={tipoImovel} onChange={(e) => setTipoImovel(e.target.value)} placeholder="Ex.: Sala comercial, casa, galpão" maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label>Responsável técnico</Label>
            <Select value={resp} onValueChange={setResp}>
              <SelectTrigger><SelectValue placeholder={tecnicos.isLoading ? 'Carregando…' : 'Selecione'} /></SelectTrigger>
              <SelectContent>
                {(tecnicos.data ?? []).map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.display_name}{t.cargo ? ` — ${t.cargo}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="av-processo">Processo administrativo (opcional agora)</Label>
            <Input id="av-processo" value={processo} onChange={(e) => setProcesso(e.target.value)} maxLength={120} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Criando…' : 'Criar avaliação'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
