import { Fragment, useMemo, useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, Compass, Hand, Plus, Send, Sparkles, Star, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { TRANSFORM_LABEL, TRANSFORMS, fmtNum } from '@/lib/avaliacao/labels';
import { buildCandidates, estimateCandidates, evaluateCandidateLimit, type CandidateMode, type ModelingSettings, type TransformCode } from '@/lib/avaliacao/engine';

const ORIGENS: Record<string, string> = {
  valor_utilizado: 'Valor utilizado (R$/mês)', valor_unitario: 'Valor unitário (R$/m²)', area_construida: 'Área construída (m²)', area_terreno: 'Área do terreno (m²)',
};
const STATUS_MOD: Record<string, string> = { RASCUNHO: 'A calcular', CALCULADO: 'Calculado', ERRO: 'Erro no cálculo', EM_VALIDACAO: 'Em validação' };
const ORIGEM_MOD: Record<string, string> = { MANUAL: 'Manual', GERADO_ASSISTIDO: 'Assistido', GERADO_AMPLA: 'Exploração ampla', SIMULACAO_VARIAVEL: 'Simulação', SIMULACAO_AMOSTRA: 'Simulação' };
const DEFAULT_SETTINGS: ModelingSettings = { assisted_candidate_soft_limit: 30, exploration_candidate_soft_limit: 200, hard_limit: 2000, require_confirmation_over: 100 };
const categoricoPossivel = (tipo: string) => tipo === 'PROXY' || tipo === 'CODIGO_ALOCADO';
const parse = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

export function ModelagemBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [novaVar, setNovaVar] = useState<{ nome: string; codigo: string; papel: string; tipo: string; rel: string; unidade: string; origem: string; trans: string[]; categorica?: boolean } | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [novoModelo, setNovoModelo] = useState<{ dep: string; depT: string; vars: Record<string, string> } | null>(null);
  const [gerar, setGerar] = useState<{ modo: CandidateMode; dep: string; depTs: string[]; obrig: Record<string, boolean> } | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useAvalQuery(av.id, 'modelagem', async () => {
    const [vars, vals, am, cj, mods, link, st] = await Promise.all([
      db.from('avaliacao_variaveis').select('*').eq('avaliacao_id', av.id).eq('ativo', true).order('created_at'),
      db.from('avaliacao_variavel_valores').select('*').eq('avaliacao_id', av.id).limit(10000),
      db.from('avaliacao_amostras').select('id, selecionada, habilitada_modelo, dados_mercado(valor_utilizado, valor_unitario, imoveis(area_construida, area_terreno, endereco, numero))').eq('avaliacao_id', av.id).eq('selecionada', true).order('created_at').limit(10000),
      db.from('avaliacao_conjuntos_dados').select('id, versao').eq('avaliacao_id', av.id).eq('status', 'CONGELADO').maybeSingle(),
      db.from('avaliacao_modelos').select('*, avaliacao_modelo_variaveis(variavel_id, transformacao, ordem), modelo_resultado_resumo(*)').eq('avaliacao_id', av.id).order('numero', { ascending: false }),
      db.from('avaliacao_imoveis').select('imoveis(area_construida, area_terreno)').eq('avaliacao_id', av.id).eq('papel', 'AVALIANDO').maybeSingle(),
      db.from('avaliacao_modeling_settings').select('organization_id, assisted_candidate_soft_limit, exploration_candidate_soft_limit, hard_limit, require_confirmation_over'),
    ]);
    const conjunto = cj.data as any;
    // Valores congelados do conjunto (os mesmos que o servidor usa para validar o domínio das transformações).
    const snaps = conjunto ? (await db.from('avaliacao_amostra_snapshots').select('dados').eq('conjunto_id', conjunto.id).limit(10000)).data ?? [] : [];
    const settingsRows = (st.data ?? []) as any[];
    const settings: ModelingSettings = settingsRows.find((r) => r.organization_id) ?? settingsRows.find((r) => !r.organization_id) ?? DEFAULT_SETTINGS;
    return { vars: (vars.data ?? []) as any[], vals: (vals.data ?? []) as any[], amostras: (am.data ?? []) as any[], conjunto, modelos: (mods.data ?? []) as any[],
      avaliando: (link.data as any)?.imoveis ?? null, snaps: (snaps as any[]).filter((x) => x.dados?.habilitada_modelo !== false), settings };
  });
  const vars = q.data?.vars ?? [];
  const amostras = q.data?.amostras ?? [];
  const valMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const v of q.data?.vals ?? []) m.set(`${v.variavel_id}:${v.scope_type === 'AVALIANDO' ? 'AV' : v.amostra_id}`, v);
    return m;
  }, [q.data?.vals]);
  const canModel = ctx.can('model.create');
  const canRun = ctx.can('model.run');
  const canVal = ctx.can('validation.run');
  const dep = vars.find((v) => v.papel === 'DEPENDENTE');
  const indeps = vars.filter((v) => v.papel !== 'DEPENDENTE');

  const cellKey = (vid: string, aid: string | 'AV') => `${vid}:${aid}`;
  const cellValue = (vid: string, aid: string | 'AV') => edits[cellKey(vid, aid)] ?? (valMap.get(cellKey(vid, aid))?.valor?.toString().replace('.', ',') ?? '');
  const filled = (v: any) => amostras.filter((a) => { const s = cellValue(v.id, a.id); return s !== '' && !Number.isNaN(parse(s)); }).length;

  const salvarVar = async () => {
    if (!novaVar) return;
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(novaVar.codigo)) { toast.error('Código: letras minúsculas, números e _ (começando por letra).'); return; }
    if (novaVar.trans.length === 0) { toast.error('Autorize ao menos uma transformação.'); return; }
    const { error } = await db.from('avaliacao_variaveis').insert({
      avaliacao_id: av.id, nome: novaVar.nome.trim() || novaVar.codigo, codigo: novaVar.codigo, papel: novaVar.papel, tipo_variavel: novaVar.tipo,
      relacao_esperada: novaVar.rel, unidade: novaVar.unidade.trim() || null, transformacoes_autorizadas: novaVar.trans,
      origem_tipo: novaVar.origem ? 'CAMPO_DADO_MERCADO' : 'MANUAL', campo_origem: novaVar.origem || null,
      categorica: categoricoPossivel(novaVar.tipo) ? novaVar.categorica !== false : null,
    });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    setNovaVar(null); ctx.refresh();
  };
  const preencher = (v: any) => {
    const next = { ...edits };
    for (const a of amostras) {
      const d = a.dados_mercado; const im = d?.imoveis;
      const raw = v.campo_origem === 'valor_utilizado' ? d?.valor_utilizado : v.campo_origem === 'valor_unitario' ? d?.valor_unitario
        : v.campo_origem === 'area_construida' ? im?.area_construida : v.campo_origem === 'area_terreno' ? im?.area_terreno : null;
      if (raw !== null && raw !== undefined) next[cellKey(v.id, a.id)] = String(raw).replace('.', ',');
    }
    const avRaw = v.campo_origem === 'area_construida' ? q.data?.avaliando?.area_construida : v.campo_origem === 'area_terreno' ? q.data?.avaliando?.area_terreno : null;
    if (avRaw !== null && avRaw !== undefined && v.papel !== 'DEPENDENTE') next[cellKey(v.id, 'AV')] = String(avRaw).replace('.', ',');
    setEdits(next);
  };
  const salvarValores = async () => {
    setBusy('valores');
    try {
      for (const [k, s] of Object.entries(edits)) {
        const [vid, aid] = k.split(':');
        const n = parse(s);
        if (Number.isNaN(n)) throw new Error('valor inválido');
        const ex = valMap.get(k);
        if (ex) {
          const { error } = await db.from('avaliacao_variavel_valores').update({ valor: n }).eq('id', ex.id);
          if (error) throw error;
        } else if (n !== null) {
          const { error } = await db.from('avaliacao_variavel_valores').insert({ avaliacao_id: av.id, variavel_id: vid, scope_type: aid === 'AV' ? 'AVALIANDO' : 'AMOSTRA', amostra_id: aid === 'AV' ? null : aid, valor: n, origem: 'MANUAL' });
          if (error) throw error;
        }
      }
      toast.success('Valores salvos.' + (q.data?.conjunto ? ' Lembre-se: o modelo usa o conjunto congelado; congele nova versão para incluir mudanças de amostras.' : ''));
      setEdits({}); ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e, 'Verifique os valores digitados.')); } finally { setBusy(null); }
  };

  const criarModelo = async (spec: { dep: string; depT: string; vars: [string, string][]; origem?: string }) => {
    return rpc<string>('aval_model_create', {
      p_avaliacao: av.id, p_conjunto: q.data!.conjunto.id, p_nome: null, p_dep_var: spec.dep, p_dep_transf: spec.depT, p_dep_power: null,
      p_vars: spec.vars.map(([variavel_id, transformacao]) => ({ variavel_id, transformacao })), p_origem_tipo: spec.origem ?? 'MANUAL',
    });
  };
  const salvarModelo = async () => {
    if (!novoModelo) return;
    const sel = Object.entries(novoModelo.vars).filter(([, t]) => t && t !== 'NONE');
    if (sel.length === 0) { toast.error('Escolha ao menos uma variável independente.'); return; }
    try { await criarModelo({ dep: novoModelo.dep, depT: novoModelo.depT, vars: sel }); toast.success('Modelo criado. Calcule-o para ver os resultados.'); setNovoModelo(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const calcular = async (m: any) => {
    setBusy(m.id);
    try { await engine({ action: 'run_model', modelo_id: m.id }); toast.success(`Modelo ${m.numero} calculado.`); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); ctx.refresh(); }
  };
  const enviar = async (m: any) => {
    try { await rpc('aval_send_to_validation', { p_modelo: m.id }); toast.success('Modelo enviado à validação.'); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const favoritar = async (m: any) => {
    try { await rpc('aval_model_flag', { p_modelo: m.id, p_favorito: !m.favorito, p_candidato: null }); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const frozen = (code: string) => (q.data?.snaps ?? []).map((x: any) => Number(x.dados?.variaveis?.[code]));
  const avaliandoVal = (v: any) => { const raw = valMap.get(cellKey(v.id, 'AV'))?.valor; return raw === null || raw === undefined ? [] : [Number(raw)]; };
  const candSpec = () => {
    if (!gerar || !dep) return null;
    const depSpec = { transforms: dep.transformacoes_autorizadas as TransformCode[], selected: gerar.depTs as TransformCode[], values: frozen(dep.codigo) };
    const ind = indeps.map((v) => ({ id: v.id, code: v.codigo, transforms: v.transformacoes_autorizadas as TransformCode[], obrigatoria: !!gerar.obrig[v.id], values: [...frozen(v.codigo), ...avaliandoVal(v)] }));
    return { depSpec, ind };
  };
  const spec = candSpec();
  const estimativa = gerar && spec ? estimateCandidates(gerar.modo, spec.depSpec, spec.ind) : { total: 0, descartadasDominio: 0 };
  const settings = q.data?.settings ?? DEFAULT_SETTINGS;
  const limite = gerar ? evaluateCandidateLimit(estimativa.total, gerar.modo, settings) : null;
  const gerarCandidatos = async (confirmado: boolean) => {
    if (!gerar || !dep || !spec || !limite) return;
    if (!limite.ok) { toast.error(limite.reason === 'EMPTY' ? 'Nenhuma combinação válida com as transformações autorizadas.' : `São ${estimativa.total} candidatos; o limite da organização é ${limite.limit}. Torne variáveis obrigatórias ou reduza transformações.`); return; }
    if (limite.requiresConfirmation && !confirmado) { setConfirmar(estimativa.total); return; }
    setConfirmar(null);
    const lista = buildCandidates(gerar.modo, spec.depSpec, spec.ind).map((c) => ({ dep_transf: c.depT, vars: c.vars.map(([variavel_id, transformacao]) => ({ variavel_id, transformacao })) }));
    setBusy('gerar');
    let ok = 0, falhas = 0;
    try {
      const ids = await rpc<string[]>('aval_model_generate_batch', { p_avaliacao: av.id, p_conjunto: q.data!.conjunto.id, p_modo: gerar.modo, p_candidatos: lista, p_confirmado: confirmado });
      for (const id of ids) {
        try { await engine({ action: 'run_model', modelo_id: id }); ok++; } catch { falhas++; }
      }
      toast.success(`${ok} candidato(s) calculado(s)${falhas ? `; ${falhas} não puderam ser calculados (veja o motivo em cada modelo)` : ''}. Compare e escolha com critério técnico.`);
      setGerar(null);
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); ctx.refresh(); }
  };
  const abrirModo = (modo: 'MANUAL' | CandidateMode) => {
    if (!dep) return;
    if (modo === 'MANUAL') { setNovoModelo({ dep: dep.id, depT: dep.transformacoes_autorizadas.includes('LN') ? 'LN' : dep.transformacoes_autorizadas[0], vars: Object.fromEntries(indeps.map((v) => [v.id, v.transformacoes_autorizadas[0]])) }); return; }
    setGerar({ modo, dep: dep.id, depTs: modo === 'AMPLA' ? [...dep.transformacoes_autorizadas] : (dep.transformacoes_autorizadas as string[]).includes('LN') ? ['LN'] : [dep.transformacoes_autorizadas[0]], obrig: {} });
  };
  const podeCriar = canModel && !!q.data?.conjunto && !!dep && indeps.length > 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Variáveis</CardTitle>
          {canModel && <Button size="sm" variant="outline" onClick={() => setNovaVar({ nome: '', codigo: '', papel: dep ? 'INDEPENDENTE' : 'DEPENDENTE', tipo: 'QUANTITATIVA', rel: 'INDEFINIDA', unidade: '', origem: '', trans: dep ? ['DIRECT', 'LN', 'INVERSE'] : ['DIRECT', 'LN'] })}><Plus className="h-4 w-4 mr-1" />Variável</Button>}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {vars.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Defina a variável dependente (ex.: valor unitário) e as independentes (ex.: área).</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Variável</TableHead><TableHead>Papel</TableHead><TableHead>Relação esperada</TableHead><TableHead>Transformações</TableHead><TableHead className="text-right">Completude</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{vars.map((v) => (
                <TableRow key={v.id}>
                  <TableCell><p className="font-medium">{v.nome}</p><p className="text-xs text-muted-foreground">{v.codigo}{v.unidade ? ` · ${v.unidade}` : ''}</p></TableCell>
                  <TableCell>{v.papel === 'DEPENDENTE' ? <Badge>Dependente</Badge> : <Badge variant="outline">Independente</Badge>}</TableCell>
                  <TableCell>{v.relacao_esperada === 'POSITIVA' ? 'Positiva' : v.relacao_esperada === 'NEGATIVA' ? 'Negativa' : 'Indefinida'}</TableCell>
                  <TableCell className="text-xs">{(v.transformacoes_autorizadas as string[]).map((t) => TRANSFORM_LABEL[t]).join(', ')}</TableCell>
                  <TableCell className="text-right tabular-nums">{filled(v)}/{amostras.length}{v.papel !== 'DEPENDENTE' && (cellValue(v.id, 'AV') === '' ? ' · avaliando sem valor' : '')}</TableCell>
                  <TableCell className="text-right">{canModel && v.campo_origem && <Button size="sm" variant="ghost" onClick={() => preencher(v)}><Wand2 className="h-4 w-4 mr-1" />Preencher</Button>}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {vars.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Valores por amostra</CardTitle>
            {canModel && <Button size="sm" onClick={salvarValores} disabled={Object.keys(edits).length === 0 || busy === 'valores'}>Salvar valores</Button>}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Dado</TableHead>{vars.map((v) => <TableHead key={v.id} className="min-w-28">{v.codigo}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                <TableRow className="bg-muted/40">
                  <TableCell className="font-medium">Avaliando</TableCell>
                  {vars.map((v) => <TableCell key={v.id}>{v.papel === 'DEPENDENTE' ? <span className="text-xs text-muted-foreground">a estimar</span> :
                    <Input aria-label={`${v.codigo} do avaliando`} className="h-8" inputMode="decimal" disabled={!canModel} value={cellValue(v.id, 'AV')} onChange={(e) => setEdits({ ...edits, [cellKey(v.id, 'AV')]: e.target.value })} />}</TableCell>)}
                </TableRow>
                {amostras.map((a, i) => (
                  <TableRow key={a.id} className={a.habilitada_modelo ? '' : 'opacity-60'}>
                    <TableCell className="whitespace-nowrap">{i + 1}. {[a.dados_mercado?.imoveis?.endereco, a.dados_mercado?.imoveis?.numero].filter(Boolean).join(', ') || 'Amostra'}</TableCell>
                    {vars.map((v) => <TableCell key={v.id}><Input aria-label={`${v.codigo} da amostra ${i + 1}`} className="h-8" inputMode="decimal" disabled={!canModel} value={cellValue(v.id, a.id)} onChange={(e) => setEdits({ ...edits, [cellKey(v.id, a.id)]: e.target.value })} /></TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Modelos</CardTitle>
        </CardHeader>
        {podeCriar && (
          <CardContent className="pt-0 pb-4">
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Modo de modelagem">
              {([
                { modo: 'MANUAL', icon: Hand, titulo: 'Manual', texto: 'Você escolhe as variáveis e transformações de um modelo.' },
                { modo: 'ASSISTIDO', icon: Sparkles, titulo: 'Assistido', texto: 'Testa as transformações autorizadas, com variáveis obrigatórias.', destaque: true },
                { modo: 'AMPLA', icon: Compass, titulo: 'Exploração ampla', texto: 'Testa todas as combinações válidas do espaço autorizado.' },
              ] as const).map((m) => (
                <button key={m.modo} type="button" onClick={() => abrirModo(m.modo)}
                  className={`text-left rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${'destaque' in m ? 'border-primary bg-primary/5' : ''}`}>
                  <span className="flex items-center gap-2 font-medium text-sm"><m.icon className="h-4 w-4" aria-hidden />{m.titulo}{'destaque' in m && <Badge className="ml-auto">Recomendado</Badge>}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{m.texto}</span>
                </button>
              ))}
            </div>
          </CardContent>
        )}
        <CardContent className="p-0 overflow-x-auto">
          {!q.data?.conjunto ? <p className="p-6 text-sm text-muted-foreground">Preencha as variáveis e congele o conjunto de dados no bloco Mercado para criar modelos.</p> :
            (q.data.modelos.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum modelo. Conjunto vigente: versão {q.data.conjunto.versao}.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead /><TableHead>Modelo</TableHead><TableHead>Origem</TableHead><TableHead>Equação</TableHead><TableHead className="text-right">n</TableHead><TableHead className="text-right">R² aj.</TableHead><TableHead className="text-right">Pior sig.</TableHead><TableHead className="text-right">Amplitude IC</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{q.data.modelos.map((m) => {
                  const r = Array.isArray(m.modelo_resultado_resumo) ? m.modelo_resultado_resumo[0] : m.modelo_resultado_resumo;
                  const depV = vars.find((v) => v.id === m.dependente_variavel_id);
                  const eq = `${TRANSFORM_LABEL[m.dependente_transformacao].replace('x', depV?.codigo ?? 'y')} ~ ${(m.avaliacao_modelo_variaveis ?? []).sort((a: any, b: any) => a.ordem - b.ordem).map((mv: any) => TRANSFORM_LABEL[mv.transformacao].replace('x', vars.find((v) => v.id === mv.variavel_id)?.codigo ?? '?')).join(' + ')}`;
                  return (
                    <Fragment key={m.id}>
                      <TableRow className={m.stale ? 'opacity-60' : ''}>
                        <TableCell><Button size="icon" variant="ghost" aria-label="Detalhes" onClick={() => setAberto(aberto === m.id ? null : m.id)}>{aberto === m.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{m.favorito && <Star className="inline h-3.5 w-3.5 mr-1 fill-current" aria-label="Favorito" />}{m.nome}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{ORIGEM_MOD[m.origem_tipo] ?? m.origem_tipo}</TableCell>
                        <TableCell className="text-xs font-mono">{eq}</TableCell>
                        <TableCell className="text-right tabular-nums">{r?.n ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r ? fmtNum(r.r2_ajustado, 4) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r?.pior_sig_regressor != null ? `${fmtNum(r.pior_sig_regressor * 100, 2)}%` : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{r?.amplitude_pct != null ? `${fmtNum(r.amplitude_pct, 2)}%` : '—'}</TableCell>
                        <TableCell>{m.stale ? <Badge variant="destructive">Desatualizado</Badge> : <Badge variant="outline">{STATUS_MOD[m.status]}</Badge>}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {canRun && !m.stale && m.status === 'RASCUNHO' && <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => calcular(m)}><Calculator className="h-4 w-4 mr-1" />Calcular</Button>}
                          {canVal && !m.stale && m.status === 'CALCULADO' && <Button size="sm" variant="outline" onClick={() => enviar(m)}><Send className="h-4 w-4 mr-1" />Validar</Button>}
                          {canModel && m.status !== 'RASCUNHO' && <Button size="icon" variant="ghost" aria-label="Favorito" onClick={() => favoritar(m)}><Star className={`h-4 w-4 ${m.favorito ? 'fill-current' : ''}`} /></Button>}
                        </TableCell>
                      </TableRow>
                      {aberto === m.id && <TableRow><TableCell colSpan={10} className="bg-muted/30"><ModeloDetalhe modeloId={m.id} avaliacaoId={av.id} /></TableCell></TableRow>}
                    </Fragment>
                  );
                })}</TableBody>
              </Table>
            ))}
          <p className="px-6 py-3 text-xs text-muted-foreground">Não há escolha automática nem pontuação: compare significâncias, coerência das relações e precisão. R² sozinho não decide.</p>
        </CardContent>
      </Card>

      <Dialog open={!!novaVar} onOpenChange={(o) => !o && setNovaVar(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova variável</DialogTitle></DialogHeader>
          {novaVar && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Nome</Label><Input value={novaVar.nome} onChange={(e) => setNovaVar({ ...novaVar, nome: e.target.value })} maxLength={80} /></div>
              <div className="grid gap-1.5"><Label>Código</Label><Input value={novaVar.codigo} onChange={(e) => setNovaVar({ ...novaVar, codigo: e.target.value.toLowerCase() })} maxLength={40} placeholder="ex.: area" /></div>
              <div className="grid gap-1.5"><Label>Papel</Label><Select value={novaVar.papel} onValueChange={(p) => setNovaVar({ ...novaVar, papel: p })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DEPENDENTE" disabled={!!dep}>Dependente</SelectItem><SelectItem value="INDEPENDENTE">Independente</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Tipo</Label><Select value={novaVar.tipo} onValueChange={(p) => setNovaVar({ ...novaVar, tipo: p })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="QUANTITATIVA">Quantitativa</SelectItem><SelectItem value="DICOTOMICA">Dicotômica</SelectItem><SelectItem value="PROXY">Proxy</SelectItem><SelectItem value="CODIGO_ALOCADO">Código alocado</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Relação esperada</Label><Select value={novaVar.rel} onValueChange={(p) => setNovaVar({ ...novaVar, rel: p })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="POSITIVA">Positiva</SelectItem><SelectItem value="NEGATIVA">Negativa</SelectItem><SelectItem value="INDEFINIDA">Indefinida</SelectItem></SelectContent></Select></div>
              {categoricoPossivel(novaVar.tipo) && (
                <label className="flex items-start gap-2 text-sm sm:col-span-2"><Checkbox checked={novaVar.categorica !== false} onCheckedChange={(c) => setNovaVar({ ...novaVar, categorica: !!c })} />
                  <span>Representa categorias ou grupos discretos <span className="block text-xs text-muted-foreground">Quando marcado, entra na verificação de micronumerosidade.</span></span></label>
              )}
              <div className="grid gap-1.5"><Label>Unidade</Label><Input value={novaVar.unidade} onChange={(e) => setNovaVar({ ...novaVar, unidade: e.target.value })} maxLength={20} /></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label>Preencher a partir de</Label><Select value={novaVar.origem || 'MANUAL'} onValueChange={(p) => setNovaVar({ ...novaVar, origem: p === 'MANUAL' ? '' : p })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANUAL">Digitação manual</SelectItem>{Object.entries(ORIGENS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label>Transformações autorizadas</Label>
                <div className="flex flex-wrap gap-3">{TRANSFORMS.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm"><Checkbox checked={novaVar.trans.includes(t)} onCheckedChange={(c) => setNovaVar({ ...novaVar, trans: c ? [...novaVar.trans, t] : novaVar.trans.filter((x) => x !== t) })} />{TRANSFORM_LABEL[t]}</label>
                ))}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNovaVar(null)}>Cancelar</Button><Button onClick={salvarVar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!novoModelo} onOpenChange={(o) => !o && setNovoModelo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modelo manual</DialogTitle><DialogDescription>Escolha a transformação de cada variável (somente as autorizadas) ou deixe-a fora do modelo.</DialogDescription></DialogHeader>
          {novoModelo && dep && (
            <div className="grid gap-3">
              <div className="grid grid-cols-[1fr_140px] items-center gap-2"><span className="text-sm font-medium">{dep.nome} (dependente)</span>
                <Select value={novoModelo.depT} onValueChange={(t) => setNovoModelo({ ...novoModelo, depT: t })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(dep.transformacoes_autorizadas as string[]).map((t) => <SelectItem key={t} value={t}>{TRANSFORM_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
              {indeps.map((v) => (
                <div key={v.id} className="grid grid-cols-[1fr_140px] items-center gap-2"><span className="text-sm">{v.nome}</span>
                  <Select value={novoModelo.vars[v.id] ?? 'NONE'} onValueChange={(t) => setNovoModelo({ ...novoModelo, vars: { ...novoModelo.vars, [v.id]: t } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Fora do modelo</SelectItem>{(v.transformacoes_autorizadas as string[]).map((t) => <SelectItem key={t} value={t}>{TRANSFORM_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNovoModelo(null)}>Cancelar</Button><Button onClick={salvarModelo}>Criar modelo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!gerar} onOpenChange={(o) => !o && setGerar(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{gerar?.modo === 'AMPLA' ? 'Exploração ampla' : 'Gerar candidatos (modo assistido)'}</DialogTitle>
            <DialogDescription>{gerar?.modo === 'AMPLA'
              ? 'Testa todas as combinações matematicamente válidas das transformações autorizadas. Nenhum modelo é escolhido automaticamente.'
              : 'Testa apenas as transformações autorizadas. Variáveis obrigatórias entram em todos os candidatos.'}</DialogDescription>
          </DialogHeader>
          {gerar && dep && (
            <div className="grid gap-3 text-sm">
              {gerar.modo === 'ASSISTIDO' && <div><p className="font-medium mb-1">Transformações da dependente</p>
                <div className="flex flex-wrap gap-3">{(dep.transformacoes_autorizadas as string[]).map((t) => <label key={t} className="flex items-center gap-1.5"><Checkbox checked={gerar.depTs.includes(t)} onCheckedChange={(c) => setGerar({ ...gerar, depTs: c ? [...gerar.depTs, t] : gerar.depTs.filter((x) => x !== t) })} />{TRANSFORM_LABEL[t]}</label>)}</div></div>}
              {gerar.modo === 'ASSISTIDO' && <div><p className="font-medium mb-1">Variáveis obrigatórias</p>
                {indeps.map((v) => <label key={v.id} className="flex items-center gap-1.5 py-0.5"><Checkbox checked={!!gerar.obrig[v.id]} onCheckedChange={(c) => setGerar({ ...gerar, obrig: { ...gerar.obrig, [v.id]: !!c } })} />{v.nome} <span className="text-muted-foreground">({(v.transformacoes_autorizadas as string[]).length} transformações)</span></label>)}</div>}
              {gerar.modo === 'AMPLA' && <p className="text-muted-foreground">Espaço: {indeps.length} variáveis independentes e {(dep.transformacoes_autorizadas as string[]).length} transformações da dependente, todas dentro do que foi autorizado.</p>}
              <div className={`rounded-md border p-3 ${limite && !limite.ok ? 'border-destructive/50 bg-destructive/5' : ''}`} role="status">
                <p className="font-medium">Candidatos estimados: {estimativa.total}</p>
                {estimativa.descartadasDominio > 0 && <p className="text-xs text-muted-foreground">{estimativa.descartadasDominio} transformação(ões) fora do domínio dos dados foram descartadas (ex.: logaritmo de zero).</p>}
                <p className="text-xs text-muted-foreground">Limite da organização: {gerar.modo === 'AMPLA' ? settings.exploration_candidate_soft_limit : settings.assisted_candidate_soft_limit} sem confirmação{settings.hard_limit ? ` · máximo ${settings.hard_limit}` : ''}.</p>
                {limite && !limite.ok && limite.reason === 'HARD_LIMIT' && <p className="text-xs text-destructive mt-1">Acima do máximo permitido. Reduza transformações ou marque variáveis obrigatórias.</p>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setGerar(null)}>Cancelar</Button>
            <Button onClick={() => gerarCandidatos(false)} disabled={busy === 'gerar' || !gerar?.depTs.length || !limite?.ok}>{busy === 'gerar' ? 'Calculando…' : 'Gerar e calcular'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmar !== null} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar {confirmar} candidatos?</AlertDialogTitle>
            <AlertDialogDescription>O volume está acima do limite sem confirmação da sua organização e o cálculo pode levar alguns minutos. Nenhum modelo será escolhido automaticamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => gerarCandidatos(true)}>Gerar mesmo assim</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModeloDetalhe({ modeloId, avaliacaoId }: { modeloId: string; avaliacaoId: string }) {
  const q = useAvalQuery(avaliacaoId, `modelo-${modeloId}`, async () => {
    const { data: ex } = await db.from('avaliacao_modelo_execucoes').select('id, status, erro_codigo, engine_version, input_hash, output_hash, concluido_em').eq('modelo_id', modeloId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!ex) return { ex: null, coefs: [], resumo: null };
    const [c, r] = await Promise.all([
      db.from('modelo_coeficientes').select('*').eq('execucao_id', ex.id).order('ordem'),
      db.from('modelo_resultado_resumo').select('*').eq('execucao_id', ex.id).maybeSingle(),
    ]);
    return { ex, coefs: (c.data ?? []) as any[], resumo: r.data as any };
  });
  if (!q.data?.ex) return <p className="text-sm text-muted-foreground">Modelo ainda não calculado.</p>;
  if (q.data.ex.status === 'ERRO') return <p className="text-sm text-destructive">{avalErrorMessage({ message: `aval:${q.data.ex.erro_codigo}` }, 'O cálculo falhou.')}</p>;
  const r = q.data.resumo;
  return (
    <div className="grid gap-3 text-sm md:grid-cols-[1fr_260px]">
      <Table>
        <TableHeader><TableRow><TableHead>Termo</TableHead><TableHead className="text-right">Coeficiente</TableHead><TableHead className="text-right">Erro padrão</TableHead><TableHead className="text-right">t</TableHead><TableHead className="text-right">Significância</TableHead></TableRow></TableHeader>
        <TableBody>{q.data.coefs.map((c) => (
          <TableRow key={c.id}><TableCell>{c.codigo === '(intercepto)' ? 'Intercepto' : `${TRANSFORM_LABEL[c.transformacao]?.replace('x', c.codigo) ?? c.codigo}`}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(c.beta, 6)}</TableCell><TableCell className="text-right tabular-nums">{fmtNum(c.erro_padrao, 6)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtNum(c.t, 4)}</TableCell><TableCell className="text-right tabular-nums">{fmtNum(c.sig * 100, 2)}%</TableCell></TableRow>
        ))}</TableBody>
      </Table>
      <div className="space-y-1">
        <p>n = {r?.n} · k = {r?.k}</p>
        <p>R² = {fmtNum(r?.r2, 4)} · R² ajustado = {fmtNum(r?.r2_ajustado, 4)}</p>
        <p>F = {fmtNum(r?.f, 4)} · sig. F = {r?.sig_f != null ? `${fmtNum(r.sig_f * 100, 4)}%` : '—'}</p>
        <p>Estimativa preliminar: {r?.centro_preliminar != null ? fmtNum(r.centro_preliminar, 2) : '—'}{r?.grau_precisao ? ` · precisão grau ${r.grau_precisao}` : ''}{r?.extrapola ? ' · com extrapolação' : ''}</p>
        <p className="text-xs text-muted-foreground pt-2">Motor {q.data.ex.engine_version} · entrada {String(q.data.ex.input_hash).slice(0, 12)}… · saída {String(q.data.ex.output_hash ?? '').slice(0, 12)}…</p>
      </div>
    </div>
  );
}
