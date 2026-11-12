import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImpactDialog, type PendingChange } from '../ImpactDialog';
import { CompartilhadoAviso, type Compartilhamento } from '../CompartilhadoAviso';
import { CamposDinamicosSection, useVariaveisStatus } from '../VariaveisShared';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { DuplicatePanel, emptyImovel, ImovelFields, type ImovelInput, useImovelCreator } from '../ImovelForm';
import { db, rpc } from '@/lib/avaliacao/api';
import { camposInvalidos, montarAlteracoes, normalizar, paraFormulario, type CampoEdicao } from '@/lib/avaliacao/edicao';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDate, fmtNum } from '@/lib/avaliacao/labels';
import { alteracoesDinamicas, camposDinamicos, valorParaFormulario } from '@/lib/avaliacao/variaveis';

const PRECISAO: Record<string, string> = { EXATA: 'Exata', APROXIMADA: 'Aproximada', BAIRRO: 'Bairro', MUNICIPIO: 'Município', DESCONHECIDA: 'Desconhecida' };
const EFEITO: Record<string, string> = { VALORIZA: 'Valoriza', DESVALORIZA: 'Desvaloriza', NEUTRO: 'Neutro' };

export function ImovelBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [form, setForm] = useState<ImovelInput>(emptyImovel(av.tipo_imovel));
  const creator = useImovelCreator({ ibge: av.municipio_ibge, nome: av.municipio_nome, uf: av.uf });
  const [vist, setVist] = useState<{ data: string; estado: string; obs: string } | null>(null);
  const [carac, setCarac] = useState<{ descricao: string; efeito: string } | null>(null);
  const [edit, setEdit] = useState<{ form: Record<string, string>; original: Record<string, unknown>; share: Compartilhamento | null } | null>(null);
  const [changes, setChanges] = useState<PendingChange[] | null>(null);
  const [dyn, setDyn] = useState<Record<string, string> | null>(null);
  const [dynChanges, setDynChanges] = useState<PendingChange[] | null>(null);
  const status = useVariaveisStatus(av.id);

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
  const camposImovel = (id: string): CampoEdicao[] => [
    { chave: 'tipo_imovel', entity_type: 'imovel', entity_id: id, campo: 'tipo_imovel', rotulo: 'Tipo de imóvel', tipo: 'texto' },
    { chave: 'endereco', entity_type: 'imovel', entity_id: id, campo: 'endereco', rotulo: 'Endereço', tipo: 'texto' },
    { chave: 'numero', entity_type: 'imovel', entity_id: id, campo: 'numero', rotulo: 'Número', tipo: 'texto' },
    { chave: 'complemento', entity_type: 'imovel', entity_id: id, campo: 'complemento', rotulo: 'Complemento/unidade', tipo: 'texto' },
    { chave: 'bairro', entity_type: 'imovel', entity_id: id, campo: 'bairro', rotulo: 'Bairro', tipo: 'texto' },
    { chave: 'area_construida', entity_type: 'imovel', entity_id: id, campo: 'area_construida', rotulo: 'Área construída', tipo: 'numero', casas: 2, sufixo: 'm²' },
    { chave: 'area_terreno', entity_type: 'imovel', entity_id: id, campo: 'area_terreno', rotulo: 'Área do terreno', tipo: 'numero', casas: 2, sufixo: 'm²' },
    { chave: 'anuncio_url', entity_type: 'imovel', entity_id: id, campo: 'anuncio_url', rotulo: 'Link do anúncio', tipo: 'texto' },
    { chave: 'anuncio_id', entity_type: 'imovel', entity_id: id, campo: 'anuncio_id', rotulo: 'Código do anúncio', tipo: 'texto' },
    { chave: 'precisao', entity_type: 'imovel_localizacao', entity_id: id, campo: 'precisao', rotulo: 'Precisão da localização', tipo: 'opcao', opcoes: PRECISAO },
    { chave: 'latitude', entity_type: 'imovel_localizacao', entity_id: id, campo: 'latitude', rotulo: 'Latitude', tipo: 'numero', casas: 7 },
    { chave: 'longitude', entity_type: 'imovel_localizacao', entity_id: id, campo: 'longitude', rotulo: 'Longitude', tipo: 'numero', casas: 7 },
  ];
  const abrirEdicao = async () => {
    const l = dados.data?.loc;
    const original: Record<string, unknown> = { ...im, precisao: l?.precisao ?? null, latitude: l?.latitude ?? null, longitude: l?.longitude ?? null };
    const form: Record<string, string> = {};
    for (const c of camposImovel(im.id)) form[c.chave] = paraFormulario(c.tipo, original[c.chave]);
    setEdit({ form, original, share: null });
    try {
      const share = await rpc<Compartilhamento>('aval_imovel_sharing', { p_avaliacao: av.id, p_imovel: im.id, p_dado: null });
      setEdit((e) => (e ? { ...e, share } : e));
    } catch { /* aviso de compartilhamento é informativo */ }
  };
  const revisar = () => {
    if (!edit) return;
    const cs = camposImovel(im.id);
    const inval = camposInvalidos(cs, edit.form);
    if (inval.length) { toast.error(`Revise: ${inval.join(', ')}.`); return; }
    if (!edit.form.tipo_imovel.trim()) { toast.error('Informe o tipo de imóvel.'); return; }
    for (const k of ['area_construida', 'area_terreno']) { const n = normalizar('numero', edit.form[k]); if (n !== null && !((n as number) > 0)) { toast.error('As áreas precisam ser maiores que zero.'); return; } }
    const lat = normalizar('numero', edit.form.latitude, 7) as number | null; const lng = normalizar('numero', edit.form.longitude, 7) as number | null;
    if ((lat !== null && !(lat >= -90 && lat <= 90)) || (lng !== null && !(lng >= -180 && lng <= 180))) { toast.error('Coordenadas inválidas.'); return; }
    const lote = montarAlteracoes(cs, edit.original, edit.form);
    if (!lote.length) { toast.info('Nenhum campo foi alterado.'); return; }
    setChanges(lote);
  };

  // Dados que as variáveis da avaliação exigem do avaliando (gravados na própria fonte: característica do imóvel ou valor manual).
  const camposAv = camposDinamicos(status.data, 'AVALIANDO');
  const originalAv = Object.fromEntries((status.data?.variaveis ?? []).map((v) => [v.id, v.valor_avaliando]));
  const dynForm = dyn ?? Object.fromEntries(camposAv.map((c) => [c.variavel.id, valorParaFormulario(c.variavel, c.variavel.valor_avaliando)]));
  const salvarDyn = () => {
    if (!im) return;
    const { alteracoes, invalidos } = alteracoesDinamicas(camposAv, originalAv, dynForm, { imovel_id: im.id });
    if (invalidos.length) { toast.error(`Revise: ${invalidos.join(', ')}.`); return; }
    if (!alteracoes.length) { toast.info('Nenhum campo foi alterado.'); return; }
    setDynChanges(alteracoes);
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
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-2">
          <CardTitle className="text-base">Imóvel avaliando</CardTitle>
          {canProp && <Button size="sm" variant="outline" onClick={abrirEdicao} aria-label="Editar imóvel avaliando"><Pencil className="h-4 w-4 mr-1" />Editar imóvel</Button>}
        </CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <p className="font-medium">{[im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || 'Endereço não informado'}</p>
          <p className="text-muted-foreground">{im.bairro ? `${im.bairro} · ` : ''}{im.municipio_nome}/{im.uf}</p>
          <p>{im.tipo_imovel} · Área construída {im.area_construida ? `${fmtNum(im.area_construida)} m²` : '—'} · Terreno {im.area_terreno ? `${fmtNum(im.area_terreno)} m²` : '—'}</p>
          <p className="pt-1">Localização: <Badge variant="outline">{PRECISAO[dados.data?.loc?.precisao ?? 'DESCONHECIDA']}</Badge>
            {dados.data?.loc?.latitude != null && dados.data?.loc?.longitude != null && <span className="ml-2 text-xs text-muted-foreground tabular-nums">{dados.data.loc.latitude}, {dados.data.loc.longitude}</span>}</p>
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
        <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base">Dados necessários para esta avaliação</CardTitle>
            <p className="text-sm text-muted-foreground">Vêm das variáveis da pesquisa. O valor de mercado (variável dependente) não é pedido no avaliando.</p>
          </div>
          {canProp && camposAv.some((c) => c.editavel) && <Button size="sm" onClick={salvarDyn} disabled={!dyn}>Salvar dados</Button>}
        </CardHeader>
        <CardContent>
          <CamposDinamicosSection campos={camposAv} form={dynForm} onChange={(id, v) => setDyn({ ...dynForm, [id]: v })} referencias={originalAv}
            idPrefix="av" disabled={!canProp}
            vazio={<p className="text-sm text-muted-foreground">Nenhuma variável exige dados do avaliando. <Link className="underline underline-offset-2" to={`/avaliacoes/${av.id}/variaveis`}>Definir variáveis da pesquisa</Link></p>} />
          <ImpactDialog avaliacaoId={av.id} changes={dynChanges} titulo="Revisar dados do avaliando"
            onClose={() => setDynChanges(null)} onApplied={() => { setDyn(null); ctx.refresh(); }} />
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

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar imóvel avaliando</DialogTitle>
            <DialogDescription>Corrige o cadastro físico existente; o imóvel continua o mesmo. Fotografias de conjuntos e laudos emitidos não mudam.</DialogDescription>
          </DialogHeader>
          {edit && (() => {
            const setF = (k: string, v: string) => setEdit({ ...edit, form: { ...edit.form, [k]: v } });
            const imv = edit.form as unknown as ImovelInput;
            return (
              <div className="space-y-4">
                {edit.share?.compartilhado && <CompartilhadoAviso share={edit.share}><p className="text-muted-foreground">A correção vale para todos os registros vivos que usam este imóvel.</p></CompartilhadoAviso>}
                <ImovelFields value={imv} onChange={(v) => setEdit({ ...edit, form: { ...edit.form, ...(v as unknown as Record<string, string>) } })} showAnuncio />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="grid gap-1.5"><Label>Precisão da localização</Label>
                    <Select value={edit.form.precisao || undefined} onValueChange={(p) => setF('precisao', p)}><SelectTrigger><SelectValue placeholder="Não informada" /></SelectTrigger><SelectContent>{Object.entries(PRECISAO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-1.5"><Label htmlFor="ei-lat">Latitude</Label><Input id="ei-lat" inputMode="decimal" value={edit.form.latitude} onChange={(e) => setF('latitude', e.target.value)} placeholder="-15,6014" /></div>
                  <div className="grid gap-1.5"><Label htmlFor="ei-lng">Longitude</Label><Input id="ei-lng" inputMode="decimal" value={edit.form.longitude} onChange={(e) => setF('longitude', e.target.value)} placeholder="-56,0979" /></div>
                </div>
              </div>
            );
          })()}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={revisar}>Revisar alterações</Button></DialogFooter>
          <ImpactDialog avaliacaoId={av.id} changes={changes} titulo="Revisar alterações do imóvel avaliando"
            onClose={() => setChanges(null)} onApplied={() => { setEdit(null); ctx.refresh(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
