import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Compass, Hand, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { ImpactDialog, type PendingChange } from '../ImpactDialog';
import { useVariaveisStatus } from '../VariaveisShared';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { TRANSFORM_LABEL, TRANSFORMS, transformLabel } from '@/lib/avaliacao/labels';
import { codigoExibicao, exibirValor, fonteLabel } from '@/lib/avaliacao/variaveis';
import { MODE_HELP, TRANSFORM_MODAL_INTRO, compatSummary, frozenCompleteness, transformHelp, transformRoleNote, type ConjuntoCompat } from '@/lib/avaliacao/modelDiagnostics';
import { ModelosPainel } from './ModelosPainel';
import { buildCandidates, estimateCandidates, evaluateCandidateLimit, type CandidateMode, type ModelingSettings, type TransformCode } from '@/lib/avaliacao/engine';

const RELACAO: Record<string, string> = { POSITIVA: 'Positiva', NEGATIVA: 'Negativa', INDEFINIDA: 'Indefinida' };
const DEFAULT_SETTINGS: ModelingSettings = { assisted_candidate_soft_limit: 30, exploration_candidate_soft_limit: 200, hard_limit: 2000, require_confirmation_over: 100 };

export function ModelagemBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [changes, setChanges] = useState<PendingChange[] | null>(null);
  const [transf, setTransf] = useState<{ v: any; sel: string[] } | null>(null);
  const status = useVariaveisStatus(av.id);
  const stVar = new Map((status.data?.variaveis ?? []).map((v) => [v.id, v]));
  const [novoModelo, setNovoModelo] = useState<{ dep: string; depT: string; vars: Record<string, string> } | null>(null);
  const [gerar, setGerar] = useState<{ modo: CandidateMode; dep: string; depTs: string[]; obrig: Record<string, boolean> } | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useAvalQuery(av.id, 'modelagem', async () => {
    const [vars, cj, st] = await Promise.all([
      db.from('avaliacao_variaveis').select('*').eq('avaliacao_id', av.id).eq('ativo', true).order('created_at'),
      db.from('avaliacao_conjuntos_dados').select('id, versao').eq('avaliacao_id', av.id).eq('status', 'CONGELADO').order('versao', { ascending: false }).limit(1).maybeSingle(),
      db.from('avaliacao_modeling_settings').select('organization_id, assisted_candidate_soft_limit, exploration_candidate_soft_limit, hard_limit, require_confirmation_over'),
    ]);
    const conjunto = cj.data as any;
    // Valores congelados do conjunto (os mesmos que o servidor usa para validar o domínio das transformações).
    const snaps = conjunto ? (await db.from('avaliacao_amostra_snapshots').select('dados').eq('conjunto_id', conjunto.id).limit(10000)).data ?? [] : [];
    // Compatibilidade do conjunto congelado com as variáveis atuais (o servidor também recusa criar modelos sobre conjunto incompatível).
    let compat: ConjuntoCompat | null = null;
    if (conjunto) { try { compat = await rpc<ConjuntoCompat>('aval_conjunto_compat', { p_conjunto: conjunto.id }); } catch { compat = null; } }
    const settingsRows = (st.data ?? []) as any[];
    const settings: ModelingSettings = settingsRows.find((r) => r.organization_id) ?? settingsRows.find((r) => !r.organization_id) ?? DEFAULT_SETTINGS;
    return { vars: (vars.data ?? []) as any[], conjunto,
      snaps: (snaps as any[]).filter((x) => x.dados?.habilitada_modelo !== false), settings, compat };
  });
  const vars = q.data?.vars ?? [];
  const canModel = ctx.can('model.create');
  const dep = vars.find((v) => v.papel === 'DEPENDENTE');
  const indeps = vars.filter((v) => v.papel === 'INDEPENDENTE');
  const espaco = [...(dep ? [dep] : []), ...vars.filter((v) => v.papel !== 'DEPENDENTE')];
  const compat = q.data?.compat ?? null;
  const resumoCompat = compatSummary(compat);
  const desatualizado = !!q.data?.conjunto && !resumoCompat.compativel;

  /** Incluir/excluir do espaço de modelagem e relação esperada passam pelo resumo de impacto (o servidor decide o nível). */
  const mudar = (v: any, campo: 'papel' | 'relacao_esperada', valor: string, de: string, para: string, rotulo: string) =>
    setChanges([{ entity_type: 'variavel', entity_id: v.id, campo, valor, rotulo: `${rotulo} — ${v.nome}`, de, para }]);
  const salvarTransf = async () => {
    if (!transf) return;
    if (transf.sel.length === 0) { toast.error('Autorize ao menos uma transformação.'); return; }
    const { error } = await db.from('avaliacao_variaveis').update({ transformacoes_autorizadas: TRANSFORMS.filter((t) => transf.sel.includes(t)) }).eq('id', transf.v.id);
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Transformações atualizadas. Valem para as próximas gerações; modelos já calculados não mudam.');
    setTransf(null); ctx.refresh();
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
    try {
      const id = await criarModelo({ dep: novoModelo.dep, depT: novoModelo.depT, vars: sel });
      const { data: vinc } = await db.from('avaliacao_model_run_modelos').select('situacao').eq('modelo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: mod } = await db.from('avaliacao_modelos').select('nome').eq('id', id).maybeSingle();
      if ((vinc as any)?.situacao === 'JA_EXISTENTE') toast.info(`Já existe um modelo idêntico neste conjunto (${(mod as any)?.nome ?? 'modelo existente'}). Nada foi duplicado.`);
      else toast.success('Modelo criado. Calcule-o para ver os resultados.');
      setNovoModelo(null); ctx.refresh();
    }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const frozen = (code: string) => (q.data?.snaps ?? []).map((x: any) => x.dados?.variaveis?.[code]).filter((x: unknown) => x !== null && x !== undefined && x !== '').map(Number);
  const avaliandoVal = (v: any) => { const raw = stVar.get(v.id)?.valor_avaliando; return raw === null || raw === undefined ? [] : [Number(raw)]; };
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
    if (limite.ok === false) { toast.error(limite.reason === 'EMPTY' ? 'Nenhuma combinação válida com as transformações autorizadas.' : `São ${estimativa.total} candidatos; o limite da organização é ${limite.limit}. Torne variáveis obrigatórias ou reduza transformações.`); return; }
    if (limite.requiresConfirmation && !confirmado) { setConfirmar(estimativa.total); return; }
    setConfirmar(null);
    const lista = buildCandidates(gerar.modo, spec.depSpec, spec.ind).map((c) => ({ dep_transf: c.depT, vars: c.vars.map(([variavel_id, transformacao]) => ({ variavel_id, transformacao })) }));
    setBusy('gerar');
    let ok = 0, falhas = 0;
    try {
      const r = await rpc<{ numero: number; criados: string[]; ignorados_duplicidade: number; a_calcular: string[] }>('aval_model_generate_round', {
        p_avaliacao: av.id, p_conjunto: q.data!.conjunto.id, p_modo: gerar.modo, p_candidatos: lista, p_confirmado: confirmado, p_estimados: estimativa.total,
        p_parametros: { modo: gerar.modo, dep_transformacoes: gerar.depTs, obrigatorias: Object.keys(gerar.obrig).filter((k) => gerar.obrig[k]),
          transformacoes: Object.fromEntries(espaco.map((v) => [v.codigo, v.transformacoes_autorizadas])), candidatos: lista.length },
      });
      for (const id of r.a_calcular ?? []) {
        try { await engine({ action: 'run_model', modelo_id: id }); ok++; } catch { falhas++; }
      }
      const dup = r.ignorados_duplicidade ?? 0;
      toast.success(`Rodada ${r.numero}: ${r.criados?.length ?? 0} modelo(s) novo(s), ${ok} calculado(s)${falhas ? `, ${falhas} com erro (veja o motivo em cada modelo)` : ''}${dup ? `; ${dup} ignorado(s) por duplicidade (já existiam neste conjunto)` : ''}. Compare e escolha com critério técnico.`);
      setGerar(null);
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); ctx.refresh(); }
  };
  const abrirModo = (modo: 'MANUAL' | CandidateMode) => {
    if (!dep) return;
    if (desatualizado) { toast.error(resumoCompat.mensagem); return; }
    if (modo === 'MANUAL') { setNovoModelo({ dep: dep.id, depT: dep.transformacoes_autorizadas.includes('LN') ? 'LN' : dep.transformacoes_autorizadas[0], vars: Object.fromEntries(indeps.map((v) => [v.id, v.transformacoes_autorizadas[0]])) }); return; }
    setGerar({ modo, dep: dep.id, depTs: modo === 'AMPLA' ? [...dep.transformacoes_autorizadas] : (dep.transformacoes_autorizadas as string[]).includes('LN') ? ['LN'] : [dep.transformacoes_autorizadas[0]], obrig: {} });
  };
  const podeCriar = canModel && !!q.data?.conjunto && !!dep && indeps.length > 0 && !desatualizado;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 space-y-1">
          <CardTitle className="text-base">Espaço de modelagem</CardTitle>
          <p className="text-sm text-muted-foreground">Como testar matematicamente as variáveis da pesquisa? Os valores vêm do cadastro do imóvel e das amostras — não é preciso redigitar. Para incluir outra característica, use a etapa <Link className="underline underline-offset-2" to={`/avaliacoes/${av.id}/variaveis`}>Variáveis</Link>.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {espaco.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Defina as variáveis na etapa <Link className="underline underline-offset-2" to={`/avaliacoes/${av.id}/variaveis`}>Variáveis</Link> antes de modelar.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead className="w-16">Incluir</TableHead><TableHead>Variável</TableHead><TableHead>Relação esperada</TableHead><TableHead>Transformações autorizadas</TableHead><TableHead className="text-right">Valores coletados</TableHead></TableRow></TableHeader>
              <TableBody>{espaco.map((v) => {
                const sv = stVar.get(v.id);
                const isDep = v.papel === 'DEPENDENTE';
                return (
                  <TableRow key={v.id} className={v.papel === 'DISPONIVEL' ? 'text-muted-foreground' : ''}>
                    <TableCell>{isDep ? <Badge>Dependente</Badge> : (
                      <Checkbox aria-label={`Incluir ${v.nome} no espaço de modelagem`} checked={v.papel === 'INDEPENDENTE'} disabled={!canModel}
                        onCheckedChange={(c) => mudar(v, 'papel', c ? 'INDEPENDENTE' : 'DISPONIVEL', v.papel === 'INDEPENDENTE' ? 'Incluída' : 'Fora', c ? 'Incluída' : 'Fora', 'Espaço de modelagem')} />)}</TableCell>
                    <TableCell><p className="font-medium text-foreground">{v.nome}</p><p className="text-xs text-muted-foreground">{codigoExibicao(v.codigo)}{sv ? ` · ${fonteLabel(sv)}` : ''}{v.unidade ? ` · ${v.unidade}` : ''}</p></TableCell>
                    <TableCell>{isDep ? <span className="text-muted-foreground">—</span> : (
                      <Select value={v.relacao_esperada} disabled={!canModel} onValueChange={(r) => r !== v.relacao_esperada && mudar(v, 'relacao_esperada', r, RELACAO[v.relacao_esperada], RELACAO[r], 'Relação esperada')}>
                        <SelectTrigger className="h-8 w-32" aria-label={`Relação esperada de ${v.nome}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(RELACAO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>)}</TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex flex-wrap items-center gap-1">{(v.transformacoes_autorizadas as string[]).map((t) => <Badge key={t} variant="outline" className="font-mono font-normal">{transformLabel(t, isDep)}</Badge>)}
                        {canModel && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Editar transformações de ${v.nome}`} onClick={() => setTransf({ v, sel: [...v.transformacoes_autorizadas] })}><Pencil className="h-3.5 w-3.5" /></Button>}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{sv ? <>
                      <span className={sv.obrigatoria && sv.amostras_completas < sv.amostras_total ? 'text-destructive' : ''}>{sv.amostras_completas}/{sv.amostras_total} amostras</span>
                      {sv.precisa_avaliando && <span className="block text-muted-foreground">avaliando: {exibirValor(sv, sv.valor_avaliando)}</span>}
                      {(() => { const fc = frozenCompleteness(compat, v.id); return fc && fc.presentes < fc.total
                        ? <span className="block text-destructive">no conjunto v{q.data?.conjunto?.versao}: {fc.presentes}/{fc.total}</span> : null; })()}</> : '—'}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          )}
          <p className="px-6 py-3 text-xs text-muted-foreground">Mudar a relação esperada de variável usada em modelo calculado invalida a validação. Mudar transformações vale só para as próximas gerações.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Modelos</CardTitle>
        </CardHeader>
        {desatualizado && (
          <CardContent className="pt-0 pb-4">
            <Alert variant="destructive" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <AlertTitle>Conjunto vigente desatualizado (versão {q.data?.conjunto?.versao})</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{resumoCompat.mensagem}</p>
                {resumoCompat.detalhes.length > 0 && <ul className="list-disc pl-5 text-xs">{resumoCompat.detalhes.map((d) => <li key={d}>{d}</li>)}</ul>}
                <Button asChild size="sm" variant="outline"><Link to={`/avaliacoes/${av.id}/mercado`}>Ir para Mercado / Congelar nova versão</Link></Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
        {podeCriar && (
          <CardContent className="pt-0 pb-4">
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Modo de modelagem">
              {([
                { modo: 'MANUAL', icon: Hand, titulo: 'Manual', texto: MODE_HELP.MANUAL },
                { modo: 'ASSISTIDO', icon: Sparkles, titulo: 'Assistido', texto: MODE_HELP.ASSISTIDO, destaque: true },
                { modo: 'AMPLA', icon: Compass, titulo: 'Exploração ampla', texto: MODE_HELP.AMPLA },
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
        <ModelosPainel ctx={ctx} vars={vars} conjunto={q.data?.conjunto ?? null} desatualizado={desatualizado} mensagemDesatualizado={resumoCompat.mensagem ?? null} />
      </Card>

      <Dialog open={!!transf} onOpenChange={(o) => !o && setTransf(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transformações autorizadas — {transf?.v.nome}</DialogTitle>
            <DialogDescription>{TRANSFORM_MODAL_INTRO}</DialogDescription></DialogHeader>
          {transf && <>
            <p className="text-xs text-muted-foreground">{transformRoleNote(transf.v.papel === 'DEPENDENTE')}</p>
            <div className="grid gap-1.5" role="group" aria-label="Transformações autorizadas">{TRANSFORMS.map((t) => {
              const isDep = transf.v.papel === 'DEPENDENTE';
              const [, significado] = transformHelp(t, isDep).split(' — ');
              return (
                <label key={t} className="grid grid-cols-[auto_4.5rem_1fr] items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={transf.sel.includes(t)} aria-describedby={`transf-help-${t}`}
                    onCheckedChange={(c) => setTransf({ ...transf, sel: c ? [...transf.sel, t] : transf.sel.filter((x) => x !== t) })} />
                  <span className="font-mono">{transformLabel(t, isDep)}</span>
                  <span id={`transf-help-${t}`} className="text-xs text-muted-foreground">{significado}</span>
                </label>
              );
            })}</div>
            <p className="text-xs text-muted-foreground">Mudar as transformações autorizadas não altera modelos já calculados; vale para as próximas gerações.</p>
          </>}
          <DialogFooter><Button variant="outline" onClick={() => setTransf(null)}>Cancelar</Button><Button onClick={salvarTransf}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ImpactDialog avaliacaoId={av.id} changes={changes} onClose={() => setChanges(null)} onApplied={ctx.refresh} />

      <Dialog open={!!novoModelo} onOpenChange={(o) => !o && setNovoModelo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modelo manual</DialogTitle><DialogDescription>{MODE_HELP.MANUAL} Escolha uma transformação autorizada para cada variável ou deixe-a fora do modelo.</DialogDescription></DialogHeader>
          {novoModelo && dep && (
            <div className="grid gap-3">
              <div className="grid grid-cols-[1fr_140px] items-center gap-2"><span className="text-sm font-medium">{dep.nome} (dependente)</span>
                <Select value={novoModelo.depT} onValueChange={(t) => setNovoModelo({ ...novoModelo, depT: t })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(dep.transformacoes_autorizadas as string[]).map((t) => <SelectItem key={t} value={t}>{transformLabel(t, true)}</SelectItem>)}</SelectContent></Select></div>
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
              ? MODE_HELP.AMPLA
              : `${MODE_HELP.ASSISTIDO} Variáveis obrigatórias entram em todos os candidatos.`}</DialogDescription>
          </DialogHeader>
          {gerar && dep && (
            <div className="grid gap-3 text-sm">
              {gerar.modo === 'ASSISTIDO' && <div><p className="font-medium mb-1">Transformações da dependente</p>
                <div className="flex flex-wrap gap-3">{(dep.transformacoes_autorizadas as string[]).map((t) => <label key={t} className="flex items-center gap-1.5"><Checkbox checked={gerar.depTs.includes(t)} onCheckedChange={(c) => setGerar({ ...gerar, depTs: c ? [...gerar.depTs, t] : gerar.depTs.filter((x) => x !== t) })} />{transformLabel(t, true)}</label>)}</div></div>}
              {gerar.modo === 'ASSISTIDO' && <div><p className="font-medium mb-1">Variáveis obrigatórias</p>
                {indeps.map((v) => <label key={v.id} className="flex items-center gap-1.5 py-0.5"><Checkbox checked={!!gerar.obrig[v.id]} onCheckedChange={(c) => setGerar({ ...gerar, obrig: { ...gerar.obrig, [v.id]: !!c } })} />{v.nome} <span className="text-muted-foreground">({(v.transformacoes_autorizadas as string[]).length} transformações)</span></label>)}</div>}
              {gerar.modo === 'AMPLA' && <p className="text-muted-foreground">Espaço: {indeps.length} variáveis independentes e {(dep.transformacoes_autorizadas as string[]).length} transformações da dependente, todas dentro do que foi autorizado.</p>}
              <div className={`rounded-md border p-3 ${limite && !limite.ok ? 'border-destructive/50 bg-destructive/5' : ''}`} role="status">
                <p className="font-medium">Candidatos estimados: {estimativa.total}</p>
                {estimativa.descartadasDominio > 0 && <p className="text-xs text-muted-foreground">{estimativa.descartadasDominio} transformação(ões) fora do domínio dos dados foram descartadas (ex.: logaritmo de zero).</p>}
                <p className="text-xs text-muted-foreground">Limite da organização: {gerar.modo === 'AMPLA' ? settings.exploration_candidate_soft_limit : settings.assisted_candidate_soft_limit} sem confirmação{settings.hard_limit ? ` · máximo ${settings.hard_limit}` : ''}.</p>
                {limite && limite.ok === false && limite.reason === 'HARD_LIMIT' && <p className="text-xs text-destructive mt-1">Acima do máximo permitido. Reduza transformações ou marque variáveis obrigatórias.</p>}
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
