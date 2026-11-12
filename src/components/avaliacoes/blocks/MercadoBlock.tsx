import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { DuplicatePanel, emptyImovel, ImovelFields, type ImovelInput, useImovelCreator } from '../ImovelForm';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime, fmtMoney, fmtNum } from '@/lib/avaliacao/labels';

const NATUREZA: Record<string, string> = { OFERTA: 'Oferta', NEGOCIACAO: 'Negociação', CONTRATO_PRIVADO: 'Contrato privado', CONTRATO_PUBLICO: 'Contrato público', OUTRO: 'Outro' };
const FONTE: Record<string, string> = { IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor', PROPRIETARIO: 'Proprietário', PORTAL: 'Portal', ORGAO_PUBLICO: 'Órgão público', REDE_SOCIAL: 'Rede social', PLACA: 'Placa', OUTRO: 'Outro' };
const CONJ: Record<string, string> = { RASCUNHO: 'Rascunho', CONGELADO: 'Congelado (vigente)', SUPERADO: 'Superado', EM_USO: 'Em uso' };
const num = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function MercadoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [add, setAdd] = useState(false);
  const [im, setIm] = useState<ImovelInput>(emptyImovel(av.tipo_imovel));
  const [dado, setDado] = useState({ natureza: 'OFERTA', ofertado: '', utilizado: '', data: '', fonteTipo: 'IMOBILIARIA', fonteNome: '', origem: 'LOCAL' });
  const [freeze, setFreeze] = useState(false);
  const [mun, setMun] = useState<{ nome: string; uf: string; just: string } | null>(null);
  const creator = useImovelCreator({ ibge: av.municipio_ibge, nome: av.municipio_nome, uf: av.uf });

  const q = useAvalQuery(av.id, 'mercado', async () => {
    const [am, cj, mc] = await Promise.all([
      db.from('avaliacao_amostras').select('*, dados_mercado(*, imoveis(*))').eq('avaliacao_id', av.id).order('created_at').limit(10000),
      db.from('avaliacao_conjuntos_dados').select('*').eq('avaliacao_id', av.id).order('versao', { ascending: false }),
      db.from('avaliacao_municipios_comparaveis').select('*').eq('avaliacao_id', av.id).order('created_at'),
    ]);
    if (am.error) throw am.error;
    return { amostras: am.data as any[], conjuntos: (cj.data ?? []) as any[], municipios: (mc.data ?? []) as any[] };
  });
  const canEdit = ctx.can('market.edit');
  const canSel = ctx.can('market.select_samples');
  const amostras = q.data?.amostras ?? [];
  const vigente = (q.data?.conjuntos ?? []).find((c) => c.status === 'CONGELADO');

  const salvar = async (decision?: { useExisting?: string; forceNew?: boolean }) => {
    const valorUt = num(dado.utilizado) ?? num(dado.ofertado);
    if (!valorUt || valorUt <= 0) { toast.error('Informe o valor do dado de mercado.'); return; }
    const imovelId = await creator.resolve(im, decision);
    if (!imovelId) return;
    try {
      const area = num(im.area_construida);
      const { data: d, error } = await db.from('dados_mercado').insert({
        imovel_id: imovelId, natureza_dado: dado.natureza, valor_ofertado: num(dado.ofertado), valor_utilizado: valorUt,
        valor_unitario: area ? Math.round((valorUt / area) * 10000) / 10000 : null, data_observacao: dado.data || null,
        url_anuncio: im.anuncio_url.trim() || null, anuncio_id: im.anuncio_id.trim() || null,
      }).select('id').single();
      if (error) throw error;
      if (dado.fonteNome.trim()) {
        const { data: f, error: fe } = await db.from('fontes_mercado').insert({ tipo: dado.fonteTipo, nome: dado.fonteNome.trim() }).select('id').single();
        if (fe) throw fe;
        await db.from('dados_mercado_fontes').insert({ dado_id: d.id, fonte_id: f.id, principal: true });
      }
      const { error: ae } = await db.from('avaliacao_amostras').insert({ avaliacao_id: av.id, dado_id: d.id, origem_territorial: dado.origem });
      if (ae) throw ae;
      toast.success('Dado de mercado incluído.');
      setAdd(false); setIm(emptyImovel(av.tipo_imovel)); setDado({ ...dado, ofertado: '', utilizado: '', fonteNome: '' });
      ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const toggle = async (a: any, campo: 'selecionada' | 'habilitada_modelo', v: boolean) => {
    const { error } = await db.from('avaliacao_amostras').update({ [campo]: v }).eq('id', a.id);
    if (error) toast.error(avalErrorMessage(error)); else ctx.refresh();
  };
  const congelar = async () => {
    try {
      const cj = await rpc<string>('aval_dataset_prepare', { p_avaliacao: av.id });
      await rpc('aval_dataset_freeze', { p_conjunto: cj });
      toast.success('Conjunto de dados congelado.');
      setFreeze(false); ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const salvarMun = async () => {
    if (!mun || !mun.nome.trim() || mun.just.trim().length < 10) { toast.error('Informe o município e uma justificativa.'); return; }
    const { error } = await db.from('avaliacao_municipios_comparaveis').insert({ avaliacao_id: av.id, uf: mun.uf, municipio_nome: mun.nome.trim(), justificativa: mun.just.trim(), status: 'SUGERIDO' });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    setMun(null); ctx.refresh();
  };
  const decidirMun = async (m: any, status: 'APROVADO' | 'REJEITADO') => {
    const { error } = await db.from('avaliacao_municipios_comparaveis').update({ status, decidido_em: new Date().toISOString() }).eq('id', m.id);
    if (error) toast.error(avalErrorMessage(error)); else ctx.refresh();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle className="text-base">Amostras de mercado ({amostras.filter((a) => a.selecionada).length} selecionadas)</CardTitle>
          <div className="flex gap-2">
            {canEdit && <Button size="sm" variant="outline" onClick={() => setAdd(true)}><Plus className="h-4 w-4 mr-1" />Dado de mercado</Button>}
            {canSel && <Button size="sm" onClick={() => setFreeze(true)} disabled={!amostras.some((a) => a.selecionada)}><Lock className="h-4 w-4 mr-1" />Congelar conjunto</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {amostras.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum dado de mercado incluído.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-12">Usar</TableHead><TableHead className="w-16">No modelo</TableHead><TableHead>Imóvel</TableHead>
                <TableHead>Natureza</TableHead><TableHead className="text-right">Área (m²)</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">R$/m²</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {amostras.map((a, i) => {
                  const d = a.dados_mercado; const imv = d?.imoveis;
                  return (
                    <TableRow key={a.id}>
                      <TableCell><Checkbox aria-label={`Selecionar amostra ${i + 1}`} checked={a.selecionada} disabled={!canSel} onCheckedChange={(v) => toggle(a, 'selecionada', !!v)} /></TableCell>
                      <TableCell><Checkbox aria-label={`Habilitar no modelo amostra ${i + 1}`} checked={a.habilitada_modelo} disabled={!canSel} onCheckedChange={(v) => toggle(a, 'habilitada_modelo', !!v)} /></TableCell>
                      <TableCell><p className="font-medium">{i + 1}. {[imv?.endereco, imv?.numero, imv?.complemento].filter(Boolean).join(', ') || imv?.tipo_imovel}</p><p className="text-xs text-muted-foreground">{imv?.bairro ?? ''}{a.origem_territorial !== 'LOCAL' ? ' · fora do município' : ''}</p></TableCell>
                      <TableCell>{NATUREZA[d?.natureza_dado]}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(imv?.area_construida)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(d?.valor_utilizado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(d?.valor_unitario)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Conjuntos de dados</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground mb-3">Os modelos usam somente o conjunto congelado. Mudanças na seleção exigem nova versão; versões anteriores ficam no histórico.</p>
            {(q.data?.conjuntos ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum conjunto congelado.</p> : (
              <ul className="divide-y">{q.data!.conjuntos.map((c) => <li key={c.id} className="flex items-center justify-between py-2"><span>Versão {c.versao}{c.congelado_em ? ` · ${fmtDateTime(c.congelado_em)}` : ''}</span><Badge variant={c.status === 'CONGELADO' ? 'default' : 'outline'}>{CONJ[c.status]}</Badge></li>)}</ul>
            )}
            {vigente && <p className="mt-3 text-xs text-muted-foreground">Conjunto vigente: versão {vigente.versao}.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Municípios comparáveis</CardTitle>
            {canEdit && <Button size="sm" variant="outline" onClick={() => setMun({ nome: '', uf: av.uf, just: '' })}><Plus className="h-4 w-4 mr-1" />Sugerir</Button>}
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">Usar dados de outro município exige justificativa e decisão do responsável técnico.</p>
            {mun && (
              <div className="grid gap-2 rounded-md border p-3">
                <div className="grid grid-cols-[1fr_80px] gap-2"><Input placeholder="Município" value={mun.nome} onChange={(e) => setMun({ ...mun, nome: e.target.value })} maxLength={120} /><Input value={mun.uf} onChange={(e) => setMun({ ...mun, uf: e.target.value.toUpperCase().slice(0, 2) })} /></div>
                <Input placeholder="Justificativa (semelhança de mercado, escassez local…)" value={mun.just} onChange={(e) => setMun({ ...mun, just: e.target.value })} maxLength={500} />
                <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setMun(null)}>Cancelar</Button><Button size="sm" onClick={salvarMun}>Salvar</Button></div>
              </div>
            )}
            <ul className="divide-y">{(q.data?.municipios ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <div><p className="font-medium">{m.municipio_nome}/{m.uf}</p><p className="text-xs text-muted-foreground">{m.justificativa}</p></div>
                {m.status === 'SUGERIDO' && canSel ? (
                  <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => decidirMun(m, 'APROVADO')}>Aprovar</Button><Button size="sm" variant="ghost" onClick={() => decidirMun(m, 'REJEITADO')}>Rejeitar</Button></div>
                ) : <Badge variant="outline">{m.status === 'APROVADO' ? 'Aprovado' : m.status === 'REJEITADO' ? 'Rejeitado' : 'Sugerido'}</Badge>}
              </li>
            ))}</ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={add} onOpenChange={setAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo dado de mercado</DialogTitle>
            <DialogDescription>O imóvel observado entra no cadastro físico único. Se já existir, use o cadastro existente.</DialogDescription>
          </DialogHeader>
          <ImovelFields value={im} onChange={setIm} showAnuncio />
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="grid gap-1.5 sm:col-span-2"><Label>Natureza</Label>
              <Select value={dado.natureza} onValueChange={(v) => setDado({ ...dado, natureza: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NATUREZA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Valor ofertado (R$/mês)</Label><Input inputMode="decimal" value={dado.ofertado} onChange={(e) => setDado({ ...dado, ofertado: e.target.value })} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Valor utilizado (R$/mês)</Label><Input inputMode="decimal" value={dado.utilizado} onChange={(e) => setDado({ ...dado, utilizado: e.target.value })} placeholder="igual ao ofertado" /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Data da observação</Label><Input type="date" value={dado.data} onChange={(e) => setDado({ ...dado, data: e.target.value })} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Fonte</Label>
              <Select value={dado.fonteTipo} onValueChange={(v) => setDado({ ...dado, fonteTipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FONTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Nome da fonte</Label><Input value={dado.fonteNome} onChange={(e) => setDado({ ...dado, fonteNome: e.target.value })} maxLength={160} /></div>
            <div className="grid gap-1.5 sm:col-span-6"><Label>Origem territorial</Label>
              <Select value={dado.origem} onValueChange={(v) => setDado({ ...dado, origem: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="LOCAL">Mesmo município</SelectItem><SelectItem value="MUNICIPIO_COMPARAVEL">Município comparável</SelectItem>
                <SelectItem value="CONTRATO_PUBLICO_LOCAL">Contrato público local</SelectItem><SelectItem value="CONTRATO_PUBLICO_EXTERNO">Contrato público externo</SelectItem><SelectItem value="OUTRA_FONTE">Outra</SelectItem>
              </SelectContent></Select></div>
          </div>
          {creator.dups && <DuplicatePanel dups={creator.dups} onUse={(id) => salvar({ useExisting: id })} onForce={() => salvar({ forceNew: true })} />}
          <DialogFooter><Button variant="outline" onClick={() => setAdd(false)}>Cancelar</Button><Button onClick={() => salvar()}>Incluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={freeze} onOpenChange={setFreeze}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Congelar conjunto de dados?</AlertDialogTitle>
            <AlertDialogDescription>
              As {amostras.filter((a) => a.selecionada).length} amostras selecionadas e os valores atuais das variáveis serão fotografados. {vigente ? 'O conjunto vigente será substituído e os modelos atuais ficarão desatualizados (sem apagar nada).' : 'Os modelos passarão a usar esta versão.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); congelar(); }}>Congelar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
