import { useMemo, useState } from 'react';
import { ArrowLeft, Building2, Home, ListPlus, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react';
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
import { ImpactDialog, type PendingChange } from '../ImpactDialog';
import { CompletudeTable, useVariaveisStatus } from '../VariaveisShared';
import { db } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import {
  catalogo, codigoExibicao, exibirValor, fonteLabel, novaVariavelDoItem, slugCodigo, transformacoesPadrao, variavelDoItem,
  type Atributo, type CatalogItem, type Papel, type Relacao, type VarStatus,
} from '@/lib/avaliacao/variaveis';

const PAPEL_LABEL: Record<Papel, string> = { DEPENDENTE: 'Dependente', INDEPENDENTE: 'Independente', DISPONIVEL: 'Disponível' };
const PAPEL_AJUDA: Record<Papel, string> = {
  DEPENDENTE: 'O valor que o modelo explica (ex.: valor mensal).',
  INDEPENDENTE: 'Característica que explica o valor e entra na modelagem.',
  DISPONIVEL: 'Coletada para consulta; pode entrar na modelagem depois.',
};
const RELACAO_LABEL: Record<Relacao, string> = { POSITIVA: 'Positiva', NEGATIVA: 'Negativa', INDEFINIDA: 'Indefinida' };
const TIPO_LABEL: Record<string, string> = { QUANTITATIVA: 'Quantitativa', DICOTOMICA: 'Dicotômica (sim/não)', CODIGO_ALOCADO: 'Código alocado', PROXY: 'Proxy', OUTRA: 'Outra' };
const GRUPOS = [
  { grupo: 'MERCADO', titulo: 'Resposta do mercado', icon: TrendingUp },
  { grupo: 'IMOVEL', titulo: 'Cadastro do imóvel', icon: Home },
  { grupo: 'CARACTERISTICA', titulo: 'Características do imóvel', icon: Building2 },
] as const;

interface Config { item: CatalogItem | null; papel: Papel; relacao: Relacao; obrigatoria: boolean; nome: string; codigo: string; codigoEditado: boolean; tipo: string; unidade: string; origem: 'MANUAL' | 'DERIVADA' }

export function VariaveisBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const status = useVariaveisStatus(av.id);
  const aux = useAvalQuery(av.id, 'variaveis-catalogo', async () => {
    const [at, inat] = await Promise.all([
      db.from('atributos_imobiliarios').select('id, codigo, nome, categoria, data_type, unidade, opcoes, modelable, ordem').eq('ativo', true).order('ordem').limit(1000),
      db.from('avaliacao_variaveis').select('id, codigo').eq('avaliacao_id', av.id).eq('ativo', false),
    ]);
    return { atributos: (at.data ?? []) as Atributo[], inativas: (inat.data ?? []) as { id: string; codigo: string }[] };
  });
  const [add, setAdd] = useState(false);
  const [busca, setBusca] = useState('');
  const [cfg, setCfg] = useState<Config | null>(null);
  const [editar, setEditar] = useState<{ v: VarStatus; papel: Papel; relacao: Relacao; obrigatoria: boolean; nome: string; unidade: string } | null>(null);
  const [changes, setChanges] = useState<PendingChange[] | null>(null);
  const [remover, setRemover] = useState<VarStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const st = status.data;
  const vars = st?.variaveis ?? [];
  const dep = vars.find((v) => v.papel === 'DEPENDENTE');
  const can = ctx.can('model.create');
  const itens = useMemo(() => catalogo(aux.data?.atributos ?? []), [aux.data?.atributos]);
  const filtrados = itens.filter((i) => !busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  const escolher = (item: CatalogItem | null) => {
    const papel: Papel = item ? (item.papelSugerido === 'DEPENDENTE' && dep ? 'INDEPENDENTE' : item.papelSugerido) : 'DISPONIVEL';
    setCfg({ item, papel, relacao: item?.relacaoSugerida ?? 'INDEFINIDA', obrigatoria: papel !== 'DISPONIVEL', nome: '', codigo: '', codigoEditado: false, tipo: 'QUANTITATIVA', unidade: '', origem: 'MANUAL' });
  };
  const fechar = () => { setAdd(false); setCfg(null); setBusca(''); };

  const salvar = async () => {
    if (!cfg) return;
    let payload;
    if (cfg.item) payload = novaVariavelDoItem(cfg.item, cfg.papel, cfg.relacao, cfg.obrigatoria);
    else {
      const nome = cfg.nome.trim();
      if (nome.length < 2) { toast.error('Informe o nome da variável.'); return; }
      const codigo = cfg.codigoEditado ? cfg.codigo.trim().toLowerCase() : slugCodigo(nome);
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(codigo)) { toast.error('Código: letras sem acento, números e _ (começando por letra).'); return; }
      payload = { nome, codigo, tipo_variavel: cfg.tipo, unidade: cfg.unidade.trim() || null, origem_tipo: cfg.origem, campo_origem: null, atributo_id: null,
        categorica: cfg.tipo === 'CODIGO_ALOCADO' || cfg.tipo === 'PROXY' ? true : null, papel: cfg.papel,
        relacao_esperada: cfg.papel === 'INDEPENDENTE' ? cfg.relacao : 'INDEFINIDA', obrigatoria: cfg.obrigatoria, transformacoes_autorizadas: transformacoesPadrao(cfg.papel, cfg.tipo) };
    }
    if (payload.papel === 'DEPENDENTE' && dep) { toast.error('Já existe uma variável dependente.'); return; }
    if (vars.some((v) => v.codigo === payload.codigo)) { toast.error(`Já existe a variável ${codigoExibicao(payload.codigo)}.`); return; }
    setBusy(true);
    try {
      const inativa = aux.data?.inativas.find((x) => x.codigo === payload.codigo);
      const { error } = inativa
        ? await db.from('avaliacao_variaveis').update({ ...payload, ativo: true }).eq('id', inativa.id)
        : await db.from('avaliacao_variaveis').insert({ avaliacao_id: av.id, ...payload });
      if (error) throw error;
      toast.success(`${payload.nome} incluída. Os campos aparecem no cadastro do imóvel e das amostras.`);
      fechar(); ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };

  const abrirEdicao = (v: VarStatus) => setEditar({ v, papel: v.papel, relacao: v.relacao_esperada, obrigatoria: v.obrigatoria, nome: v.nome, unidade: v.unidade ?? '' });
  const revisar = () => {
    if (!editar) return;
    const { v } = editar;
    const lote: PendingChange[] = [];
    const add_ = (campo: string, valor: unknown, rotulo: string, de: string, para: string) => lote.push({ entity_type: 'variavel', entity_id: v.id, campo, valor, rotulo, de, para });
    if (editar.papel !== v.papel) add_('papel', editar.papel, 'Papel', PAPEL_LABEL[v.papel], PAPEL_LABEL[editar.papel]);
    const rel = editar.papel === 'INDEPENDENTE' ? editar.relacao : 'INDEFINIDA';
    if (rel !== v.relacao_esperada) add_('relacao_esperada', rel, 'Relação esperada', RELACAO_LABEL[v.relacao_esperada], RELACAO_LABEL[rel]);
    if (editar.obrigatoria !== v.obrigatoria) add_('obrigatoria', String(editar.obrigatoria), 'Obrigatória para a coleta', v.obrigatoria ? 'Sim' : 'Não', editar.obrigatoria ? 'Sim' : 'Não');
    if (v.fonte === 'MANUAL') {
      if (editar.nome.trim() && editar.nome.trim() !== v.nome) add_('nome', editar.nome.trim(), 'Nome', v.nome, editar.nome.trim());
      if ((editar.unidade.trim() || null) !== (v.unidade || null)) add_('unidade', editar.unidade.trim() || null, 'Unidade', v.unidade || '—', editar.unidade.trim() || '—');
    }
    if (!lote.length) { toast.info('Nenhum campo foi alterado.'); return; }
    setChanges(lote);
  };
  const confirmarRemocao = async () => {
    if (!remover) return;
    const { error } = await db.from('avaliacao_variaveis').update({ ativo: false }).eq('id', remover.id);
    if (error) toast.error(avalErrorMessage(error)); else { toast.success('Variável removida da pesquisa.'); ctx.refresh(); }
    setRemover(null);
  };

  if (status.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (status.error) return <p className="text-sm text-destructive">{avalErrorMessage(status.error)}</p>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base">Variáveis da pesquisa</CardTitle>
            <p className="text-sm text-muted-foreground">Quais informações serão coletadas nesta avaliação? Elas viram campos no cadastro do imóvel e de cada amostra.</p>
          </div>
          {can && <Button size="sm" onClick={() => setAdd(true)}><Plus className="h-4 w-4 mr-1" />Adicionar variável</Button>}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {vars.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground space-y-1">
              <p>Nenhuma variável definida.</p>
              <p>Comece pela resposta do mercado (ex.: Valor mensal, dependente) e pelas características que explicam o valor (ex.: Área privativa, Banheiros).</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Variável</TableHead><TableHead>Papel</TableHead><TableHead>Relação esperada</TableHead><TableHead>Coleta</TableHead>
                <TableHead>Avaliando</TableHead><TableHead className="text-right">Amostras</TableHead>{can && <TableHead className="w-24"><span className="sr-only">Ações</span></TableHead>}
              </TableRow></TableHeader>
              <TableBody>{vars.map((v) => (
                <TableRow key={v.id}>
                  <TableCell><p className="font-medium">{v.nome}</p><p className="text-xs text-muted-foreground">{codigoExibicao(v.codigo)} · {fonteLabel(v)}{v.unidade ? ` · ${v.unidade}` : ''}</p></TableCell>
                  <TableCell>{v.papel === 'DEPENDENTE' ? <Badge>Dependente</Badge> : <Badge variant="outline">{PAPEL_LABEL[v.papel]}</Badge>}</TableCell>
                  <TableCell>{v.papel === 'INDEPENDENTE' ? RELACAO_LABEL[v.relacao_esperada] : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{v.obrigatoria ? 'Obrigatória' : 'Opcional'}</TableCell>
                  <TableCell className="tabular-nums">{!v.precisa_avaliando ? <span className="text-muted-foreground">N/A</span> : exibirValor(v, v.valor_avaliando)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${v.obrigatoria && v.amostras_completas < v.amostras_total ? 'text-destructive' : ''}`}>{v.amostras_completas}/{v.amostras_total}</TableCell>
                  {can && <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label={`Editar ${v.nome}`} title="Editar variável" onClick={() => abrirEdicao(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Remover ${v.nome}`} title={v.em_uso || v.no_conjunto ? 'Usada em conjunto congelado ou modelo' : 'Remover da pesquisa'}
                      disabled={v.em_uso || v.no_conjunto} onClick={() => setRemover(v)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>}
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {st && vars.length > 0 && st.amostras.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Completude da coleta</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto"><CompletudeTable st={st} /></CardContent>
        </Card>
      )}

      <Dialog open={add} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {!cfg ? (
            <>
              <DialogHeader>
                <DialogTitle>Adicionar variável</DialogTitle>
                <DialogDescription>Escolha uma informação existente. Nome, código, tipo, unidade e origem são preenchidos automaticamente.</DialogDescription>
              </DialogHeader>
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input className="pl-9" placeholder="Buscar característica" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar característica" /></div>
              <div className="space-y-4">
                {GRUPOS.map((g) => {
                  const lista = filtrados.filter((i) => i.grupo === g.grupo);
                  if (!lista.length) return null;
                  return (
                    <section key={g.grupo} aria-labelledby={`g-${g.grupo}`} className="space-y-2">
                      <h3 id={`g-${g.grupo}`} className="flex items-center gap-1.5 text-sm font-semibold"><g.icon className="h-4 w-4" aria-hidden />{g.titulo}</h3>
                      <div className="grid gap-2 sm:grid-cols-2">{lista.map((i) => {
                        const ja = variavelDoItem(i, vars);
                        return (
                          <button key={i.chave} type="button" disabled={!!ja} onClick={() => escolher(i)}
                            className="text-left rounded-md border p-2.5 transition-colors hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="flex items-center gap-2 text-sm font-medium">{i.nome}{ja && <Badge variant="outline" className="ml-auto">Já incluída</Badge>}</span>
                            <span className="block text-xs text-muted-foreground">{TIPO_LABEL[i.tipo_variavel]}{i.unidade ? ` · ${i.unidade}` : ''}</span>
                          </button>
                        );
                      })}</div>
                    </section>
                  );
                })}
                <button type="button" onClick={() => escolher(null)}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed p-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ListPlus className="h-4 w-4" aria-hidden /><span><span className="font-medium">Variável personalizada</span><span className="block text-xs text-muted-foreground">Para casos especiais sem característica cadastrada. Os valores são digitados no avaliando e em cada amostra.</span></span>
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{cfg.item ? cfg.item.nome : 'Variável personalizada'}</DialogTitle>
                <DialogDescription>Defina apenas o necessário para a coleta. Transformações matemáticas são escolhidas na Modelagem.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {cfg.item ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">Código</dt><dd className="font-mono">{codigoExibicao(cfg.item.codigo)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Tipo</dt><dd>{TIPO_LABEL[cfg.item.tipo_variavel]}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Unidade</dt><dd>{cfg.item.unidade ?? '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Origem dos dados</dt><dd>{cfg.item.fonteLabel}</dd></div>
                  </dl>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="vp-nome">Nome</Label><Input id="vp-nome" value={cfg.nome} maxLength={80} onChange={(e) => setCfg({ ...cfg, nome: e.target.value })} placeholder="Ex.: Idade aparente estimada" /></div>
                    <div className="grid gap-1.5"><Label>Tipo</Label><Select value={cfg.tipo} onValueChange={(t) => setCfg({ ...cfg, tipo: t })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['QUANTITATIVA', 'DICOTOMICA', 'CODIGO_ALOCADO', 'PROXY'].map((t) => <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid gap-1.5"><Label htmlFor="vp-un">Unidade</Label><Input id="vp-un" value={cfg.unidade} maxLength={20} onChange={(e) => setCfg({ ...cfg, unidade: e.target.value })} placeholder="Ex.: anos" /></div>
                    <div className="grid gap-1.5"><Label>Origem</Label><Select value={cfg.origem} onValueChange={(o) => setCfg({ ...cfg, origem: o as Config['origem'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANUAL">Manual</SelectItem><SelectItem value="DERIVADA">Derivada</SelectItem></SelectContent></Select></div>
                    <div className="grid gap-1.5"><Label htmlFor="vp-cod">Código</Label>
                      <Input id="vp-cod" className="font-mono" value={cfg.codigoEditado ? cfg.codigo : slugCodigo(cfg.nome || '')} maxLength={40}
                        onChange={(e) => setCfg({ ...cfg, codigo: e.target.value.toLowerCase(), codigoEditado: true })} />
                      <p className="text-xs text-muted-foreground">Gerado a partir do nome; ajuste só se necessário.</p></div>
                  </div>
                )}
                <div className="grid gap-1.5"><Label>Papel</Label>
                  <Select value={cfg.papel} onValueChange={(p) => setCfg({ ...cfg, papel: p as Papel, obrigatoria: p !== 'DISPONIVEL' ? true : cfg.obrigatoria })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(PAPEL_LABEL) as Papel[]).map((p) => <SelectItem key={p} value={p} disabled={p === 'DEPENDENTE' && !!dep}>{PAPEL_LABEL[p]}</SelectItem>)}</SelectContent></Select>
                  <p className="text-xs text-muted-foreground">{PAPEL_AJUDA[cfg.papel]}</p></div>
                {cfg.papel === 'INDEPENDENTE' && (
                  <div className="grid gap-1.5"><Label>Relação esperada com o valor</Label>
                    <Select value={cfg.relacao} onValueChange={(r) => setCfg({ ...cfg, relacao: r as Relacao })}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(RELACAO_LABEL) as Relacao[]).map((r) => <SelectItem key={r} value={r}>{RELACAO_LABEL[r]}</SelectItem>)}</SelectContent></Select></div>
                )}
                <label className="flex items-start gap-2 text-sm"><Checkbox checked={cfg.obrigatoria} onCheckedChange={(c) => setCfg({ ...cfg, obrigatoria: !!c })} />
                  <span>Obrigatória para a coleta<span className="block text-xs text-muted-foreground">Amostras sem este valor ficam incompletas e não entram no conjunto congelado.</span></span></label>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button variant="ghost" onClick={() => setCfg(null)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
                <div className="flex gap-2"><Button variant="outline" onClick={fechar}>Cancelar</Button><Button onClick={salvar} disabled={busy}>{busy ? 'Salvando…' : 'Adicionar'}</Button></div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {editar?.v.nome}</DialogTitle>
            <DialogDescription>{editar ? fonteLabel(editar.v) : ''}. Se a variável já foi usada, o impacto é mostrado antes de salvar.</DialogDescription>
          </DialogHeader>
          {editar && (
            <div className="grid gap-4">
              {editar.v.fonte === 'MANUAL' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5"><Label htmlFor="ev-nome">Nome</Label><Input id="ev-nome" value={editar.nome} maxLength={80} onChange={(e) => setEditar({ ...editar, nome: e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label htmlFor="ev-un">Unidade</Label><Input id="ev-un" value={editar.unidade} maxLength={20} onChange={(e) => setEditar({ ...editar, unidade: e.target.value })} /></div>
                </div>
              )}
              <div className="grid gap-1.5"><Label>Papel</Label>
                <Select value={editar.papel} onValueChange={(p) => setEditar({ ...editar, papel: p as Papel })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(PAPEL_LABEL) as Papel[]).map((p) => <SelectItem key={p} value={p} disabled={p === 'DEPENDENTE' && !!dep && dep.id !== editar.v.id}>{PAPEL_LABEL[p]}</SelectItem>)}</SelectContent></Select></div>
              {editar.papel === 'INDEPENDENTE' && (
                <div className="grid gap-1.5"><Label>Relação esperada</Label>
                  <Select value={editar.relacao} onValueChange={(r) => setEditar({ ...editar, relacao: r as Relacao })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(RELACAO_LABEL) as Relacao[]).map((r) => <SelectItem key={r} value={r}>{RELACAO_LABEL[r]}</SelectItem>)}</SelectContent></Select></div>
              )}
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={editar.obrigatoria} onCheckedChange={(c) => setEditar({ ...editar, obrigatoria: !!c })} />Obrigatória para a coleta</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button><Button onClick={revisar}>Revisar alterações</Button></DialogFooter>
          <ImpactDialog avaliacaoId={av.id} changes={changes} titulo={`Revisar alterações — ${editar?.v.nome ?? ''}`}
            onClose={() => setChanges(null)} onApplied={() => { setEditar(null); ctx.refresh(); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!remover} onOpenChange={(o) => !o && setRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {remover?.nome} da pesquisa?</AlertDialogTitle>
            <AlertDialogDescription>O campo deixa de aparecer no cadastro do avaliando e das amostras. Os valores já informados no cadastro do imóvel não são apagados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmarRemocao}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
