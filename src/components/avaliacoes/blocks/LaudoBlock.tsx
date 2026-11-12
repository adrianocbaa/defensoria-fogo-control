import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, FilePlus2, ShieldCheck, Stamp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime } from '@/lib/avaliacao/labels';
import { buildLaudoPdf, resolveTokens, type LaudoData } from '@/lib/avaliacao/laudoPdf';

async function draftData(avaliacaoId: string, codigo: string, secoes: any[], anexos: any[]): Promise<LaudoData> {
  const tokens = await rpc<Record<string, string | null>>('aval_tokens', { p_avaliacao: avaliacaoId });
  const { data: ac } = await db.from('model_acceptances').select('*').eq('avaliacao_id', avaliacaoId).eq('status', 'VIGENTE').maybeSingle();
  const { data: res } = await db.from('avaliacao_resultado_economico').select('*, avaliacao_compatibilidades(*)').eq('avaliacao_id', avaliacaoId).eq('status', 'VIGENTE').maybeSingle();
  const [ex, vr, ce, mo] = await Promise.all([
    ac ? db.from('avaliacao_modelo_execucoes').select('output_json').eq('id', ac.execucao_id).maybeSingle() : Promise.resolve({ data: null }),
    ac ? db.from('model_validation_results').select('numero, nome, status, grau, detalhe').eq('validation_id', ac.validation_id).order('numero') : Promise.resolve({ data: [] }),
    res ? db.from('avaliacao_projecao_centros').select('*').eq('projecao_id', res.projecao_id) : Promise.resolve({ data: [] }),
    ac ? db.from('avaliacao_modelos').select('conjunto_id, amostras_excluidas').eq('id', ac.modelo_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  let amostras: LaudoData['amostras'] = [];
  if (mo.data) {
    const { data: sn } = await db.from('avaliacao_amostra_snapshots').select('amostra_id, dados').eq('conjunto_id', mo.data.conjunto_id).order('amostra_id').limit(10000);
    const excl = new Set(mo.data.amostras_excluidas ?? []);
    amostras = ((sn ?? []) as any[]).filter((s) => !excl.has(s.amostra_id) && s.dados?.habilitada_modelo !== false).map(snapAmostra);
  }
  return {
    codigo, rascunho: true, tokens,
    secoes: secoes.map((s) => ({ codigo: s.codigo, titulo: s.titulo, numerada: s.numerada, texto: resolveTokens(s.conteudo ?? '', tokens), blocos_sistema: s.blocos_sistema ?? [] })),
    coeficientes: ((ex.data as any)?.output_json?.fit?.coefficients ?? []),
    validacao: (vr.data ?? []) as any[], centros: (ce.data ?? []) as any[], amostras,
    compatibilidades: ((res as any)?.avaliacao_compatibilidades ?? []), anexos: anexos.filter((a) => a.incluido),
  };
}
function snapAmostra(s: any) {
  const im = s.dados?.imovel ?? {}; const d = s.dados?.dado ?? {};
  return { endereco: [im.endereco, im.numero, im.complemento].filter(Boolean).join(', ') || im.tipo_imovel || 'Amostra', area: im.area_construida ?? null, valor: d.valor_utilizado ?? null, unitario: d.valor_unitario ?? null };
}
function issuedData(snap: any): LaudoData {
  return {
    codigo: snap.codigo, rascunho: false, tokens: snap.tokens ?? {},
    secoes: (snap.secoes ?? []).map((s: any) => ({ codigo: s.codigo, titulo: s.titulo, numerada: s.numerada, texto: s.texto ?? '', blocos_sistema: s.blocos_sistema ?? [] })),
    coeficientes: snap.execucao?.output?.fit?.coefficients ?? [],
    validacao: snap.validacao_snapshot?.resultados ?? [], centros: snap.resultado_snapshot?.centros ?? [],
    amostras: (snap.amostras ?? []).filter((a: any) => a.dados?.habilitada_modelo !== false && !(snap.modelo?.amostras_excluidas ?? []).includes(a.amostra_id)).map((a: any) => snapAmostra({ dados: a.dados })),
    compatibilidades: snap.resultado_snapshot?.compatibilidades ?? [], anexos: (snap.anexos ?? []).map((a: any) => ({ numero: a.numero, titulo: a.titulo })),
  };
}

export function LaudoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [emitir, setEmitir] = useState(false);
  const [revisao, setRevisao] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useAvalQuery(av.id, 'laudo', async () => {
    const { data: laudo } = await db.from('laudos').select('*').eq('avaliacao_id', av.id).maybeSingle();
    if (!laudo) return null;
    const { data: versoes } = await db.from('laudo_versoes').select('*').eq('laudo_id', laudo.id).order('revisao', { ascending: false });
    const atual = (versoes ?? [])[0];
    const [sec, anx, pf, em, tk] = await Promise.all([
      db.from('laudo_secoes').select('*').eq('laudo_versao_id', atual.id).order('ordem'),
      db.from('laudo_anexos').select('*').eq('laudo_versao_id', atual.id).order('numero'),
      db.from('laudo_preflight_runs').select('*, laudo_preflight_results(*)').eq('laudo_versao_id', atual.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('laudo_emissoes').select('*').eq('avaliacao_id', av.id).order('emitido_em', { ascending: false }),
      db.from('document_tokens').select('codigo, descricao').order('codigo'),
    ]);
    return { laudo, versoes: (versoes ?? []) as any[], atual, secoes: (sec.data ?? []) as any[], anexos: (anx.data ?? []) as any[], preflight: pf.data as any, emissoes: (em.data ?? []) as any[], tokens: (tk.data ?? []) as any[] };
  });
  const d = q.data;
  const editavel = !!d && ['RASCUNHO', 'EM_REVISAO'].includes(d.atual.status) && av.status === 'ATIVA';
  const canEdit = ctx.can('report.edit') && editavel;
  const canApprove = ctx.can('report.approve') && editavel;

  const call = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); ctx.refresh(); return true; } catch (e) { toast.error(avalErrorMessage(e)); return false; } finally { setBusy(null); }
  };
  const salvarSecao = (s: any) => call(`s-${s.id}`, async () => {
    const { error } = await db.from('laudo_secoes').update({ conteudo: textos[s.id] }).eq('id', s.id);
    if (error) throw error;
    setTextos((t) => { const n = { ...t }; delete n[s.id]; return n; });
  }, 'Seção salva. Ela volta a rascunho e precisa ser aprovada.');
  const baixarRascunho = async () => {
    setBusy('pdf');
    try { buildLaudoPdf(await draftData(av.id, `Avaliação ${av.codigo}`, d!.secoes, d!.anexos)).save(`laudo-${av.codigo.replace('/', '-')}-rascunho.pdf`); }
    catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível gerar o rascunho.')); } finally { setBusy(null); }
  };
  const baixarEmitido = async (em: any) => {
    setBusy(`em-${em.id}`);
    try {
      const { data, error } = await db.from('laudo_emissao_snapshots').select('dados, hash').eq('emissao_id', em.id).single();
      if (error) throw error;
      buildLaudoPdf(issuedData(data.dados)).save(`laudo-${em.codigo.replace(/[^\w]+/g, '-')}.pdf`);
    } catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível gerar o PDF.')); } finally { setBusy(null); }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!d) {
    return (
      <Card><CardContent className="p-6 space-y-3 text-sm">
        <p className="text-muted-foreground">O laudo é estruturado: textos editáveis com marcadores protegidos para valores críticos, e tabelas sempre geradas pelo sistema.</p>
        {ctx.can('report.edit') && <Button onClick={() => call('init', () => rpc('aval_laudo_init', { p_avaliacao: av.id }), 'Laudo iniciado.')} disabled={busy === 'init'}><FilePlus2 className="h-4 w-4 mr-1" />Iniciar laudo</Button>}
      </CardContent></Card>
    );
  }
  const aprovadas = d.secoes.filter((s) => s.status === 'APROVADA' && !s.stale).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Laudo {av.codigo}{d.atual.revisao > 0 ? ` — Revisão ${String(d.atual.revisao).padStart(2, '0')}` : ''}</CardTitle>
            <p className="text-xs text-muted-foreground">{d.atual.status === 'EMITIDO' ? 'Emitido' : `Rascunho · ${aprovadas}/${d.secoes.length} seções aprovadas`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editavel && <Button size="sm" variant="outline" onClick={baixarRascunho} disabled={busy === 'pdf'}><FileDown className="h-4 w-4 mr-1" />Rascunho PDF</Button>}
            {editavel && ctx.can('report.render_draft') && <Button size="sm" variant="outline" onClick={() => call('pf', () => rpc('aval_laudo_preflight', { p_laudo_versao: d.atual.id }))} disabled={busy === 'pf'}><ShieldCheck className="h-4 w-4 mr-1" />Verificar emissão</Button>}
            {editavel && ctx.can('report.issue') && <Button size="sm" onClick={() => setEmitir(true)} disabled={d.preflight?.resultado !== 'PASS'}><Stamp className="h-4 w-4 mr-1" />Emitir</Button>}
            {d.atual.status === 'EMITIDO' && ctx.perms.data?.has('report.create_revision') && <Button size="sm" variant="outline" onClick={() => setRevisao('')}>Criar revisão</Button>}
          </div>
        </CardHeader>
        {d.preflight && editavel && (
          <CardContent className="pt-0">
            <div className={`rounded-md border p-3 text-sm ${d.preflight.resultado === 'PASS' ? '' : 'border-destructive/40 bg-destructive/5'}`}>
              <p className="font-medium mb-1">Verificação de {fmtDateTime(d.preflight.created_at)}: {d.preflight.resultado === 'PASS' ? 'aprovada — pronto para emitir' : 'há pendências'}</p>
              <ul className="space-y-0.5">{(d.preflight.laudo_preflight_results ?? []).filter((r: any) => r.status !== 'OK').map((r: any) => <li key={r.id} className="flex items-start gap-1.5"><XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />{r.mensagem}</li>)}</ul>
            </div>
          </CardContent>
        )}
      </Card>

      {d.secoes.map((s, i) => {
        const dirty = textos[s.id] !== undefined;
        const numero = d.secoes.slice(0, i + 1).filter((x) => x.numerada).length;
        return (
          <Card key={s.id}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
              <CardTitle className="text-sm">{s.numerada ? `${numero}. ` : ''}{s.titulo}</CardTitle>
              <div className="flex items-center gap-2">
                {s.stale ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Revisar após alteração</Badge>
                  : s.status === 'APROVADA' ? <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovada</Badge> : <Badge variant="outline">Rascunho</Badge>}
                {canEdit && s.stale && <Button size="sm" variant="outline" onClick={() => call(`r-${s.id}`, () => rpc('aval_laudo_section_refresh', { p_secao: s.id }))}>Marcar como revisada</Button>}
                {canApprove && !s.stale && !dirty && (s.status === 'APROVADA'
                  ? <Button size="sm" variant="ghost" onClick={() => call(`a-${s.id}`, () => rpc('aval_laudo_section_approve', { p_secao: s.id, p_aprovar: false }))}>Reabrir</Button>
                  : <Button size="sm" variant="outline" onClick={() => call(`a-${s.id}`, () => rpc('aval_laudo_section_approve', { p_secao: s.id, p_aprovar: true }))}>Aprovar</Button>)}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit ? (
                <>
                  <Textarea aria-label={`Texto da seção ${s.titulo}`} rows={Math.min(10, Math.max(3, Math.ceil((textos[s.id] ?? s.conteudo).length / 110)))} value={textos[s.id] ?? s.conteudo} onChange={(e) => setTextos({ ...textos, [s.id]: e.target.value })} maxLength={20000} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Select value="" onValueChange={(tok) => setTextos({ ...textos, [s.id]: `${textos[s.id] ?? s.conteudo}{{${tok}}}` })}>
                      <SelectTrigger className="w-64 h-8 text-xs"><SelectValue placeholder="Inserir dado protegido…" /></SelectTrigger>
                      <SelectContent>{d.tokens.map((t: any) => <SelectItem key={t.codigo} value={t.codigo}>{t.descricao}</SelectItem>)}</SelectContent>
                    </Select>
                    {dirty && <Button size="sm" onClick={() => salvarSecao(s)} disabled={busy === `s-${s.id}`}>Salvar seção</Button>}
                  </div>
                </>
              ) : <p className="text-sm whitespace-pre-wrap">{s.conteudo || <span className="text-muted-foreground">Sem texto.</span>}</p>}
              {(s.blocos_sistema ?? []).length > 0 && <p className="text-xs text-muted-foreground">Tabelas geradas pelo sistema nesta seção: {(s.blocos_sistema as string[]).map((b) => b.replace('TABELA_', '').toLowerCase()).join(', ')}.</p>}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Anexos</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {d.anexos.map((a) => (
            <div key={a.id} className="flex items-center justify-between"><span>Anexo {a.numero} — {a.titulo}</span>
              {a.opcional ? <div className="flex items-center gap-2"><Label htmlFor={`ax-${a.id}`} className="text-xs">Incluir</Label><Switch id={`ax-${a.id}`} checked={a.incluido} disabled={!canEdit}
                onCheckedChange={(v) => call(`ax-${a.id}`, async () => { const { error } = await db.from('laudo_anexos').update({ incluido: v }).eq('id', a.id); if (error) throw error; })} /></div>
                : <Badge variant="outline">Obrigatório</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      {d.emissoes.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Emissões oficiais</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <ul className="divide-y">{d.emissoes.map((em) => (
              <li key={em.id} className="flex items-center justify-between gap-3 py-2">
                <div><p className="font-medium">{em.codigo}</p><p className="text-xs text-muted-foreground">{fmtDateTime(em.emitido_em)} · código de integridade {String(em.hash).slice(0, 16)}…</p></div>
                <Button size="sm" variant="outline" onClick={() => baixarEmitido(em)} disabled={busy === `em-${em.id}`}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
              </li>
            ))}</ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={emitir} onOpenChange={setEmitir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir o laudo {av.codigo}{d.atual.revisao > 0 ? ` — Revisão ${String(d.atual.revisao).padStart(2, '0')}` : ''}?</AlertDialogTitle>
            <AlertDialogDescription>A emissão é definitiva: o laudo emitido não poderá ser alterado. Correções futuras serão feitas por revisão, mantendo este documento no histórico oficial.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); call('emit', () => rpc('aval_laudo_issue', { p_laudo_versao: d.atual.id }), 'Laudo emitido.').then((r) => r && setEmitir(false)); }}>Emitir laudo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={revisao !== null} onOpenChange={(o) => !o && setRevisao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar revisão</DialogTitle><DialogDescription>O laudo emitido permanece intacto. A revisão reabre a avaliação para correções e terá o mesmo número com "Revisão {String((d.atual.revisao ?? 0) + 1).padStart(2, '0')}".</DialogDescription></DialogHeader>
          <Label htmlFor="rev-mot">Motivo da revisão</Label>
          <Textarea id="rev-mot" rows={3} value={revisao ?? ''} onChange={(e) => setRevisao(e.target.value)} maxLength={1000} />
          <DialogFooter><Button variant="outline" onClick={() => setRevisao(null)}>Cancelar</Button>
            <Button onClick={() => call('rev', () => rpc('aval_laudo_create_revision', { p_laudo: d.laudo.id, p_motivo: revisao }), 'Revisão criada.').then((r) => r && setRevisao(null))}>Criar revisão</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
