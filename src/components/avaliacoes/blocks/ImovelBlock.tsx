import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { DuplicatePanel, emptyImovel, ImovelFields, type ImovelInput, useImovelCreator } from '../ImovelForm';
import { db } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDate, fmtNum } from '@/lib/avaliacao/labels';

const PRECISAO: Record<string, string> = { EXATA: 'Exata', APROXIMADA: 'Aproximada', BAIRRO: 'Bairro', MUNICIPIO: 'Município', DESCONHECIDA: 'Desconhecida' };
const EFEITO: Record<string, string> = { VALORIZA: 'Valoriza', DESVALORIZA: 'Desvaloriza', NEUTRO: 'Neutro' };

export function ImovelBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [form, setForm] = useState<ImovelInput>(emptyImovel(av.tipo_imovel));
  const creator = useImovelCreator({ ibge: av.municipio_ibge, nome: av.municipio_nome, uf: av.uf });
  const [vist, setVist] = useState<{ data: string; estado: string; obs: string } | null>(null);
  const [carac, setCarac] = useState<{ descricao: string; efeito: string } | null>(null);
  const [loc, setLoc] = useState<{ precisao: string; lat: string; lng: string } | null>(null);

  const dados = useAvalQuery(av.id, 'imovel', async () => {
    const { data: link } = await db.from('avaliacao_imoveis').select('imovel_id').eq('avaliacao_id', av.id).eq('papel', 'AVALIANDO').maybeSingle();
    if (!link) return { imovel: null, loc: null, vistorias: [], caracs: [] };
    const [im, l, vs, cs] = await Promise.all([
      db.from('imoveis').select('*').eq('id', link.imovel_id).single(),
      db.from('imovel_localizacao').select('*').eq('imovel_id', link.imovel_id).maybeSingle(),
      db.from('imovel_vistorias').select('*').eq('avaliacao_id', av.id).order('data_vistoria', { ascending: false }),
      db.from('avaliacao_caracteristicas_relevantes').select('*').eq('avaliacao_id', av.id).order('created_at'),
    ]);
    return { imovel: im.data as any, loc: l.data as any, vistorias: (vs.data ?? []) as any[], caracs: (cs.data ?? []) as any[] };
  });
  const canProp = ctx.can('property.edit');
  const canInsp = ctx.can('inspection.edit');
  const im = dados.data?.imovel;

  const vincular = async (decision?: { useExisting?: string; forceNew?: boolean }) => {
    const id = await creator.resolve(form, decision);
    if (!id) return;
    const { error } = await db.from('avaliacao_imoveis').insert({ avaliacao_id: av.id, imovel_id: id, papel: 'AVALIANDO' });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Imóvel avaliando vinculado.');
    ctx.refresh();
  };
  const salvarVistoria = async () => {
    if (!vist?.data) { toast.error('Informe a data da vistoria.'); return; }
    const { error } = await db.from('imovel_vistorias').insert({ avaliacao_id: av.id, imovel_id: im.id, data_vistoria: vist.data, estado_conservacao: vist.estado || null, observacao: vist.obs.trim() || null, status: 'CONCLUIDA' });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    setVist(null); ctx.refresh();
  };
  const salvarCarac = async () => {
    if (!carac?.descricao.trim()) return;
    const { error } = await db.from('avaliacao_caracteristicas_relevantes').insert({ avaliacao_id: av.id, descricao: carac.descricao.trim(), efeito: carac.efeito });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    setCarac(null); ctx.refresh();
  };
  const salvarLoc = async () => {
    if (!loc) return;
    const lat = loc.lat ? Number(loc.lat.replace(',', '.')) : null; const lng = loc.lng ? Number(loc.lng.replace(',', '.')) : null;
    if ((lat !== null && !(lat >= -90 && lat <= 90)) || (lng !== null && !(lng >= -180 && lng <= 180))) { toast.error('Coordenadas inválidas.'); return; }
    const { error } = await db.from('imovel_localizacao').upsert({ imovel_id: im.id, precisao: loc.precisao, latitude: lat, longitude: lng }, { onConflict: 'imovel_id' });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    setLoc(null); ctx.refresh();
  };

  if (dados.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!im) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Imóvel avaliando</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!canProp ? <p className="text-sm text-muted-foreground">Nenhum imóvel vinculado.</p> : <>
            <ImovelFields value={form} onChange={setForm} />
            {creator.dups && <DuplicatePanel dups={creator.dups} onUse={(id) => vincular({ useExisting: id })} onForce={() => vincular({ forceNew: true })} />}
            <div className="flex justify-end"><Button onClick={() => vincular()}>Cadastrar e vincular</Button></div>
          </>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Imóvel avaliando</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <p className="font-medium">{[im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || 'Endereço não informado'}</p>
          <p className="text-muted-foreground">{im.bairro ? `${im.bairro} · ` : ''}{im.municipio_nome}/{im.uf}</p>
          <p>{im.tipo_imovel} · Área construída {im.area_construida ? `${fmtNum(im.area_construida)} m²` : '—'} · Terreno {im.area_terreno ? `${fmtNum(im.area_terreno)} m²` : '—'}</p>
          <div className="flex items-center justify-between pt-2">
            <span>Localização: <Badge variant="outline">{PRECISAO[dados.data?.loc?.precisao ?? 'DESCONHECIDA']}</Badge></span>
            {canProp && <Button size="sm" variant="outline" onClick={() => setLoc({ precisao: dados.data?.loc?.precisao ?? 'APROXIMADA', lat: dados.data?.loc?.latitude?.toString() ?? '', lng: dados.data?.loc?.longitude?.toString() ?? '' })}>Editar localização</Button>}
          </div>
          {loc && (
            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-3">
              <Select value={loc.precisao} onValueChange={(p) => setLoc({ ...loc, precisao: p })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRECISAO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Latitude" value={loc.lat} onChange={(e) => setLoc({ ...loc, lat: e.target.value })} />
              <Input placeholder="Longitude" value={loc.lng} onChange={(e) => setLoc({ ...loc, lng: e.target.value })} />
              <div className="sm:col-span-3 flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setLoc(null)}>Cancelar</Button><Button size="sm" onClick={salvarLoc}>Salvar</Button></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Vistorias</CardTitle>
          {canInsp && <Button size="sm" variant="outline" onClick={() => setVist({ data: '', estado: '', obs: '' })}><Plus className="h-4 w-4 mr-1" />Registrar</Button>}
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {vist && (
            <div className="grid gap-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5"><Label>Data</Label><Input type="date" value={vist.data} onChange={(e) => setVist({ ...vist, data: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Estado de conservação</Label><Input value={vist.estado} onChange={(e) => setVist({ ...vist, estado: e.target.value })} maxLength={60} /></div>
              </div>
              <Textarea placeholder="Observações da vistoria" value={vist.obs} onChange={(e) => setVist({ ...vist, obs: e.target.value })} rows={3} maxLength={4000} />
              <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setVist(null)}>Cancelar</Button><Button size="sm" onClick={salvarVistoria}>Salvar</Button></div>
            </div>
          )}
          {(dados.data?.vistorias ?? []).length === 0 ? <p className="text-muted-foreground">Nenhuma vistoria registrada.</p> : (
            <ul className="divide-y">{dados.data!.vistorias.map((v) => <li key={v.id} className="py-2"><p className="font-medium">{fmtDate(v.data_vistoria)}{v.estado_conservacao ? ` · ${v.estado_conservacao}` : ''}</p>{v.observacao && <p className="text-muted-foreground whitespace-pre-wrap">{v.observacao}</p>}</li>)}</ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Características relevantes para arbitramento</CardTitle>
          {canProp && <Button size="sm" variant="outline" onClick={() => setCarac({ descricao: '', efeito: 'VALORIZA' })}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>}
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p className="text-muted-foreground">Registre aqui características do avaliando não captadas pelo modelo. Só elas podem justificar um arbítrio no resultado.</p>
          {carac && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Descrição" value={carac.descricao} onChange={(e) => setCarac({ ...carac, descricao: e.target.value })} maxLength={300} />
              <Select value={carac.efeito} onValueChange={(v) => setCarac({ ...carac, efeito: v })}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EFEITO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              <Button onClick={salvarCarac}>Salvar</Button>
            </div>
          )}
          <ul className="divide-y">{(dados.data?.caracs ?? []).map((c) => <li key={c.id} className="flex items-center justify-between py-2"><span>{c.descricao}</span><Badge variant="outline">{EFEITO[c.efeito]}</Badge></li>)}</ul>
        </CardContent>
      </Card>
    </div>
  );
}
