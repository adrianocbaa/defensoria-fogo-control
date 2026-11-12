import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Flag, HelpCircle, History, LineChart as LineChartIcon, MinusCircle, PlayCircle, RefreshCw, Undo2, XCircle } from 'lucide-react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { CRITERIO_STATUS_LABEL, OVERALL_LABEL, fmtDateTime, fmtNum } from '@/lib/avaliacao/labels';
import { ANALISE_VISUAL_LABEL, MSG_CONFIG_ALTERADA, MSG_MODELO_DESATUALIZADO, RETIRADA, detalheAnaliseVisual, eventosDoModelo, relacoesAlteradas, rotuloEventoModelo, situacaoValidacao, type EventoAuditoria } from '@/lib/avaliacao/cicloModelo';
import { relationshipCurves, type TransformCode } from '@/lib/avaliacao/engine';
import { RelacionamentoDialog, type VarInfo } from '../RelacionamentoDialog';

// Situação sempre com ícone + texto (nunca só cor).
const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  ATENDE: { icon: CheckCircle2, cls: 'text-primary' },
  NAO_ATENDE: { icon: XCircle, cls: 'text-destructive' },
  REQUER_ANALISE: { icon: AlertTriangle, cls: 'text-foreground' },
  NAO_APLICAVEL: { icon: MinusCircle, cls: 'text-muted-foreground' },
  NAO_VERIFICADO: { icon: CircleDashed, cls: 'text-muted-foreground' },
};
function StatusTag({ status }: { status: string }) {
  const s = STATUS_ICON[status] ?? { icon: HelpCircle, cls: 'text-muted-foreground' };
  return <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${s.cls}`}><s.icon className="h-4 w-4 shrink-0" aria-hidden />{CRITERIO_STATUS_LABEL[status] ?? status}</span>;
}
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${fmtNum(v * 100, 1)}%`);
const RELACAO_LABEL: Record<string, string> = { POSITIVA: 'Positiva', NEGATIVA: 'Negativa', INDEFINIDA: 'Indefinida' };
function detalheEvento(e: EventoAuditoria): string {
  const d = e.details_json ?? {};
  switch (e.event_type) {
    case 'CHANGE_APPLIED': return `${RELACAO_LABEL[d.anterior] ?? d.anterior ?? '—'} → ${RELACAO_LABEL[d.novo] ?? d.novo ?? '—'}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'VALIDATION_MARKED_STALE': return `${d.motivo ? `${d.motivo}. ` : ''}Coeficientes preservados.`;
    case 'MODEL_WITHDRAWN_FROM_VALIDATION': return `Em validação → Calculado${d.motivo ? ` — ${d.motivo}` : ''}${d.aceite_revogado ? ' · aceite revogado' : ''}`;
    case 'MODEL_RESENT_TO_VALIDATION': case 'MODEL_SENT_TO_VALIDATION': return d.status_anterior ? 'Calculado → Em validação' : '';
    case 'RELATIONSHIP_VISUAL_ANALYSIS': return detalheAnaliseVisual(d);
    case 'MODEL_REVALIDATED': case 'VALIDATION_EXECUTED': return d.status ? `${OVERALL_LABEL[d.status] ?? d.status}${d.politica ? ` · política ${d.politica}` : ''}` : '';
    default: return '';
  }
}

export function ValidacaoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [modeloId, setModeloId] = useState<string>('');
  const [review, setReview] = useState<{ codigo: string; nome: string; decisao: string; just: string } | null>(null);
  const [grade, setGrade] = useState<{ codigo: string; titulo: string; grau: string; just: string } | null>(null);
  const [aceite, setAceite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useAvalQuery(av.id, 'validacao', async () => {
    const [mods, ac] = await Promise.all([
      db.from('avaliacao_modelos').select('id, numero, nome, status, stale, stale_motivo, dependente_variavel_id').eq('avaliacao_id', av.id).in('status', ['EM_VALIDACAO']).order('numero', { ascending: false }),
      db.from('model_acceptances').select('*, avaliacao_modelos(nome)').eq('avaliacao_id', av.id).order('accepted_at', { ascending: false }).limit(20),
    ]);
    return { modelos: (mods.data ?? []) as any[], aceites: (ac.data ?? []) as any[] };
  });
  useEffect(() => {
    if (!q.data) return;
    if (modeloId && !q.data.modelos.some((m) => m.id === modeloId)) { setModeloId(''); return; }
    if (!modeloId && q.data.modelos.length) setModeloId(q.data.modelos.find((m) => !m.stale)?.id ?? q.data.modelos[0].id);
  }, [q.data, modeloId]);
  const tecnicos = useAvalQuery(av.id, 'tecnicos', () => rpc<{ user_id: string; display_name: string }[]>('aval_list_tecnicos', {}));
  const nomeUsuario = (uid: string | null) => (tecnicos.data ?? []).find((t) => t.user_id === uid)?.display_name ?? (uid ? 'Usuário' : 'Sistema');
  const val = useAvalQuery(av.id, `validacao-${modeloId}`, async () => {
    const depId = q.data?.modelos.find((m) => m.id === modeloId)?.dependente_variavel_id ?? null;
    const [{ data: vs }, { data: mvs }, { data: exec }, { data: depVar }] = await Promise.all([
      db.from('model_validations').select('*').eq('modelo_id', modeloId).order('created_at', { ascending: false }).limit(200),
      db.from('avaliacao_modelo_variaveis').select('variavel_id').eq('modelo_id', modeloId).limit(1000),
      db.from('avaliacao_modelo_execucoes').select('id, engine_version, coefs:output_json->fit->coefficients, rin:input_snapshot_json->regression_input')
        .eq('modelo_id', modeloId).eq('status', 'SUCESSO').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      depId ? db.from('avaliacao_variaveis').select('codigo, nome, unidade').eq('id', depId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const historico = (vs ?? []) as any[];
    const v = historico[0] ?? null;
    const varIds: string[] = (mvs ?? []).map((x: any) => x.variavel_id);
    const [vq, eq] = await Promise.all([
      varIds.length ? db.from('avaliacao_variaveis').select('id, codigo, nome, relacao_esperada, unidade, tipo_variavel').in('id', varIds) : Promise.resolve({ data: [] }),
      db.from('audit_events').select('id, event_type, entity_type, entity_id, details_json, created_at, actor_id').eq('avaliacao_id', av.id)
        .in('entity_id', [modeloId, av.id, ...varIds]).order('created_at', { ascending: true }).limit(5000),
    ]);
    const variaveis = (vq.data ?? []) as { id: string; codigo: string; nome: string; relacao_esperada: string; unidade: string | null; tipo_variavel: string }[];
    const eventos = eventosDoModelo((eq.data ?? []) as EventoAuditoria[], modeloId, varIds);
    const extra = { historico, variaveis, eventos, exec: exec as any, depVar: depVar as { codigo: string; nome: string; unidade: string | null } | null };
    if (!v) return { v: null, results: [], reviews: [], grades: [], fsum: null, fitems: [], residuos: [], ...extra };
    const [r, rv, gr, fs, fi, res] = await Promise.all([
      db.from('model_validation_results').select('*').eq('validation_id', v.id).order('numero'),
      db.from('validation_manual_reviews').select('*').eq('modelo_id', modeloId).order('created_at', { ascending: false }),
      db.from('validation_foundation_manual_grades').select('*').eq('modelo_id', modeloId).order('created_at', { ascending: false }),
      db.from('validation_foundation_summary').select('*').eq('validation_id', v.id).maybeSingle(),
      db.from('validation_foundation_items').select('*').eq('validation_id', v.id).order('item_number'),
      db.from('modelo_residuos').select('amostra_id, ordem, estimado_original, residuo_dp, residuo_relativo, leverage, cook').eq('execucao_id', v.execucao_id).order('ordem').limit(10000),
    ]);
    return { v: v as any, results: (r.data ?? []) as any[], reviews: (rv.data ?? []) as any[], grades: (gr.data ?? []) as any[], fsum: fs.data as any, fitems: (fi.data ?? []) as any[], residuos: (res.data ?? []) as any[], ...extra };
  }, !!modeloId);

  const modelo = q.data?.modelos.find((m) => m.id === modeloId);
  const vigente = q.data?.aceites.find((a) => a.status === 'VIGENTE');
  const v = val.data?.v;
  const results = val.data?.results ?? [];
  const after = (rows: any[]) => !!v && rows.some((r) => r.created_at > v.created_at);
  const reviewsAfter = after(val.data?.reviews ?? []) || after(val.data?.grades ?? []);
  const byCode = useMemo(() => Object.fromEntries(results.map((r) => [r.codigo, r])), [results]);
  const homo = byCode.HOMOCEDASTICIDADE;
  const cook = byCode.PONTOS_INFLUENTES;
  const nDados = byCode.NUMERO_DADOS;
  const impedimentos: string[] = v?.resumo_json?.impedimentos_grau_iii ?? [];
  const alteradas = useMemo(() => relacoesAlteradas(byCode.RELACIONAMENTO?.dados?.itens, val.data?.variaveis ?? []), [byCode, val.data?.variaveis]);
  const situacao = situacaoValidacao({ modeloStale: !!modelo?.stale, validacao: v, alteradas });
  const desatualizada = situacao === 'CONFIG_ALTERADA';
  const canReview = ctx.can('validation.manual_review') && !!v && !desatualizada && situacao !== 'MODELO_DESATUALIZADO';
  const canRun = ctx.can('validation.run');
  const aceiteDoModelo = vigente && vigente.modelo_id === modeloId ? vigente : null;
  const [retirar, setRetirar] = useState<string | null>(null);
  const [relOpen, setRelOpen] = useState(false);
  const rel = byCode.RELACIONAMENTO;
  const relCurves = useMemo(() => {
    const ex = val.data?.exec; const rin = ex?.rin;
    if (!ex || !rin?.independents || !Array.isArray(ex.coefs)) return null;
    const meta = Object.fromEntries((val.data?.variaveis ?? []).map((x) => [x.codigo, { relacao_esperada: x.relacao_esperada, tipo: x.tipo_variavel }]));
    try {
      return relationshipCurves({ coefficients: ex.coefs, dependent: { transform: rin.dependent.transform as TransformCode, power: rin.dependent.power },
        independents: rin.independents.map((i: any) => ({ code: i.code, transform: i.transform as TransformCode, power: i.power, values: (i.values ?? []).map(Number) })) }, meta);
    } catch { return []; }
  }, [val.data?.exec, val.data?.variaveis]);
  const relNomes = useMemo(() => Object.fromEntries((val.data?.variaveis ?? []).map((x) => [x.codigo, { nome: x.nome, unidade: x.unidade }])) as Record<string, VarInfo>, [val.data?.variaveis]);
  const relDep: VarInfo = { nome: val.data?.depVar?.nome ?? 'Valor', unidade: val.data?.depVar?.unidade ?? null };
  const ultimaAnalise = useMemo(() => {
    const e = [...(val.data?.eventos ?? [])].reverse().find((x) => x.event_type === 'RELATIONSHIP_VISUAL_ANALYSIS' && v && x.details_json?.validacao === v.id);
    return e ? { conclusao: e.details_json.conclusao, observacao: e.details_json.observacao ?? null, created_at: e.created_at, autor: nomeUsuario(e.actor_id) } : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val.data?.eventos, v?.id, tecnicos.data]);
  const relObrigatoria = !!rel && rel.modo !== 'AUTOMATICO';
  const podeAnalisar = ctx.can('validation.manual_review') && !!v && situacao === 'ATUAL';
  const motivoAnalise = !v ? 'Execute a validação para registrar a análise.' : situacao !== 'ATUAL' ? 'Revalide o modelo com as configurações atuais para registrar a análise.'
    : !ctx.can('validation.manual_review') ? 'Seu papel nesta avaliação não permite registrar análises.' : null;
  const registrarAnalise = async (conclusao: 'COERENTE' | 'REVISAR', observacao: string) => {
    try {
      const r = await rpc<{ incorpora_validacao: boolean }>('aval_relationship_visual_review', { p_validation: v.id, p_conclusao: conclusao, p_observacao: observacao || null });
      toast.success(`${ANALISE_VISUAL_LABEL[conclusao]} registrada no histórico.${r?.incorpora_validacao ? ' Execute a validação novamente para incorporá-la.' : ''}`);
      ctx.refresh(); return true;
    } catch (e) { toast.error(avalErrorMessage(e)); return false; }
  };

  const rodar = async () => {
    setBusy(true);
    try {
      const r: any = await engine({ action: 'run_validation', modelo_id: modeloId });
      toast.success(`${v ? 'Nova validação registrada' : 'Validação concluída'}: ${OVERALL_LABEL[r.overall] ?? r.overall}.${v ? ' A anterior continua no histórico.' : ''}`);
    }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); ctx.refresh(); }
  };
  const salvarReview = async () => {
    if (!review) return;
    try { await rpc('aval_manual_review', { p_modelo: modeloId, p_codigo: review.codigo, p_decisao: review.decisao, p_justificativa: review.just }); toast.success('Análise registrada. Execute a validação novamente para incorporá-la.'); setReview(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const salvarGrau = async () => {
    if (!grade) return;
    if (grade.just.trim().length < 10) { toast.error('Escreva uma justificativa mais completa.'); return; }
    const { error } = await db.from('validation_foundation_manual_grades').insert({ modelo_id: modeloId, avaliacao_id: av.id, codigo: grade.codigo, grau: grade.grau, justificativa: grade.just });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Grau registrado. Execute a validação novamente para incorporá-lo.'); setGrade(null); ctx.refresh();
  };
  const confirmarRetirada = async () => {
    if (retirar === null) return;
    if (aceiteDoModelo && retirar.trim().length < RETIRADA.minMotivoAceito) { toast.error('Escreva o motivo da retirada (o modelo está aceito).'); return; }
    setBusy(true);
    try {
      await rpc('aval_model_withdraw_validation', { p_modelo: modeloId, p_motivo: retirar.trim() || null });
      toast.success(`${modelo?.nome ?? 'Modelo'} retirado da validação. Ele voltou para a Modelagem como calculado; o histórico foi preservado.`);
      setRetirar(null); setModeloId('');
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); ctx.refresh(); }
  };
  const aceitar = async () => {
    try { await rpc('aval_accept_model', { p_validation: v.id, p_justificativa: aceite }); toast.success('Modelo aceito.'); setAceite(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };

  const fsum = val.data?.fsum;
  return (
    <div className="space-y-5">
      {vigente && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />Modelo aceito vigente: <strong>{vigente.avaliacao_modelos?.nome}</strong> em {fmtDateTime(vigente.accepted_at)}.</div>
      )}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Validação do modelo</CardTitle>
          <div className="flex items-center gap-2">
            {(q.data?.modelos ?? []).length > 0 && (
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger className="w-56" aria-label="Modelo em validação"><SelectValue placeholder="Modelo" /></SelectTrigger>
                <SelectContent>{q.data!.modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}{m.stale ? ' (desatualizado)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {canRun && modelo && situacao !== 'MODELO_DESATUALIZADO' && (desatualizada
              ? <Button size="sm" onClick={rodar} disabled={busy}><RefreshCw className="h-4 w-4 mr-1" />{busy ? 'Validando…' : 'Revalidar com as configurações atuais'}</Button>
              : <Button size="sm" onClick={rodar} disabled={busy}><PlayCircle className="h-4 w-4 mr-1" />{busy ? 'Validando…' : v ? 'Validar novamente' : 'Executar validação'}</Button>)}
            {canRun && modelo && <Button size="sm" variant="outline" onClick={() => setRetirar('')} disabled={busy}><Undo2 className="h-4 w-4 mr-1" />Retirar da validação</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(q.data?.modelos ?? []).length === 0 && <p className="text-sm text-muted-foreground">Envie um modelo calculado para validação no bloco Modelagem.</p>}
          {modelo && situacao === 'MODELO_DESATUALIZADO' && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Modelo desatualizado</AlertTitle>
              <AlertDescription>{MSG_MODELO_DESATUALIZADO}{modelo.stale_motivo ? ` Motivo: ${modelo.stale_motivo}.` : ''}</AlertDescription></Alert>
          )}
          {modelo && desatualizada && (
            <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Validação desatualizada</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{MSG_CONFIG_ALTERADA}</p>
                {alteradas.length > 0 && <ul className="list-disc pl-5">{alteradas.map((a) => <li key={a.codigo}>{a.nome}: relação esperada {RELACAO_LABEL[a.antes] ?? a.antes} → {RELACAO_LABEL[a.agora] ?? a.agora}</li>)}</ul>}
                {aceiteDoModelo === null && q.data?.aceites.some((a) => a.modelo_id === modeloId && a.status === 'INVALIDADO') && <p>O aceite anterior deste modelo foi invalidado e continua no histórico; aceite novamente após revalidar.</p>}
                {canRun && <Button size="sm" onClick={rodar} disabled={busy}><RefreshCw className="h-4 w-4 mr-1" />{busy ? 'Validando…' : 'Revalidar com as configurações atuais'}</Button>}
              </AlertDescription></Alert>
          )}
          {modelo && !v && <p className="text-sm text-muted-foreground">Ainda não validado.</p>}
          {v && (
            <>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 text-sm">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="text-lg font-semibold">{OVERALL_LABEL[v.overall_status]}</p>
                  <p className="text-xs text-muted-foreground">Política {v.resumo_json?.politica?.codigo} v{v.resumo_json?.politica?.versao}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Fundamentação</p>
                  <p className="text-lg font-semibold">{fsum ? (fsum.grade_calculated ? `Grau ${fsum.grade_calculated}` : (fsum.pendencias?.length ? 'Pendente' : 'Não enquadrado')) : (v.fundamentacao_grau ? `Grau ${v.fundamentacao_grau}` : 'Não enquadrado')}</p>
                  {fsum && <p className="text-xs text-muted-foreground">{fsum.total_points} pontos{fsum.pendencias?.length ? ` · ${fsum.pendencias.length} item(ns) sem grau` : ''}</p>}</div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Precisão (preliminar)</p><p className="text-lg font-semibold">{v.precisao_grau ? `Grau ${v.precisao_grau}` : 'Não enquadrado'}</p>
                  <p className="text-xs text-muted-foreground">Amplitude {v.amplitude_pct != null ? `${fmtNum(v.amplitude_pct, 2)}%` : '—'}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Dados</p><p className="text-lg font-semibold">{nDados?.valor ?? '—'} amostras</p>
                  <p className="text-xs text-muted-foreground truncate" title={nDados?.detalhe}>{nDados?.grau ? `Quantidade: grau ${nDados.grau}` : nDados ? CRITERIO_STATUS_LABEL[nDados.status] : ''}</p></div>
              </div>
              {desatualizada && <p className="text-xs text-muted-foreground">Abaixo, a última validação registrada (anterior à alteração), mantida para consulta.</p>}
              {!desatualizada && reviewsAfter && <p className="flex items-center gap-1.5 text-sm text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden />Há análises ou graus registrados depois desta validação — execute a validação novamente.</p>}

              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border">
                  <p className="px-4 pt-3 pb-1 text-sm font-medium">Critérios</p>
                  <ul className="divide-y" aria-label="Critérios de validação">
                    {results.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5">
                        <span className="w-6 tabular-nums text-xs text-muted-foreground pt-0.5">{r.numero}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{r.nome}{r.grau ? <span className="ml-2 text-xs font-normal text-muted-foreground">grau {r.grau}</span> : null}</p>
                          <p className="text-xs text-muted-foreground">{r.modo === 'MANUAL' ? 'Análise manual' : r.modo === 'ASSISTIDO' ? 'Assistido' : r.modo === 'DERIVADO' ? 'Derivado' : 'Automático'}{r.origem === 'PROCEDIMENTO_INTERNO' ? ' · procedimento interno' : ''}{r.bloqueante ? ' · bloqueante' : ''}{r.revisado ? ' · revisado' : ''}</p>
                          <p className="text-xs mt-0.5">{r.detalhe}</p>
                          {r.codigo === 'RELACIONAMENTO' && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setRelOpen(true)}><LineChartIcon className="h-4 w-4 mr-1" />Ver gráficos de relacionamento</Button>
                              {ultimaAnalise ? (
                                <span className={`inline-flex items-center gap-1 text-xs ${ultimaAnalise.conclusao === 'REVISAR' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {ultimaAnalise.conclusao === 'REVISAR' ? <Flag className="h-3.5 w-3.5" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                                  Análise visual: {ANALISE_VISUAL_LABEL[ultimaAnalise.conclusao] ?? ultimaAnalise.conclusao} · {ultimaAnalise.autor} · {fmtDateTime(ultimaAnalise.created_at)}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">{relObrigatoria ? 'Análise visual pendente (exigida pela política).' : 'Análise visual ainda não registrada (opcional).'}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2"><StatusTag status={r.status} />
                          {canReview && ['REQUER_ANALISE', 'NAO_VERIFICADO'].includes(r.status) &&
                            <Button size="sm" variant="outline" onClick={() => setReview({ codigo: r.codigo, nome: r.nome, decisao: 'ATENDE', just: '' })}>Analisar</Button>}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                <aside className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-2">O que impede Grau III?</p>
                    {impedimentos.length === 0 ? <p className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />Nenhum impedimento identificado.</p> : (
                      <ul className="space-y-1.5 text-sm">{impedimentos.map((t) => <li key={t} className="flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />{t}</li>)}</ul>
                    )}
                  </div>
                  {fsum && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">Fundamentação por itens</p>
                      <p className="text-xs text-muted-foreground mb-2">{fsum.policy_reference}</p>
                      <ul className="space-y-2">{(val.data?.fitems ?? []).map((i) => (
                        <li key={i.id} className="text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span>{i.item_number}. {i.titulo}{i.mandatory_for_grade ? <span className="text-xs text-muted-foreground"> · obrigatório</span> : null}</span>
                            <span className="whitespace-nowrap font-medium">{i.grade_achieved ? `${i.grade_achieved} · ${i.points} pt` : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2"><StatusTag status={i.status} />
                            {canReview && ['REQUER_ANALISE', 'NAO_VERIFICADO'].includes(i.status) &&
                              <Button size="sm" variant="ghost" onClick={() => setGrade({ codigo: i.codigo, titulo: i.titulo, grau: 'II', just: '' })}>Atribuir grau</Button>}</div>
                        </li>
                      ))}</ul>
                    </div>
                  )}
                </aside>
              </div>

              {(val.data?.residuos ?? []).length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium">Homocedasticidade — Resíduo/DP × valor estimado</p>
                      {homo && <StatusTag status={homo.status} />}
                    </div>
                    <div className="h-56" role="img" aria-label="Gráfico de dispersão dos resíduos padronizados em relação aos valores estimados">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" dataKey="estimado_original" name="Estimado" tick={{ fontSize: 11 }} tickFormatter={(x) => fmtNum(x, 0)} />
                          <YAxis type="number" dataKey="residuo_dp" name="Resíduo/DP" tick={{ fontSize: 11 }} width={36} />
                          <ReferenceLine y={0} className="stroke-muted-foreground" />
                          <ReferenceLine y={2} strokeDasharray="4 4" className="stroke-muted-foreground" />
                          <ReferenceLine y={-2} strokeDasharray="4 4" className="stroke-muted-foreground" />
                          <Tooltip formatter={(x: number) => fmtNum(x, 3)} />
                          <Scatter data={val.data!.residuos} className="fill-primary" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Análise visual do profissional: a dispersão deve ser aleatória, sem padrão de funil. Registre a conclusão em “Analisar”.</p>
                    {canReview && homo && ['REQUER_ANALISE', 'NAO_VERIFICADO'].includes(homo.status) && <Button size="sm" variant="outline" className="mt-2" onClick={() => setReview({ codigo: homo.codigo, nome: homo.nome, decisao: 'ATENDE', just: '' })}>Analisar homocedasticidade</Button>}
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2 mb-1"><p className="text-sm font-medium">Pontos influentes (Cook)</p>{cook && <StatusTag status={cook.status} />}</div>
                    <p className="text-xs text-muted-foreground mb-2">{cook?.dados?.regra ? `Limite operacional ${fmtNum(cook.dados.limite, 4)} — procedimento interno, não normativo. Nenhuma amostra é excluída automaticamente.` : 'Sem limite operacional configurado.'}</p>
                    <div className="max-h-52 overflow-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Amostra</TableHead><TableHead className="text-right">Cook</TableHead><TableHead className="text-right">Leverage</TableHead><TableHead className="text-right">Resíduo/DP</TableHead><TableHead className="text-right">Resíduo rel.</TableHead></TableRow></TableHeader>
                        <TableBody>{[...val.data!.residuos].sort((a, b) => b.cook - a.cook).slice(0, 12).map((r) => {
                          const acima = cook?.dados?.limite != null && r.cook > cook.dados.limite;
                          return (
                            <TableRow key={r.amostra_id} className={acima ? 'bg-muted/50' : ''}>
                              <TableCell className="tabular-nums">{r.ordem}{acima && <Badge variant="outline" className="ml-2">Acima do limite</Badge>}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtNum(r.cook, 4)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtNum(r.leverage, 4)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtNum(r.residuo_dp, 3)}</TableCell>
                              <TableCell className="text-right tabular-nums">{pct(r.residuo_relativo)}</TableCell>
                            </TableRow>
                          );
                        })}</TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {ctx.can('validation.accept') && situacao === 'ATUAL' && !reviewsAfter && !aceiteDoModelo && ['APTO', 'APTO_COM_RESSALVAS'].includes(v.overall_status) && (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {ultimaAnalise?.conclusao === 'REVISAR' && <p className="flex items-center gap-1.5 text-sm"><Flag className="h-4 w-4 text-destructive" aria-hidden />O relacionamento das variáveis foi marcado para revisão.</p>}
                  <Button onClick={() => setAceite('')}><CheckCircle2 className="h-4 w-4 mr-1" />Aceitar este modelo</Button></div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {modelo && val.data && (val.data.historico.length > 0 || val.data.eventos.length > 0) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" aria-hidden />Histórico de {modelo.nome}</CardTitle></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">Validações realizadas</p>
              {val.data.historico.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma validação ainda.</p> : (
                <ol className="space-y-2" aria-label="Validações realizadas">
                  {[...val.data.historico].reverse().map((h, i, arr) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">Validação {i + 1}</span>
                      <span className="text-muted-foreground">{fmtDateTime(h.created_at)}</span>
                      <span>· {OVERALL_LABEL[h.overall_status] ?? h.overall_status}</span>
                      {h.resumo_json?.politica && <span className="text-xs text-muted-foreground">política {h.resumo_json.politica.codigo} v{h.resumo_json.politica.versao}</span>}
                      {h.stale ? <Badge variant="outline">Desatualizada</Badge> : i === arr.length - 1 ? <Badge variant="secondary">Atual</Badge> : null}
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Todas usam os mesmos coeficientes calculados; nenhuma validação é substituída ou apagada.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Eventos</p>
              <ol className="relative border-l pl-5 space-y-3" aria-label="Eventos do modelo">
                {val.data.eventos.map((e) => (
                  <li key={e.id}>
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" aria-hidden />
                    <p className="text-sm font-medium">{rotuloEventoModelo(e)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)} · {nomeUsuario(e.actor_id)}</p>
                    {detalheEvento(e) && <p className="text-sm">{detalheEvento(e)}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={retirar !== null} onOpenChange={(o) => !o && setRetirar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{RETIRADA.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{RETIRADA.texto}</AlertDialogDescription>
          </AlertDialogHeader>
          {aceiteDoModelo && <p className="flex items-start gap-1.5 text-sm"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />{RETIRADA.aceito}</p>}
          <div className="grid gap-2">
            <Label htmlFor="ret-motivo">Motivo {aceiteDoModelo ? '(obrigatório)' : '(opcional)'}</Label>
            <Textarea id="ret-motivo" rows={3} maxLength={2000} value={retirar ?? ''} onChange={(e) => setRetirar(e.target.value)} placeholder="Ex.: ajustar a relação esperada das variáveis" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button onClick={confirmarRetirada} disabled={busy}><Undo2 className="h-4 w-4 mr-1" />{busy ? 'Retirando…' : 'Retirar da validação'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Análise manual — {review?.nome}</DialogTitle><DialogDescription>Registre a sua conclusão técnica e o motivo. Ela entra na próxima validação.</DialogDescription></DialogHeader>
          {review && (
            <div className="grid gap-3">
              <Select value={review.decisao} onValueChange={(d) => setReview({ ...review, decisao: d })}><SelectTrigger aria-label="Conclusão"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ATENDE">Atende</SelectItem><SelectItem value="NAO_ATENDE">Não atende</SelectItem><SelectItem value="INCONCLUSIVO">Inconclusivo</SelectItem></SelectContent></Select>
              <Label htmlFor="rev-just">Justificativa</Label>
              <Textarea id="rev-just" rows={4} value={review.just} onChange={(e) => setReview({ ...review, just: e.target.value })} maxLength={2000} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Cancelar</Button><Button onClick={salvarReview}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!grade} onOpenChange={(o) => !o && setGrade(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grau do item — {grade?.titulo}</DialogTitle><DialogDescription>Este item não tem regra automática formalizada. Atribua o grau com base na sua análise técnica; ele entra na próxima validação.</DialogDescription></DialogHeader>
          {grade && (
            <div className="grid gap-3">
              <Select value={grade.grau} onValueChange={(g) => setGrade({ ...grade, grau: g })}><SelectTrigger aria-label="Grau"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="III">Grau III</SelectItem><SelectItem value="II">Grau II</SelectItem><SelectItem value="I">Grau I</SelectItem><SelectItem value="NAO_ENQUADRA">Não se enquadra</SelectItem></SelectContent></Select>
              <Label htmlFor="grade-just">Justificativa</Label>
              <Textarea id="grade-just" rows={4} value={grade.just} onChange={(e) => setGrade({ ...grade, just: e.target.value })} maxLength={2000} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setGrade(null)}>Cancelar</Button><Button onClick={salvarGrau}>Registrar grau</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aceite !== null} onOpenChange={(o) => !o && setAceite(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aceitar {modelo?.nome}</DialogTitle><DialogDescription>O aceite é uma decisão técnica sua. Um aceite anterior será substituído e o resultado econômico precisará ser confirmado novamente.</DialogDescription></DialogHeader>
          <Label htmlFor="ac-just">Justificativa {v?.overall_status === 'APTO_COM_RESSALVAS' ? '(obrigatória — há ressalvas)' : '(opcional)'}</Label>
          <Textarea id="ac-just" rows={4} value={aceite ?? ''} onChange={(e) => setAceite(e.target.value)} maxLength={2000} />
          <DialogFooter><Button variant="outline" onClick={() => setAceite(null)}>Cancelar</Button><Button onClick={aceitar}>Aceitar modelo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
