import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Info, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from './useAvaliacao';
import { useAvalQuery } from './useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtMoney, fmtNum } from '@/lib/avaliacao/labels';
import {
  avisoDadoRecente, type BancoFiltros, type BancoRow, filtrosIniciais, filtrosParaServidor, fmtData, rotuloEndereco, selecionaveis,
  SITUACAO_LABEL, TIPO_NEGOCIO_LABEL,
} from '@/lib/avaliacao/banco';

const PAGE = 50;
const TODOS = '__todos__';
const FONTE: Record<string, string> = { IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor', PROPRIETARIO: 'Proprietário', PORTAL: 'Portal', ORGAO_PUBLICO: 'Órgão público', REDE_SOCIAL: 'Rede social', PLACA: 'Placa', OUTRO: 'Outro' };

/** Busca no banco de imóveis/dados de mercado da organização e inclusão em lote na avaliação (sem copiar o cadastro). */
export function BancoImoveisDialog({ ctx, open, onOpenChange, onNovoDado }: {
  ctx: AvaliacaoCtx; open: boolean; onOpenChange: (v: boolean) => void; onNovoDado: (row: BancoRow) => void;
}) {
  const av = ctx.avaliacao.data!;
  const [rascunho, setRascunho] = useState<BancoFiltros>(() => filtrosIniciais(av));
  const [filtros, setFiltros] = useState<BancoFiltros>(() => filtrosIniciais(av));
  const [abrangencia, setAbrangencia] = useState<'MUN' | 'UF' | 'TODOS'>(av.municipio_ibge ? 'MUN' : 'UF');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const canSel = ctx.can('market.select_samples');
  const canEdit = ctx.can('market.edit');

  useEffect(() => { if (open) { setSel(new Set()); setPage(0); } }, [open]);

  const servidor = useMemo(() => {
    const f = { ...filtros, municipio_ibge: abrangencia === 'MUN' ? (av.municipio_ibge ?? '') : '', uf: abrangencia === 'UF' ? (av.uf ?? '') : '' };
    return filtrosParaServidor(f);
  }, [filtros, abrangencia, av.municipio_ibge, av.uf]);

  const q = useAvalQuery(av.id, `banco:${JSON.stringify(servidor)}:${page}`, async () =>
    rpc<{ total: number; rows: BancoRow[] }>('aval_banco_buscar', { p_avaliacao: av.id, p_filtros: servidor, p_limit: PAGE, p_offset: page * PAGE }), open);
  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const paginaSel = selecionaveis(rows);
  const todosMarcados = paginaSel.length > 0 && paginaSel.every((id) => sel.has(id));

  const aplicar = () => { setFiltros(rascunho); setPage(0); };
  const limpar = () => { const f = filtrosIniciais(av); setRascunho(f); setFiltros(f); setAbrangencia(av.municipio_ibge ? 'MUN' : 'UF'); setPage(0); };
  const toggle = (id: string, v: boolean) => setSel((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });
  const toggleTodos = (v: boolean) => setSel((s) => { const n = new Set(s); paginaSel.forEach((id) => (v ? n.add(id) : n.delete(id))); return n; });

  const adicionar = async () => {
    if (!sel.size) return;
    setBusy(true);
    try {
      const r = await rpc<{ adicionadas: number; ja_existentes: number }>('aval_amostras_adicionar', { p_avaliacao: av.id, p_dados: [...sel] });
      toast.success(`${r.adicionadas} amostra(s) adicionada(s) à avaliação${r.ja_existentes ? ` · ${r.ja_existentes} já estava(m) incluída(s)` : ''}. Nenhum cadastro foi duplicado.`);
      setSel(new Set()); ctx.refresh(); onOpenChange(false);
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };
  const mudarSituacao = async (row: BancoRow, status: string) => {
    const { error } = await db.from('dados_mercado').update({ status }).eq('id', row.dado_id);
    if (error) toast.error(avalErrorMessage(error)); else { toast.success('Situação do dado atualizada.'); q.refetch(); }
  };
  const set = (k: keyof BancoFiltros) => (e: React.ChangeEvent<HTMLInputElement>) => setRascunho({ ...rascunho, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5" aria-hidden />Buscar imóveis existentes</DialogTitle>
          <DialogDescription>Banco de imóveis e dados de mercado da sua organização. Ao adicionar, o imóvel não é copiado: a avaliação passa a usá-lo e guarda uma foto dos dados deste momento.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-3 rounded-md border p-3 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); aplicar(); }}>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="bi-abr">Município/UF</Label>
            <Select value={abrangencia} onValueChange={(v) => { setAbrangencia(v as typeof abrangencia); setPage(0); }}>
              <SelectTrigger id="bi-abr"><SelectValue /></SelectTrigger>
              <SelectContent>
                {av.municipio_ibge && <SelectItem value="MUN">{av.municipio_nome}/{av.uf} (desta avaliação)</SelectItem>}
                <SelectItem value="UF">Todo o estado ({av.uf})</SelectItem>
                <SelectItem value="TODOS">Todos os municípios</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="bi-q">Busca</Label>
            <Input id="bi-q" value={rascunho.q} onChange={set('q')} placeholder="Endereço, bairro, anúncio, descrição…" maxLength={120} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-fin">Finalidade</Label>
            <Select value={rascunho.tipo_negocio || TODOS} onValueChange={(v) => setRascunho({ ...rascunho, tipo_negocio: v === TODOS ? '' : v })}>
              <SelectTrigger id="bi-fin"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{Object.entries(TIPO_NEGOCIO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-sit">Situação</Label>
            <Select value={rascunho.status || TODOS} onValueChange={(v) => setRascunho({ ...rascunho, status: v === TODOS ? '' : v })}>
              <SelectTrigger id="bi-sit"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{Object.entries(SITUACAO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="bi-tipo">Tipologia</Label><Input id="bi-tipo" value={rascunho.tipo_imovel} onChange={set('tipo_imovel')} placeholder="Casa, sala comercial…" maxLength={80} /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="bi-bairro">Bairro</Label><Input id="bi-bairro" value={rascunho.bairro} onChange={set('bairro')} maxLength={80} /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="bi-fonte">Fonte</Label>
            <Select value={rascunho.fonte || TODOS} onValueChange={(v) => setRascunho({ ...rascunho, fonte: v === TODOS ? '' : v })}>
              <SelectTrigger id="bi-fonte"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{Object.entries(FONTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-amin">Área de (m²)</Label><Input id="bi-amin" inputMode="decimal" value={rascunho.area_min} onChange={set('area_min')} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-amax">até (m²)</Label><Input id="bi-amax" inputMode="decimal" value={rascunho.area_max} onChange={set('area_max')} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-dde">Pesquisa de</Label><Input id="bi-dde" type="date" value={rascunho.data_de} onChange={set('data_de')} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bi-date">até</Label><Input id="bi-date" type="date" value={rascunho.data_ate} onChange={set('data_ate')} /></div>
          <div className="flex items-center gap-2 sm:col-span-2 sm:self-end sm:pb-2">
            <Switch id="bi-rec" checked={rascunho.somente_recentes} onCheckedChange={(v) => setRascunho({ ...rascunho, somente_recentes: v })} />
            <Label htmlFor="bi-rec" className="font-normal">Só o dado mais recente de cada imóvel</Label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-6">
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>Limpar filtros</Button>
            <Button type="submit" size="sm"><Search className="h-4 w-4 mr-1" aria-hidden />Buscar</Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground" role="status">{q.isFetching ? 'Buscando…' : `${total} registro(s) encontrado(s)`}</p>
          {total > PAGE && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="tabular-nums">{page + 1} / {Math.ceil(total / PAGE)}</span>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          {q.isError ? <p className="p-6 text-sm text-destructive">{avalErrorMessage(q.error)}</p>
            : rows.length === 0 && !q.isFetching ? <p className="p-6 text-sm text-muted-foreground">Nenhum imóvel encontrado com estes filtros. Amplie o município/UF ou limpe os filtros.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10">{canSel && <Checkbox aria-label="Selecionar todos desta página" checked={todosMarcados} disabled={!paginaSel.length} onCheckedChange={(v) => toggleTodos(!!v)} />}</TableHead>
                <TableHead>Imóvel</TableHead><TableHead>Dado de mercado a usar</TableHead><TableHead className="text-right">Área (m²)</TableHead>
                <TableHead>Situação</TableHead><TableHead>Avisos</TableHead>{canEdit && <TableHead className="w-28"><span className="sr-only">Ações</span></TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const recente = avisoDadoRecente(r);
                  return (
                    <TableRow key={r.dado_id} data-state={sel.has(r.dado_id) ? 'selected' : undefined}>
                      <TableCell>{canSel && <Checkbox aria-label={`Selecionar ${rotuloEndereco(r)}`} checked={r.ja_na_avaliacao || sel.has(r.dado_id)} disabled={r.ja_na_avaliacao} onCheckedChange={(v) => toggle(r.dado_id, !!v)} />}</TableCell>
                      <TableCell className="min-w-[220px]">
                        <p className="font-medium">{rotuloEndereco(r)}</p>
                        <p className="text-xs text-muted-foreground">{[r.bairro, r.municipio_nome && `${r.municipio_nome}/${r.uf ?? ''}`, r.tipo_imovel].filter(Boolean).join(' · ')}</p>
                        {r.atributos.length > 0 && <p className="text-xs text-muted-foreground">{r.atributos.slice(0, 4).map((a) => `${a.nome}: ${a.valor}${a.unidade && a.unidade !== 'un' ? ` ${a.unidade}` : ''}`).join(' · ')}</p>}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <p className="tabular-nums"><span className="font-medium">{fmtMoney(r.valor_utilizado)}</span>{r.periodicidade === 'MENSAL' ? '/mês' : ''} · {TIPO_NEGOCIO_LABEL[r.tipo_negocio] ?? r.tipo_negocio}</p>
                        <p className="text-xs text-muted-foreground">Pesquisa em {fmtData(r.data_observacao)}{r.fonte ? ` · ${r.fonte.nome}` : ''}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.area_construida)}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select value={r.status} onValueChange={(v) => mudarSituacao(r, v)}>
                            <SelectTrigger className="h-8 w-[140px]" aria-label="Situação do dado"><SelectValue /></SelectTrigger>
                            <SelectContent>{['ATIVO', 'INATIVO', 'DESATUALIZADO'].map((k) => <SelectItem key={k} value={k}>{SITUACAO_LABEL[k]}</SelectItem>)}{r.status === 'DESCARTADO' && <SelectItem value="DESCARTADO">Descartado</SelectItem>}</SelectContent>
                          </Select>
                        ) : <Badge variant={r.status === 'ATIVO' ? 'outline' : 'secondary'}>{SITUACAO_LABEL[r.status] ?? r.status}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs space-y-1 min-w-[180px]">
                        {r.ja_na_avaliacao && <Badge variant="secondary">Já nesta avaliação</Badge>}
                        {recente && <p className="flex items-start gap-1 text-foreground"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" aria-hidden />{recente}</p>}
                        {r.imovel_na_avaliacao && <p className="flex items-start gap-1"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />Outro dado deste imóvel já está nesta avaliação.</p>}
                        {!r.mais_recente || r.dados_do_imovel <= 1 ? null : <p className="text-muted-foreground">{r.dados_do_imovel} dados de mercado deste imóvel</p>}
                        {r.avaliacoes_uso > 0 && <p className="text-muted-foreground">Usado em {r.avaliacoes_uso} avaliação(ões)</p>}
                      </TableCell>
                      {canEdit && <TableCell><Button size="sm" variant="ghost" onClick={() => onNovoDado(r)} title="Registrar um novo valor/data para este mesmo imóvel"><Plus className="h-4 w-4 mr-1" aria-hidden />Novo dado</Button></TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">{sel.size} selecionado(s)</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            {canSel && <Button onClick={adicionar} disabled={!sel.size || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />}Adicionar à avaliação</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
