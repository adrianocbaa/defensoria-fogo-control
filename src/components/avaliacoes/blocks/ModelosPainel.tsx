import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Calculator, ChevronDown, ChevronLeft, ChevronRight, Columns3, Eraser, Lightbulb, MoreHorizontal, Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { TRANSFORM_LABEL, fmtNum } from '@/lib/avaliacao/labels';
import { explainModelError, type ConjuntoCompat } from '@/lib/avaliacao/modelDiagnostics';
import { CRITERIOS_ORDEM, TRIAGEM_AVISO, TRIAGEM_TEXTO, analisar, linhasComparacao, triar, type Analise, type ResultadoTriagem, type TriagemModelo, type TriagemPolitica } from '@/lib/avaliacao/triagem';

const STATUS_MOD: Record<string, string> = { RASCUNHO: 'A calcular', CALCULADO: 'Calculado', ERRO: 'Erro no cálculo', EM_VALIDACAO: 'Em validação' };
const ORIGEM_MOD: Record<string, string> = { MANUAL: 'Manual', GERADO_ASSISTIDO: 'Assistido', GERADO_AMPLA: 'Exploração ampla', SIMULACAO_VARIAVEL: 'Simulação', SIMULACAO_AMOSTRA: 'Simulação' };
const MODO_RODADA: Record<string, string> = { ASSISTIDO: 'Assistido', AMPLA: 'Exploração ampla', MANUAL: 'Manual' };
const PAGE = 50;

type Run = { id: string; numero: number; modo: string; conjunto_versao: number; modelos: number; qtd_estimada: number; qtd_criada: number; qtd_existente: number; qtd_calculada: number; qtd_erro: number; arquivada: boolean };
type Ordem = 'numero' | 'r2_ajustado' | 'pior_sig_regressor' | 'amplitude_pct' | 'n';
type Sel = { nome: string; status: string; stale: boolean };

export function rodadaResumo(r: Run): string {
  return `Rodada ${r.numero} • ${MODO_RODADA[r.modo] ?? r.modo} • ${r.modelos} modelo${r.modelos === 1 ? '' : 's'} • conjunto V${r.conjunto_versao}${r.arquivada ? ' • arquivada' : ''}`;
}

export function equacao(m: { dependente_variavel_id: string; dependente_transformacao: string; variaveis?: any[]; avaliacao_modelo_variaveis?: any[] }, vars: any[]) {
  const dep = vars.find((v) => v.id === m.dependente_variavel_id);
  const ind = [...(m.variaveis ?? m.avaliacao_modelo_variaveis ?? [])].sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return `${(TRANSFORM_LABEL[m.dependente_transformacao] ?? 'x').replace('x', dep?.codigo ?? 'y')} ~ ${ind.map((mv: any) => (TRANSFORM_LABEL[mv.transformacao] ?? 'x').replace('x', vars.find((v) => v.id === mv.variavel_id)?.codigo ?? '?')).join(' + ')}`;
}

const ROTULO_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = { 'Forte candidato': 'default', Candidato: 'secondary', 'Requer atenção': 'outline' };

interface Props {
  ctx: AvaliacaoCtx; vars: any[]; conjunto: { id: string; versao: number } | null; desatualizado: boolean; mensagemDesatualizado: string | null;
}

