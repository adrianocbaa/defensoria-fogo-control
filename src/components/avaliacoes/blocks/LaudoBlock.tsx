import { useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Eye, FileDown, FilePlus2, FileText, History, RotateCcw, ShieldCheck, Sparkles, Stamp, Wand2, XCircle } from 'lucide-react';
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
import { db, engine, rpc, sha256Hex } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime } from '@/lib/avaliacao/labels';
import { buildLaudoDocxBlob, buildLaudoPdf, foundationFrom, resolveTokens, snapAmostra, type LaudoData } from '@/lib/avaliacao/laudoPdf';

const AI_CONTEXT_LABEL: Record<string, string> = {
  REPORT_SECTION: 'Texto da seção', PROPERTY_DESCRIPTION: 'Descrição do imóvel', MARKET_DIAGNOSIS: 'Diagnóstico de mercado',
  VALIDATION_EXPLANATION: 'Explicação da validação', COMPATIBILITY: 'Compatibilidade', CONCLUSION: 'Conclusão',
};
const AI_STATUS: Record<string, string> = { PROPOSTO: 'Proposta', APROVADO: 'Aprovada', DESCARTADO: 'Descartada' };
const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function draftData(avaliacaoId: string, codigo: string, secoes: any[], anexos: any[]): Promise<LaudoData> {
  const tokens = await rpc<Record<string, string | null>>('aval_tokens', { p_avaliacao: avaliacaoId });
  const { data: ac } = await db.from('model_acceptances').select('*').eq('avaliacao_id', avaliacaoId).eq('status', 'VIGENTE').maybeSingle();
  const { data: res } = await db.from('avaliacao_resultado_economico').select('*, avaliacao_compatibilidades(*)').eq('avaliacao_id', avaliacaoId).eq('status', 'VIGENTE').maybeSingle();
  const none = Promise.resolve({ data: null });
  const [ex, vr, ce, mo, fs, fi] = await Promise.all([
    ac ? db.from('avaliacao_modelo_execucoes').select('output_json').eq('id', ac.execucao_id).maybeSingle() : none,
    ac ? db.from('model_validation_results').select('numero, nome, status, grau, detalhe').eq('validation_id', ac.validation_id).order('numero') : Promise.resolve({ data: [] }),
    res ? db.from('avaliacao_projecao_centros').select('*').eq('projecao_id', res.projecao_id) : Promise.resolve({ data: [] }),
    ac ? db.from('avaliacao_modelos').select('conjunto_id, amostras_excluidas').eq('id', ac.modelo_id).maybeSingle() : none,
    ac ? db.from('validation_foundation_summary').select('*').eq('validation_id', ac.validation_id).maybeSingle() : none,
    ac ? db.from('validation_foundation_items').select('*').eq('validation_id', ac.validation_id).order('item_number') : Promise.resolve({ data: [] }),
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
    validacao: (vr.data ?? []) as any[], fundamentacao: foundationFrom(fs.data ? { resumo: fs.data, itens: fi.data ?? [] } : null),
    centros: (ce.data ?? []) as any[], amostras,
    compatibilidades: ((res as any)?.avaliacao_compatibilidades ?? []), anexos: anexos.filter((a) => a.incluido),
  };
}

export function LaudoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [secaoId, setSecaoId] = useState<string | null>(null);
  const [aiCtx, setAiCtx] = useState('REPORT_SECTION');
  const [proposta, setProposta] = useState<Record<string, string>>({});
  const [verContexto, setVerContexto] = useState<any | null>(null);
  const [emitir, setEmitir] = useState(false);
  const [revisao, setRevisao] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useAvalQuery(av.id, 'laudo', async () => {
    const { data: laudo } = await db.from('laudos').select('*').eq('avaliacao_id', av.id).maybeSingle();
    if (!laudo) return null;
    const { data: versoes } = await db.from('laudo_versoes').select('*').eq('laudo_id', laudo.id).order('revisao', { ascending: false });
    const atual = (versoes ?? [])[0];
    const [sec, anx, pf, em, tk, files] = await Promise.all([
      db.from('laudo_secoes').select('*').eq('laudo_versao_id', atual.id).order('ordem'),
      db.from('laudo_anexos').select('*').eq('laudo_versao_id', atual.id).order('numero'),
      db.from('laudo_preflight_runs').select('*, laudo_preflight_results(*)').eq('laudo_versao_id', atual.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('laudo_emissoes').select('*').eq('avaliacao_id', av.id).order('emitido_em', { ascending: false }),
      db.from('document_tokens').select('codigo, descricao').order('codigo'),
      db.from('laudo_arquivos_emitidos').select('id, emissao_id, formato, storage_bucket, storage_path, display_filename, mime_type, file_size, sha256').eq('avaliacao_id', av.id),
    ]);
    return { laudo, versoes: (versoes ?? []) as any[], atual, secoes: (sec.data ?? []) as any[], anexos: (anx.data ?? []) as any[], preflight: pf.data as any,
      emissoes: (em.data ?? []) as any[], tokens: (tk.data ?? []) as any[], arquivos: (files.data ?? []) as any[] };
  });
  const d = q.data;
  useEffect(() => { if (d && !secaoId && d.secoes.length) setSecaoId(d.secoes[0].id); }, [d, secaoId]);
  const secao = d?.secoes.find((s) => s.id === secaoId) ?? null;
  const side = useAvalQuery(av.id, `laudo-side-${secaoId}`, async () => {
    const [ai, hist] = await Promise.all([
      db.from('avaliacao_ai_conteudos').select('*').eq('context_id', secaoId).order('created_at', { ascending: false }).limit(10),
      db.from('laudo_texto_versoes').select('id, conteudo, created_at').eq('secao_id', secaoId).order('created_at', { ascending: false }).limit(10),
    ]);
    return { ai: (ai.data ?? []) as any[], hist: (hist.data ?? []) as any[] };
  }, !!secaoId);

  const editavel = !!d && ['RASCUNHO', 'EM_REVISAO'].includes(d.atual.status) && av.status === 'ATIVA';
  const canEdit = ctx.can('report.edit') && editavel;
  const canApprove = ctx.can('report.approve') && editavel;
  const canIssueFiles = !!ctx.perms.data?.has('report.issue');

  const call = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); ctx.refresh(); return true; } catch (e) { toast.error(e instanceof Error && 'code' in e ? e.message : avalErrorMessage(e)); return false; } finally { setBusy(null); }
  };
  const gravarTexto = async (id: string, conteudo: string) => {
    const { error } = await db.from('laudo_secoes').update({ conteudo }).eq('id', id);
    if (error) throw error;
  };
  const salvarSecao = (s: any) => call(`s-${s.id}`, async () => {
    await gravarTexto(s.id, textos[s.id]);
    setTextos((t) => { const n = { ...t }; delete n[s.id]; return n; });
  }, 'Seção salva. Ela volta a rascunho e precisa ser aprovada.');
  const baixarRascunho = async (fmt: 'pdf' | 'docx') => {
    setBusy(fmt);
    try {
      const data = await draftData(av.id, `Avaliação ${av.codigo}`, d!.secoes, d!.anexos);
      const nome = `laudo-${av.codigo.replace('/', '-')}-rascunho`;
      if (fmt === 'pdf') buildLaudoPdf(data).save(`${nome}.pdf`);
      else saveBlob(await buildLaudoDocxBlob(data), `${nome}.docx`);
    } catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível gerar o rascunho.')); } finally { setBusy(null); }
  };
  const congelar = (emissaoId: string) => call(`files-${emissaoId}`, () => engine({ action: 'issue_files', emissao_id: emissaoId }), 'Arquivos oficiais PDF e DOCX gerados e congelados.');
  const emitirLaudo = async () => {
    setBusy('emit');
    try {
      const emissaoId = await rpc<string>('aval_laudo_issue', { p_laudo_versao: d!.atual.id });
      toast.success('Laudo emitido. Gerando os arquivos oficiais…');
      setEmitir(false);
      try { await engine({ action: 'issue_files', emissao_id: emissaoId }); toast.success('Arquivos oficiais PDF e DOCX congelados.'); }
      catch (e) { toast.error(`${(e as Error).message} Use “Gerar arquivos oficiais” na lista de emissões.`); }
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); ctx.refresh(); }
  };
  const baixarOficial = async (f: any) => {
    setBusy(`f-${f.id}`);
    try {
      const { data, error } = await db.storage.from(f.storage_bucket).download(f.storage_path);
      if (error || !data) throw error ?? new Error('download');
      const hash = await sha256Hex(await data.arrayBuffer());
      if (hash !== f.sha256) { toast.error('O arquivo baixado não confere com o código de integridade registrado. Não utilize este arquivo.'); return; }
      saveBlob(new Blob([data], { type: f.mime_type }), f.display_filename);
    } catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível baixar o arquivo oficial.')); } finally { setBusy(null); }
  };
  const gerarIA = (modo: 'GERAR' | 'MELHORAR') => secao && call(`ai-${modo}`, async () => {
    if (textos[secao.id] !== undefined) throw new Error('Salve a seção antes de usar a IA.');
    const r = await engine({ action: 'ai_generate', secao_id: secao.id, context_type: aiCtx, modo });
    if (r?.alertas?.length) toast.warning(r.alertas.join(' '));
  }, 'Proposta da IA pronta para sua revisão.');
  const decidirIA = (c: any, aprovar: boolean) => call(`aid-${c.id}`, async () => {
    const texto = proposta[c.id] ?? c.generated_text;
    await rpc('aval_ai_decide', { p_conteudo: c.id, p_aprovar: aprovar, p_texto: aprovar ? texto : null });
    if (aprovar) await gravarTexto(c.context_id, texto);
  }, aprovar ? 'Texto aprovado e aplicado à seção. A seção volta a rascunho até ser aprovada.' : 'Proposta descartada.');
  const restaurar = (h: any) => secao && call(`h-${h.id}`, () => gravarTexto(secao.id, h.conteudo), 'Versão anterior restaurada. A seção volta a rascunho.');

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
  const numeroDe = (id: string) => { const i = d.secoes.findIndex((x) => x.id === id); return d.secoes.slice(0, i + 1).filter((x) => x.numerada).length; };
  const dirty = secao ? textos[secao.id] !== undefined : false;
  const falhas = (d.preflight?.laudo_preflight_results ?? []).filter((r: any) => r.status !== 'OK');

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Laudo {av.codigo}{d.atual.revisao > 0 ? ` — Revisão ${String(d.atual.revisao).padStart(2, '0')}` : ''}</CardTitle>
            <p className="text-xs text-muted-foreground">{d.atual.status === 'EMITIDO' ? 'Emitido' : `Rascunho · ${aprovadas}/${d.secoes.length} seções aprovadas`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editavel && <Button size="sm" variant="outline" onClick={() => baixarRascunho('pdf')} disabled={busy === 'pdf'}><FileDown className="h-4 w-4 mr-1" />Rascunho PDF</Button>}
            {editavel && <Button size="sm" variant="outline" onClick={() => baixarRascunho('docx')} disabled={busy === 'docx'}><FileText className="h-4 w-4 mr-1" />Rascunho DOCX</Button>}
            {editavel && ctx.can('report.render_draft') && <Button size="sm" variant="outline" onClick={() => call('pf', () => rpc('aval_laudo_preflight', { p_laudo_versao: d.atual.id }))} disabled={busy === 'pf'}><ShieldCheck className="h-4 w-4 mr-1" />Verificar emissão</Button>}
            {editavel && ctx.can('report.issue') && <Button size="sm" onClick={() => setEmitir(true)} disabled={d.preflight?.resultado !== 'PASS'}><Stamp className="h-4 w-4 mr-1" />Emitir</Button>}
            {d.atual.status === 'EMITIDO' && ctx.perms.data?.has('report.create_revision') && <Button size="sm" variant="outline" onClick={() => setRevisao('')}>Criar revisão</Button>}
          </div>
        </CardHeader>
        {d.preflight && editavel && (
          <CardContent className="pt-0">
            <div className={`rounded-md border p-3 text-sm ${d.preflight.resultado === 'PASS' ? '' : 'border-destructive/40 bg-destructive/5'}`} role="status">
              <p className="flex items-center gap-1.5 font-medium mb-1">{d.preflight.resultado === 'PASS' ? <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> : <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />}
                Verificação de {fmtDateTime(d.preflight.created_at)}: {d.preflight.resultado === 'PASS' ? 'aprovada — pronto para emitir' : `${falhas.length} pendência(s)`}</p>
              <ul className="space-y-0.5">{falhas.map((r: any) => <li key={r.id} className="flex items-start gap-1.5"><XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" aria-hidden />{r.mensagem}</li>)}</ul>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <nav aria-label="Seções do laudo" className="rounded-lg border p-2 lg:sticky lg:top-4 lg:self-start">
          <ul className="space-y-0.5">{d.secoes.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setSecaoId(s.id)} aria-current={s.id === secaoId ? 'true' : undefined}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${s.id === secaoId ? 'bg-accent font-medium' : ''}`}>
                {s.stale ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-label="Revisar" /> : s.status === 'APROVADA' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-label="Aprovada" /> : <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-label="Rascunho" />}
                <span>{s.numerada ? `${numeroDe(s.id)}. ` : ''}{s.titulo}</span>
              </button>
            </li>
          ))}</ul>
        </nav>

        <div className="space-y-4 min-w-0">
          {secao && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
                <CardTitle className="text-sm">{secao.numerada ? `${numeroDe(secao.id)}. ` : ''}{secao.titulo}</CardTitle>
                <div className="flex items-center gap-2">
                  {secao.stale ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Revisar após alteração</Badge>
                    : secao.status === 'APROVADA' ? <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovada</Badge> : <Badge variant="outline">Rascunho</Badge>}
                  {canEdit && secao.stale && <Button size="sm" variant="outline" onClick={() => call(`r-${secao.id}`, () => rpc('aval_laudo_section_refresh', { p_secao: secao.id }))}>Marcar como revisada</Button>}
                  {canApprove && !secao.stale && !dirty && (secao.status === 'APROVADA'
                    ? <Button size="sm" variant="ghost" onClick={() => call(`a-${secao.id}`, () => rpc('aval_laudo_section_approve', { p_secao: secao.id, p_aprovar: false }))}>Reabrir</Button>
                    : <Button size="sm" variant="outline" onClick={() => call(`a-${secao.id}`, () => rpc('aval_laudo_section_approve', { p_secao: secao.id, p_aprovar: true }))}>Aprovar seção</Button>)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {canEdit ? (
                  <>
                    <Textarea aria-label={`Texto da seção ${secao.titulo}`} rows={Math.min(18, Math.max(8, Math.ceil((textos[secao.id] ?? secao.conteudo).length / 90)))} value={textos[secao.id] ?? secao.conteudo} onChange={(e) => setTextos({ ...textos, [secao.id]: e.target.value })} maxLength={20000} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Select value="" onValueChange={(tok) => setTextos({ ...textos, [secao.id]: `${textos[secao.id] ?? secao.conteudo}{{${tok}}}` })}>
                        <SelectTrigger className="w-64 h-8 text-xs" aria-label="Inserir dado protegido"><SelectValue placeholder="Inserir dado protegido…" /></SelectTrigger>
                        <SelectContent>{d.tokens.map((t: any) => <SelectItem key={t.codigo} value={t.codigo}>{t.descricao}</SelectItem>)}</SelectContent>
                      </Select>
                      {dirty && <Button size="sm" onClick={() => salvarSecao(secao)} disabled={busy === `s-${secao.id}`}>Salvar seção</Button>}
                    </div>
                  </>
                ) : <p className="text-sm whitespace-pre-wrap">{secao.conteudo || <span className="text-muted-foreground">Sem texto.</span>}</p>}
                {(secao.blocos_sistema ?? []).length > 0 && <p className="text-xs text-muted-foreground">Tabelas geradas pelo sistema nesta seção: {(secao.blocos_sistema as string[]).map((b) => b.replace('TABELA_', '').toLowerCase()).join(', ')}.</p>}
              </CardContent>
            </Card>
          )}

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
        </div>

        <aside className="space-y-4" aria-label="Assistente e fontes">
          <div className="rounded-lg border p-3 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium"><Bot className="h-4 w-4" aria-hidden />Assistente de redação</p>
            <p className="text-xs text-muted-foreground">A IA só propõe texto com os fatos registrados. Não calcula, não decide e não altera dados protegidos. Você revisa e aprova.</p>
            {canEdit && secao ? (
              <>
                <Select value={aiCtx} onValueChange={setAiCtx}><SelectTrigger className="h-8 text-xs" aria-label="Tipo de texto"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AI_CONTEXT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => gerarIA('GERAR')} disabled={!!busy}><Sparkles className="h-4 w-4 mr-1" />{busy === 'ai-GERAR' ? 'Gerando…' : 'Gerar com IA'}</Button>
                  <Button size="sm" variant="outline" onClick={() => gerarIA('MELHORAR')} disabled={!!busy || !secao.conteudo?.trim()}><Wand2 className="h-4 w-4 mr-1" />{busy === 'ai-MELHORAR' ? 'Melhorando…' : 'Melhorar texto'}</Button>
                </div>
              </>
            ) : <p className="text-xs text-muted-foreground">Disponível para quem edita o laudo em rascunho.</p>}
            <ul className="space-y-3 pt-1">{(side.data?.ai ?? []).map((c) => (
              <li key={c.id} className="rounded-md border p-2 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{AI_CONTEXT_LABEL[c.context_type] ?? c.context_type} · {c.modo === 'MELHORAR' ? 'melhoria' : 'geração'} · {fmtDateTime(c.created_at)}</span>
                  <Badge variant={c.status === 'APROVADO' ? 'secondary' : 'outline'}>{AI_STATUS[c.status]}</Badge></div>
                {(c.alertas ?? []).map((a: string) => <p key={a} className="flex items-start gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />{a}</p>)}
                {c.status === 'PROPOSTO' && canEdit ? (
                  <>
                    <Textarea aria-label="Texto proposto pela IA" rows={6} className="text-xs" value={proposta[c.id] ?? c.generated_text} onChange={(e) => setProposta({ ...proposta, [c.id]: e.target.value })} maxLength={20000} />
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => decidirIA(c, true)} disabled={busy === `aid-${c.id}`}><CheckCircle2 className="h-4 w-4 mr-1" />Aprovar texto</Button>
                      <Button size="sm" variant="ghost" onClick={() => decidirIA(c, false)} disabled={busy === `aid-${c.id}`}>Descartar</Button>
                    </div>
                  </>
                ) : <p className="text-xs whitespace-pre-wrap line-clamp-4">{c.approved_text ?? c.generated_text}</p>}
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setVerContexto(c)}><Eye className="h-3.5 w-3.5 mr-1" />Ver contexto utilizado</Button>
              </li>
            ))}</ul>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium"><History className="h-4 w-4" aria-hidden />Versões anteriores</p>
            {(side.data?.hist ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Sem versões anteriores desta seção.</p> : (
              <ul className="space-y-2">{side.data!.hist.map((h) => (
                <li key={h.id} className="text-xs space-y-1">
                  <p className="text-muted-foreground">{fmtDateTime(h.created_at)}</p>
                  <p className="line-clamp-2">{h.conteudo || '(vazio)'}</p>
                  {canEdit && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => restaurar(h)} disabled={busy === `h-${h.id}`}><RotateCcw className="h-3.5 w-3.5 mr-1" />Restaurar</Button>}
                </li>
              ))}</ul>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-medium">Fontes do texto</p>
            <p className="text-xs text-muted-foreground">Valores, graus e conclusão entram por marcadores protegidos e são preenchidos pelo sistema a partir do modelo aceito, da fundamentação estruturada e do resultado confirmado.</p>
          </div>
        </aside>
      </div>

      {d.emissoes.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Emissões oficiais</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <ul className="divide-y">{d.emissoes.map((em) => {
              const files = d.arquivos.filter((f) => f.emissao_id === em.id).sort((a, b) => a.formato.localeCompare(b.formato));
              return (
                <li key={em.id} className="flex items-center justify-between gap-3 py-2 flex-wrap">
                  <div><p className="font-medium">{em.codigo}</p><p className="text-xs text-muted-foreground">{fmtDateTime(em.emitido_em)} · código de integridade {String(em.hash).slice(0, 16)}…</p></div>
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => <Button key={f.id} size="sm" variant="outline" onClick={() => baixarOficial(f)} disabled={busy === `f-${f.id}`} title={`SHA-256 ${f.sha256}`}><FileDown className="h-4 w-4 mr-1" />{f.formato}</Button>)}
                    {files.length < 2 && (canIssueFiles
                      ? <Button size="sm" onClick={() => congelar(em.id)} disabled={busy === `files-${em.id}`}>{busy === `files-${em.id}` ? 'Gerando…' : 'Gerar arquivos oficiais'}</Button>
                      : <span className="text-xs text-muted-foreground">Arquivos oficiais pendentes</span>)}
                  </div>
                </li>
              );
            })}</ul>
            <p className="pt-2 text-xs text-muted-foreground">Os arquivos oficiais são gerados uma única vez na emissão e baixados exatamente como foram congelados (conferência por SHA-256).</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!verContexto} onOpenChange={(o) => !o && setVerContexto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Contexto utilizado pela IA</DialogTitle>
            <DialogDescription>Modelo {verContexto?.model} · instruções {verContexto?.prompt_version} · contexto {String(verContexto?.context_hash ?? '').slice(0, 16)}…</DialogDescription></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{verContexto ? JSON.stringify(verContexto.context_json, null, 2) : ''}</pre>
          {verContexto?.base_text && <><p className="text-sm font-medium">Texto-base</p><pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{verContexto.base_text}</pre></>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={emitir} onOpenChange={setEmitir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir o laudo {av.codigo}{d.atual.revisao > 0 ? ` — Revisão ${String(d.atual.revisao).padStart(2, '0')}` : ''}?</AlertDialogTitle>
            <AlertDialogDescription>A emissão é definitiva: o laudo emitido e seus arquivos PDF e DOCX oficiais não poderão ser alterados. Correções futuras serão feitas por revisão, mantendo este documento no histórico oficial.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); emitirLaudo(); }} disabled={busy === 'emit'}>{busy === 'emit' ? 'Emitindo…' : 'Emitir laudo'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={revisao !== null} onOpenChange={(o) => !o && setRevisao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar revisão</DialogTitle><DialogDescription>O laudo emitido e seus arquivos permanecem intactos. A revisão reabre a avaliação para correções e terá o mesmo número com "Revisão {String((d.atual.revisao ?? 0) + 1).padStart(2, '0')}".</DialogDescription></DialogHeader>
          <Label htmlFor="rev-mot">Motivo da revisão</Label>
          <Textarea id="rev-mot" rows={3} value={revisao ?? ''} onChange={(e) => setRevisao(e.target.value)} maxLength={1000} />
          <DialogFooter><Button variant="outline" onClick={() => setRevisao(null)}>Cancelar</Button>
            <Button onClick={() => call('rev', () => rpc('aval_laudo_create_revision', { p_laudo: d.laudo.id, p_motivo: revisao }), 'Revisão criada.').then((r) => r && setRevisao(null))}>Criar revisão</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