export function ModelosPainel({ ctx, vars, conjunto, desatualizado, mensagemDesatualizado }: Props) {
  const av = ctx.avaliacao.data!;
  const canModel = ctx.can('model.create');
  const canRun = ctx.can('model.run');
  const canVal = ctx.can('validation.run');
  const [rodada, setRodada] = useState<string>('ATUAL');
  const [status, setStatus] = useState<'' | 'CALCULADO' | 'ERRO'>('');
  const [favoritos, setFavoritos] = useState(false);
  const [sugeridos, setSugeridos] = useState(false);
  const [semExtrap, setSemExtrap] = useState(false);
  const [arquivados, setArquivados] = useState<'OCULTAR' | 'SOMENTE' | 'TODOS'>('OCULTAR');
  const [grau, setGrau] = useState<string>('TODOS');
  const [ordem, setOrdem] = useState<{ campo: Ordem; desc: boolean }>({ campo: 'numero', desc: true });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Map<string, Sel>>(new Map());
  const [aberto, setAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [triagem, setTriagem] = useState<ResultadoTriagem | null>(null);
  const [comparar, setComparar] = useState(false);
  const [enviar, setEnviar] = useState(false);
  const [confirmArq, setConfirmArq] = useState<null | 'RODADA' | 'LISTA'>(null);

  const runsQ = useAvalQuery(av.id, 'modelos-rodadas', async () => (await rpc<Run[]>('aval_model_runs', { p_avaliacao: av.id })) ?? []);
  const runs = runsQ.data ?? [];
  const atual = runs[0] ?? null;
  const rodadaId = rodada === 'TODAS' ? null : rodada === 'ATUAL' ? atual?.id ?? null : rodada;
  const rodadaSel = runs.find((r) => r.id === rodadaId) ?? null;
  const filtros = useMemo(() => ({
    ...(status ? { status } : {}), ...(favoritos ? { favoritos: true } : {}), ...(semExtrap ? { sem_extrapolacao: true } : {}),
    arquivados, ...(grau !== 'TODOS' ? { graus_precisao: [grau] } : {}),
    ...(sugeridos && triagem ? { ids: triagem.sugestoes.map((s) => s.modelo.id) } : {}),
  }), [status, favoritos, semExtrap, arquivados, grau, sugeridos, triagem]);
  const listKey = `modelos-lista-${rodadaId ?? 'todas'}-${JSON.stringify(filtros)}-${ordem.campo}-${ordem.desc}-${page}`;
  const lista = useAvalQuery(av.id, listKey, async () => rpc<{ total: number; rows: any[] }>('aval_model_list', {
    p_avaliacao: av.id, p_rodada: rodadaId, p_filtros: filtros, p_ordem: ordem.campo, p_desc: ordem.desc, p_limit: PAGE, p_offset: page * PAGE,
  }), runsQ.isSuccess);
  const rows = lista.data?.rows ?? [];
  const total = lista.data?.total ?? 0;
  const sugeridosIds = new Map((triagem?.sugestoes ?? []).map((s) => [s.modelo.id, s.rotulo]));
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  const toggleSel = (m: { id: string; nome: string; status: string; stale: boolean }, on: boolean) => {
    const n = new Map(sel); if (on) n.set(m.id, { nome: m.nome, status: m.status, stale: m.stale }); else n.delete(m.id); setSel(n);
  };
  const ordenar = (campo: Ordem) => { setOrdem((o) => ({ campo, desc: o.campo === campo ? !o.desc : campo !== 'pior_sig_regressor' && campo !== 'amplitude_pct' })); setPage(0); };
  const SortHead = ({ campo, children }: { campo: Ordem; children: React.ReactNode }) => {
    const ativo = ordem.campo === campo;
    return (
      <TableHead className="text-right" aria-sort={ativo ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => ordenar(campo)}>
          {children}{ativo ? (ordem.desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />) : <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />}
        </button>
      </TableHead>
    );
  };

  const calcular = async (m: any) => {
    setBusy(m.id);
    try { await engine({ action: 'run_model', modelo_id: m.id }); toast.success(`${m.nome} calculado.`); }
    catch (e) { toast.error(avalErrorMessage(e, 'O cálculo não pôde ser concluído. Abra o modelo para ver o motivo.')); } finally { setBusy(null); setAberto(m.id); ctx.refresh(); }
  };
  const favoritar = async (m: any) => {
    try { await rpc('aval_model_flag', { p_modelo: m.id, p_favorito: !m.favorito, p_candidato: null }); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const sugerir = async () => {
    setBusy('triagem');
    try {
      const d = await rpc<{ politica: TriagemPolitica | null; modelos: TriagemModelo[] }>('aval_model_triagem_dados', { p_avaliacao: av.id, p_rodada: rodadaId, p_ids: null });
      if (!d?.politica) { toast.error('Política de validação não encontrada para a organização.'); return; }
      setTriagem(triar(d.modelos ?? [], d.politica, 5));
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); }
  };
  const arquivarRodada = async () => {
    if (!rodadaSel) return;
    try {
      const r = await rpc<any>('aval_model_run_archive', { p_run: rodadaSel.id, p_arquivar: !rodadaSel.arquivada });
      toast.success(rodadaSel.arquivada ? `Rodada ${r.rodada} restaurada: ${r.alterados} modelo(s) voltaram à lista.`
        : `Rodada ${r.rodada} arquivada: ${r.alterados} modelo(s) ocultados${r.protegidos ? `; ${r.protegidos} protegido(s) (em validação, aceitos, usados ou favoritos)` : ''}${r.mantidos_outras_rodadas ? `; ${r.mantidos_outras_rodadas} mantido(s) por estarem em outra rodada ativa` : ''}. Nada foi excluído.`);
      setConfirmArq(null); ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const arquivar = async (ids: string[] | null, arquivar = true) => {
    try {
      const r = await rpc<any>('aval_model_archive', { p_avaliacao: av.id, p_modelos: ids, p_rodada: ids ? null : rodadaId, p_arquivar: arquivar });
      toast.success(arquivar ? `${r.alterados} modelo(s) arquivado(s)${r.protegidos ? `; ${r.protegidos} protegido(s) permanecem visíveis` : ''}. Nada foi excluído.` : `${r.alterados} modelo(s) restaurado(s).`);
      setConfirmArq(null); setSel(new Map()); ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const selecionados = [...sel.entries()];
  const enviaveis = selecionados.filter(([, s]) => s.status === 'CALCULADO' && !s.stale);
  const enviarSelecionados = async () => {
    setBusy('enviar'); let ok = 0; const falhas: string[] = [];
    for (const [id, s] of enviaveis) {
      try { await rpc('aval_send_to_validation', { p_modelo: id }); ok++; } catch { falhas.push(s.nome); }
    }
    setBusy(null); setEnviar(false); setSel(new Map()); ctx.refresh();
    if (ok) toast.success(`${ok} modelo(s) enviado(s) à validação.`);
    if (falhas.length) toast.error(`Não foi possível enviar: ${falhas.join(', ')}.`);
  };

  if (!conjunto && runs.length === 0) return <CardContent className="p-0"><p className="p-6 text-sm text-muted-foreground">Congele o conjunto de dados no bloco Mercado para criar modelos.</p></CardContent>;

  return (
    <>
      <CardContent className="pt-0 pb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rodada} onValueChange={resetPage(setRodada)}>
            <SelectTrigger className="h-8 w-56" aria-label="Rodada de geração"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ATUAL">Rodada atual{atual ? ` (${atual.numero})` : ''}</SelectItem>
              <SelectItem value="TODAS">Todas as rodadas</SelectItem>
              {runs.slice(1).map((r) => <SelectItem key={r.id} value={r.id}>Rodada {r.numero} — {MODO_RODADA[r.modo]}{r.arquivada ? ' (arquivada)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {rodadaSel && <p className="text-sm font-medium">{rodadaResumo(rodadaSel)}</p>}
          {!rodadaSel && runs.length > 0 && <p className="text-sm font-medium">Todas as rodadas • {runs.length} rodada(s)</p>}
          {canModel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Ações da rodada"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {rodadaSel && <DropdownMenuItem onSelect={() => (rodadaSel.arquivada ? arquivarRodada() : setConfirmArq('RODADA'))}>
                  {rodadaSel.arquivada ? <><ArchiveRestore className="h-4 w-4 mr-2" />Desarquivar rodada</> : <><Archive className="h-4 w-4 mr-2" />Arquivar rodada</>}</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => setConfirmArq('LISTA')}><Eraser className="h-4 w-4 mr-2" />Limpar lista atual</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {rodadaSel && (
          <p className="text-xs text-muted-foreground">
            {rodadaSel.qtd_estimada} estimado(s) · {rodadaSel.qtd_criada} criado(s) · {rodadaSel.qtd_calculada} calculado(s){rodadaSel.qtd_erro ? ` · ${rodadaSel.qtd_erro} com erro` : ''}
            {rodadaSel.qtd_existente ? ` · ${rodadaSel.qtd_existente} ignorado(s) por duplicidade (já existiam)` : ''}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros rápidos">
          <Chip on={status === 'CALCULADO'} onClick={() => { setStatus(status === 'CALCULADO' ? '' : 'CALCULADO'); setPage(0); }}>Somente calculados</Chip>
          <Chip on={status === 'ERRO'} onClick={() => { setStatus(status === 'ERRO' ? '' : 'ERRO'); setPage(0); }}>Somente com erro</Chip>
          <Chip on={favoritos} onClick={() => { setFavoritos(!favoritos); setPage(0); }}>Somente favoritos</Chip>
          <Chip on={sugeridos} disabled={!triagem} title={!triagem ? 'Clique em “Sugerir candidatos para validação” primeiro' : undefined}
            onClick={() => { setSugeridos(!sugeridos); setPage(0); }}>Somente candidatos sugeridos</Chip>
          <Chip on={semExtrap} onClick={() => { setSemExtrap(!semExtrap); setPage(0); }}>Sem extrapolação</Chip>
          <Chip on={arquivados === 'SOMENTE'} onClick={() => { setArquivados(arquivados === 'SOMENTE' ? 'OCULTAR' : 'SOMENTE'); setPage(0); }}>Somente arquivados</Chip>
          <label className="ml-1 inline-flex items-center gap-1.5 text-xs">
            <Checkbox checked={arquivados === 'OCULTAR'} disabled={arquivados === 'SOMENTE'} onCheckedChange={(c) => { setArquivados(c ? 'OCULTAR' : 'TODOS'); setPage(0); }} />Ocultar modelos arquivados
          </label>
          <Select value={grau} onValueChange={resetPage(setGrau)}>
            <SelectTrigger className="h-7 w-44 text-xs" aria-label="Grau de precisão estimado"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="TODOS">Precisão: todos</SelectItem><SelectItem value="III">Precisão: Grau III</SelectItem><SelectItem value="II">Precisão: Grau II</SelectItem><SelectItem value="I">Precisão: Grau I</SelectItem></SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={sugerir} disabled={busy === 'triagem'}><Lightbulb className="h-4 w-4 mr-1" />{busy === 'triagem' ? 'Analisando…' : 'Sugerir candidatos para validação'}</Button>
          <Button size="sm" variant="outline" disabled={selecionados.length < 2 || selecionados.length > 5} onClick={() => setComparar(true)}
            title={selecionados.length < 2 || selecionados.length > 5 ? 'Selecione de 2 a 5 modelos' : undefined}><Columns3 className="h-4 w-4 mr-1" />Comparar selecionados</Button>
          {canVal && <Button size="sm" disabled={enviaveis.length === 0} onClick={() => setEnviar(true)}><Send className="h-4 w-4 mr-1" />Enviar selecionados para validação</Button>}
          {selecionados.length > 0 && <>
            <span className="text-xs text-muted-foreground">{selecionados.length} selecionado(s)</span>
            {canModel && (arquivados === 'SOMENTE'
              ? <Button size="sm" variant="ghost" onClick={() => arquivar(selecionados.map(([id]) => id), false)}><ArchiveRestore className="h-4 w-4 mr-1" />Desarquivar</Button>
              : <Button size="sm" variant="ghost" onClick={() => arquivar(selecionados.map(([id]) => id), true)}><Archive className="h-4 w-4 mr-1" />Arquivar</Button>)}
            <Button size="sm" variant="ghost" onClick={() => setSel(new Map())}>Limpar seleção</Button>
          </>}
        </div>
        <p className="text-xs text-muted-foreground">{TRIAGEM_TEXTO}</p>
      </CardContent>

      {triagem && <TriagemPainel triagem={triagem} vars={vars} sel={sel} onToggle={(a, on) => toggleSel({ id: a.modelo.id, nome: a.modelo.nome, status: a.modelo.status ?? 'CALCULADO', stale: !!a.modelo.stale }, on)} onClose={() => { setTriagem(null); setSugeridos(false); }} />}

      <CardContent className="p-0 overflow-x-auto">
        {lista.isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando modelos…</p> : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{conjunto ? `Nenhum modelo nesta visualização. Conjunto vigente: versão ${conjunto.versao}.` : 'Nenhum modelo nesta visualização.'}
            {rodadaSel?.arquivada ? ' Esta rodada está arquivada — desmarque “Ocultar modelos arquivados” ou escolha “Todas as rodadas”.' : ''}</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-8"><span className="sr-only">Selecionar</span></TableHead><TableHead className="w-8" /><TableHead>Modelo</TableHead><TableHead>Origem</TableHead><TableHead>Equação</TableHead>
              <SortHead campo="n">n</SortHead><SortHead campo="r2_ajustado">R² aj.</SortHead><SortHead campo="pior_sig_regressor">Pior sig.</SortHead><SortHead campo="amplitude_pct">Amplitude IC</SortHead>
              <TableHead>Situação</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>{rows.map((m) => {
              const r = m.resumo;
              const bloqueado = desatualizado && m.conjunto_id === conjunto?.id;
              return (
                <Fragment key={m.id}>
                  <TableRow className={m.stale || m.arquivado ? 'opacity-60' : ''} data-state={sel.has(m.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox aria-label={`Selecionar ${m.nome}`} checked={sel.has(m.id)} onCheckedChange={(c) => toggleSel(m, !!c)} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" aria-label={`Detalhes de ${m.nome}`} onClick={() => setAberto(aberto === m.id ? null : m.id)}>{aberto === m.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{m.favorito && <Star className="inline h-3.5 w-3.5 mr-1 fill-current" aria-label="Favorito" />}{m.nome}
                      {sugeridosIds.has(m.id) && <Badge variant={ROTULO_VARIANT[sugeridosIds.get(m.id) ?? 'Candidato']} className="ml-2">{sugeridosIds.get(m.id)}</Badge>}
                      {m.arquivado && <Badge variant="outline" className="ml-2">Arquivado</Badge>}
                      {rodada === 'TODAS' && <span className="block text-xs font-normal text-muted-foreground">conjunto V{m.conjunto_versao}</span>}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{ORIGEM_MOD[m.origem_tipo] ?? m.origem_tipo}</TableCell>
                    <TableCell className="text-xs font-mono">{equacao(m, vars)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r?.n ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r ? fmtNum(r.r2_ajustado, 4) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r?.pior_sig_regressor != null ? `${fmtNum(r.pior_sig_regressor * 100, 2)}%` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r?.amplitude_pct != null ? `${fmtNum(r.amplitude_pct, 2)}%` : '—'}</TableCell>
                    <TableCell>{m.stale ? <Badge variant="destructive">Desatualizado</Badge> : m.status === 'ERRO'
                      ? <button type="button" className="inline-flex items-center gap-1 text-left" onClick={() => setAberto(m.id)} aria-label={`Ver por que o ${m.nome} não foi calculado`}>
                          <Badge variant="destructive">{STATUS_MOD[m.status]}</Badge><span className="text-xs underline underline-offset-2 text-destructive">Ver motivo</span></button>
                      : <Badge variant="outline">{STATUS_MOD[m.status] ?? m.status}</Badge>}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {canRun && !m.stale && m.status === 'RASCUNHO' && <Button size="sm" variant="outline" disabled={busy === m.id || bloqueado}
                        title={bloqueado ? mensagemDesatualizado ?? undefined : undefined} onClick={() => calcular(m)}><Calculator className="h-4 w-4 mr-1" />Calcular</Button>}
                      {canModel && m.status !== 'RASCUNHO' && <Button size="icon" variant="ghost" aria-label={m.favorito ? `Desmarcar ${m.nome} como favorito` : `Marcar ${m.nome} como favorito`} onClick={() => favoritar(m)}><Star className={`h-4 w-4 ${m.favorito ? 'fill-current' : ''}`} /></Button>}
                    </TableCell>
                  </TableRow>
                  {aberto === m.id && <TableRow><TableCell colSpan={11} className="bg-muted/30"><ModeloDetalhe modeloId={m.id} avaliacaoId={av.id} conjuntoId={m.conjunto_id} vars={vars} /></TableCell></TableRow>}
                </Fragment>
              );
            })}</TableBody>
          </Table>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between gap-2 px-6 py-2 text-xs text-muted-foreground">
            <span>{page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} de {total} modelo(s)</span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button>
            </span>
          </div>
        )}
        <p className="px-6 py-3 text-xs text-muted-foreground">Não há escolha automática nem pontuação única: compare significâncias, coerência das relações e precisão. R² sozinho não decide. Arquivar só oculta — nenhum modelo é excluído.</p>
      </CardContent>

      {comparar && <CompararDialog avaliacaoId={av.id} ids={selecionados.map(([id]) => id)} vars={vars} onClose={() => setComparar(false)} />}

      <AlertDialog open={enviar} onOpenChange={(o) => !o && setEnviar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar {enviaveis.length} modelo(s) para validação?</AlertDialogTitle>
            <AlertDialogDescription>Somente os modelos escolhidos por você seguem para a Validação Técnica. Os demais continuam como estão.</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="text-sm list-disc pl-5">{enviaveis.map(([id, s]) => <li key={id}>{s.nome}</li>)}</ul>
          {selecionados.length > enviaveis.length && <p className="text-xs text-muted-foreground">{selecionados.length - enviaveis.length} selecionado(s) não podem ser enviados (não calculados, já em validação ou desatualizados).</p>}
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy === 'enviar'} onClick={enviarSelecionados}>Enviar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmArq !== null} onOpenChange={(o) => !o && setConfirmArq(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmArq === 'RODADA' ? `Arquivar a rodada ${rodadaSel?.numero}?` : 'Limpar a lista atual?'}</AlertDialogTitle>
            <AlertDialogDescription>Os modelos ficam ocultos, mas nada é excluído: histórico, cálculos e registros continuam guardados e podem ser restaurados.
              Modelos em validação, validados, aceitos, usados em simulação ou resultado e favoritos não são arquivados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => (confirmArq === 'RODADA' ? arquivarRodada() : arquivar(null, true))}>{confirmArq === 'RODADA' ? 'Arquivar rodada' : 'Limpar lista'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Chip({ on, children, ...p }: { on: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string }) {
  return <Button type="button" size="sm" variant={on ? 'secondary' : 'outline'} className="h-7 text-xs" aria-pressed={on} {...p}>{children}</Button>;
}

function TriagemPainel({ triagem, vars, sel, onToggle, onClose }: { triagem: ResultadoTriagem; vars: any[]; sel: Map<string, Sel>; onToggle: (a: Analise, on: boolean) => void; onClose: () => void }) {
  return (
    <CardContent className="pt-0 pb-4">
      <section className="rounded-lg border p-4 space-y-3" aria-label="Sugestões para validação">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Sugestões para validação</h3>
            <p className="text-xs text-muted-foreground"><Badge variant="outline" className="mr-1.5">{TRIAGEM_AVISO}</Badge>{triagem.elegiveis} de {triagem.analisados} modelo(s) calculado(s) atendem aos pré-requisitos.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        {triagem.sugestoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum modelo atende aos pré-requisitos mínimos nesta visualização.</p> : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{triagem.sugestoes.map((a) => (
            <li key={a.modelo.id} className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2 font-medium"><Checkbox checked={sel.has(a.modelo.id)} onCheckedChange={(c) => onToggle(a, !!c)} aria-label={`Selecionar ${a.modelo.nome}`} />{a.modelo.nome}</label>
                {a.rotulo && <Badge variant={ROTULO_VARIANT[a.rotulo]}>{a.rotulo === 'Requer atenção' && <AlertTriangle className="h-3 w-3 mr-1" aria-hidden />}{a.rotulo}</Badge>}
              </div>
              <p className="text-xs font-mono text-muted-foreground">{equacao({ dependente_variavel_id: a.modelo.dependente_variavel_id ?? '', dependente_transformacao: a.modelo.dependente_transformacao, variaveis: a.modelo.variaveis.map((v, i) => ({ ...v, ordem: i })) }, vars)}</p>
              <ul className="text-xs space-y-0.5">{a.motivos.map((t) => <li key={t}>• {t}</li>)}</ul>
              {a.alertas.length > 0 && <ul className="text-xs space-y-0.5">{a.alertas.map((t) => <li key={t} className="flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />{t}</li>)}</ul>}
            </li>
          ))}</ul>
        )}
        <Collapsible>
          <CollapsibleTrigger className="text-xs underline underline-offset-2">Como a triagem funciona</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-xs text-muted-foreground space-y-1">
            <p>Pré-requisitos: calculado sem erro, não desatualizado nem arquivado, sinais coerentes com a relação esperada, Sig. F e pior regressor dentro dos limites da política e precisão enquadrada.</p>
            <p>Sem pontuação única. Desempate, nesta ordem:</p>
            <ol className="list-decimal pl-5">{CRITERIOS_ORDEM.map((c) => <li key={c}>{c}</li>)}</ol>
            {triagem.exclusoes.length > 0 && <p>Fora dos pré-requisitos: {triagem.exclusoes.map((e) => `${e.motivo} (${e.quantidade})`).join(' · ')}.</p>}
          </CollapsibleContent>
        </Collapsible>
      </section>
    </CardContent>
  );
}

function CompararDialog({ avaliacaoId, ids, vars, onClose }: { avaliacaoId: string; ids: string[]; vars: any[]; onClose: () => void }) {
  const q = useAvalQuery(avaliacaoId, `comparar-${ids.join(',')}`, async () => rpc<{ politica: TriagemPolitica; modelos: TriagemModelo[] }>('aval_model_triagem_dados', { p_avaliacao: avaliacaoId, p_rodada: null, p_ids: ids }));
  const an = (q.data?.modelos ?? []).map((m) => analisar({ ...m, status: 'CALCULADO', stale: false, arquivado: false }, q.data!.politica));
  const linhas = linhasComparacao(an);
  const faltam = ids.length - an.length;
  const eqs = an.map((a) => equacao({ dependente_variavel_id: a.modelo.dependente_variavel_id ?? '', dependente_transformacao: a.modelo.dependente_transformacao, variaveis: a.modelo.variaveis.map((v, i) => ({ ...v, ordem: i })) }, vars));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Comparar modelos</DialogTitle>
          <DialogDescription>Lado a lado, com as diferenças destacadas. A comparação não aponta vencedor: a escolha é técnica e sua.</DialogDescription></DialogHeader>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
          <div className="overflow-x-auto">
            {faltam > 0 && <p className="mb-2 text-xs text-muted-foreground">{faltam} modelo(s) selecionado(s) ainda sem cálculo concluído ficaram fora da comparação.</p>}
            <Table>
              <TableHeader><TableRow><TableHead /> {an.map((a) => <TableHead key={a.modelo.id}>{a.modelo.nome}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Equação</TableCell>{eqs.map((e, i) => <TableCell key={i} className="font-mono text-xs">{e}</TableCell>)}</TableRow>
                <TableRow><TableCell className="font-medium">Variáveis / transformações</TableCell>{an.map((a) => <TableCell key={a.modelo.id} className="text-xs">{a.modelo.variaveis.map((v) => `${v.nome}: ${(TRANSFORM_LABEL[v.transformacao] ?? v.transformacao).replace('x', v.codigo)}`).join('; ')}</TableCell>)}</TableRow>
                {linhas.map((l) => (
                  <TableRow key={l.rotulo}>
                    <TableCell className="font-medium">{l.rotulo}{l.difere && <span className="sr-only"> (difere)</span>}</TableCell>
                    {l.valores.map((v, i) => <TableCell key={i} className={`tabular-nums text-xs ${l.difere ? 'bg-muted/60 font-medium' : ''}`}>{v}</TableCell>)}
                  </TableRow>
                ))}
                <TableRow><TableCell className="font-medium">Regressores (significância)</TableCell>{an.map((a) => <TableCell key={a.modelo.id} className="text-xs">{a.modelo.variaveis.map((v) => `${v.codigo}: ${v.sig != null ? `${fmtNum(v.sig * 100, 2)}%` : '—'}`).join('; ')}</TableCell>)}</TableRow>
                <TableRow><TableCell className="font-medium">Alertas</TableCell>{an.map((a) => <TableCell key={a.modelo.id} className="text-xs">{[...a.exclusoes, ...a.alertas].join('; ') || '—'}</TableCell>)}</TableRow>
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">Células destacadas indicam valores diferentes entre os modelos. {TRIAGEM_AVISO}.</p>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ModeloDetalhe({ modeloId, avaliacaoId, conjuntoId, vars }: { modeloId: string; avaliacaoId: string; conjuntoId: string; vars: any[] }) {
  const q = useAvalQuery(avaliacaoId, `modelo-${modeloId}`, async () => {
    const { data: ex } = await db.from('avaliacao_modelo_execucoes').select('id, status, erro_codigo, engine_version, input_hash, output_hash, concluido_em').eq('modelo_id', modeloId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!ex) return { ex: null, coefs: [], resumo: null, erro: null, compat: null, indices: new Map<string, number>() };
    if (ex.status === 'ERRO') {
      const [er, am] = await Promise.all([
        db.from('modelo_execucao_erros').select('codigo, detalhe').eq('execucao_id', ex.id).limit(1).maybeSingle(),
        db.from('avaliacao_amostras').select('id, created_at').eq('avaliacao_id', avaliacaoId).order('created_at').order('id').limit(10000),
      ]);
      let compat: ConjuntoCompat | null = null;
      try { compat = await rpc<ConjuntoCompat>('aval_conjunto_compat', { p_conjunto: conjuntoId }); } catch { compat = null; }
      const indices = new Map<string, number>(((am.data ?? []) as any[]).map((a, i) => [a.id, i + 1]));
      return { ex, coefs: [], resumo: null, erro: (er.data as any) ?? { codigo: ex.erro_codigo, detalhe: null }, compat, indices };
    }
    const [c, r] = await Promise.all([
      db.from('modelo_coeficientes').select('*').eq('execucao_id', ex.id).order('ordem'),
      db.from('modelo_resultado_resumo').select('*').eq('execucao_id', ex.id).maybeSingle(),
    ]);
    return { ex, coefs: (c.data ?? []) as any[], resumo: r.data as any, erro: null, compat: null, indices: new Map<string, number>() };
  });
  if (!q.data?.ex) return <p className="text-sm text-muted-foreground">Modelo ainda não calculado.</p>;
  if (q.data.ex.status === 'ERRO') {
    const info = explainModelError(q.data.erro?.codigo ?? q.data.ex.erro_codigo, q.data.erro?.detalhe,
      { variaveis: vars, amostraIndice: (id) => q.data!.indices.get(id) ?? null, compat: q.data.compat });
    const destino = info.acao === 'MERCADO' ? 'mercado' : info.acao === 'IMOVEL' ? 'imovel' : info.acao === 'VARIAVEIS' ? 'variaveis' : null;
    return (
      <Alert variant="destructive" role="alert">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <AlertTitle>{info.titulo}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{info.mensagem}</p>
          {info.contexto && <p className="text-xs">{info.contexto}</p>}
          {info.acaoTexto && (destino
            ? <Button asChild size="sm" variant="outline"><Link to={`/avaliacoes/${avaliacaoId}/${destino}`}>{info.acaoTexto}</Link></Button>
            : <p className="text-xs font-medium">O que fazer: {info.acaoTexto}.</p>)}
          <Collapsible>
            <CollapsibleTrigger className="text-xs underline underline-offset-2">Detalhes técnicos</CollapsibleTrigger>
            <CollapsibleContent className="mt-1 text-xs font-mono text-muted-foreground break-all">
              código {info.codigo}{q.data.erro?.detalhe ? ` · ${JSON.stringify(q.data.erro.detalhe)}` : ''} · motor {q.data.ex.engine_version}
            </CollapsibleContent>
          </Collapsible>
        </AlertDescription>
      </Alert>
    );
  }
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
