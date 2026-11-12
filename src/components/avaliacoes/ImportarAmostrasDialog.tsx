import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from './useAvaliacao';
import { useAvalQuery } from './useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime, fmtMoney, fmtNum, STATUS_LABEL, TIPO_LABEL } from '@/lib/avaliacao/labels';
import { avisoDadoRecente, type BancoRow, fmtData, rotuloEndereco, selecionaveis } from '@/lib/avaliacao/banco';

interface AvOrigem { id: string; codigo: string; tipo: string; status: string; municipio_nome: string; municipio_ibge: string | null; uf: string; tipo_imovel: string | null; created_at: string; avaliacao_amostras: { count: number }[] }

/** Reaproveita amostras de uma avaliação anterior da mesma organização: novo vínculo + foto própria, sem duplicar o cadastro. */
export function ImportarAmostrasDialog({ ctx, open, onOpenChange }: { ctx: AvaliacaoCtx; open: boolean; onOpenChange: (v: boolean) => void }) {
  const av = ctx.avaliacao.data!;
  const [mesmoMun, setMesmoMun] = useState(!!av.municipio_ibge);
  const [busca, setBusca] = useState('');
  const [origem, setOrigem] = useState<AvOrigem | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setOrigem(null); setSel(new Set()); } }, [open]);

  const lista = useAvalQuery(av.id, 'importar:avaliacoes', async () => {
    const { data, error } = await db.from('avaliacoes')
      .select('id, codigo, tipo, status, municipio_nome, municipio_ibge, uf, tipo_imovel, created_at, avaliacao_amostras(count)')
      .eq('organization_id', av.organization_id).neq('id', av.id).neq('status', 'CANCELADA').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return data as AvOrigem[];
  }, open);
  const avaliacoes = useMemo(() => (lista.data ?? []).filter((a) => (!mesmoMun || a.municipio_ibge === av.municipio_ibge)
    && (!busca.trim() || `${a.codigo} ${a.municipio_nome} ${a.tipo_imovel ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))), [lista.data, mesmoMun, busca, av.municipio_ibge]);

  const amostras = useAvalQuery(av.id, `importar:amostras:${origem?.id}`, async () =>
    rpc<{ total: number; rows: BancoRow[] }>('aval_banco_buscar', { p_avaliacao: av.id, p_filtros: { avaliacao_origem: origem!.id }, p_limit: 200, p_offset: 0 }), open && !!origem);
  const rows = amostras.data?.rows ?? [];
  const total = amostras.data?.total ?? 0;
  const disponiveis = selecionaveis(rows).map((dado) => rows.find((r) => r.dado_id === dado)!.amostra_origem_id!);
  const todas = disponiveis.length > 0 && disponiveis.every((id) => sel.has(id));
  const toggle = (id: string, v: boolean) => setSel((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });

  const importar = async () => {
    if (!origem || !sel.size) return;
    setBusy(true);
    try {
      const tudo = todas && total <= rows.length;
      const r = await rpc<{ importadas: number; ja_existentes: number; valores_variaveis: number; variaveis_sem_permissao: boolean }>('aval_amostras_importar',
        { p_avaliacao: av.id, p_origem: origem.id, p_amostras: tudo ? null : [...sel] });
      const partes = [`${r.importadas} amostra(s) importada(s) de ${origem.codigo}`];
      if (r.ja_existentes) partes.push(`${r.ja_existentes} já estava(m) nesta avaliação`);
      if (r.valores_variaveis) partes.push(`${r.valores_variaveis} valor(es) de variáveis digitadas copiados`);
      toast.success(`${partes.join(' · ')}. Nenhum imóvel foi duplicado.`);
      if (r.variaveis_sem_permissao) toast.info('Valores digitados das variáveis não foram copiados: seu papel não permite editar variáveis.');
      ctx.refresh(); onOpenChange(false);
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5" aria-hidden />Importar amostras de outra avaliação</DialogTitle>
          <DialogDescription>
            {origem ? `Amostras usadas em ${origem.codigo} (${origem.municipio_nome}/${origem.uf}). Os imóveis são reaproveitados; esta avaliação guarda uma foto própria dos dados no momento da importação.`
              : 'Escolha uma avaliação anterior da sua organização para reaproveitar as amostras.'}
          </DialogDescription>
        </DialogHeader>

        {!origem ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5 flex-1 min-w-[220px]"><Label htmlFor="ia-busca">Buscar avaliação</Label>
                <Input id="ia-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número, município, tipo de imóvel…" maxLength={80} /></div>
              {av.municipio_ibge && <div className="flex items-center gap-2 pb-2"><Switch id="ia-mun" checked={mesmoMun} onCheckedChange={setMesmoMun} />
                <Label htmlFor="ia-mun" className="font-normal">Só de {av.municipio_nome}/{av.uf}</Label></div>}
            </div>
            <div className="overflow-x-auto rounded-md border">
              {lista.isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : avaliacoes.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhuma avaliação encontrada{mesmoMun ? ` em ${av.municipio_nome}` : ''}. {mesmoMun ? 'Desligue o filtro de município para ver as demais.' : ''}</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Avaliação</TableHead><TableHead>Município</TableHead><TableHead>Tipo</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Amostras</TableHead><TableHead className="w-24"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
                  <TableBody>{avaliacoes.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><p className="font-medium">{a.codigo}</p><p className="text-xs text-muted-foreground">{a.tipo_imovel ?? ''} · criada em {fmtDateTime(a.created_at)}</p></TableCell>
                      <TableCell>{a.municipio_nome}/{a.uf}</TableCell>
                      <TableCell>{TIPO_LABEL[a.tipo] ?? a.tipo}</TableCell>
                      <TableCell><Badge variant="outline">{STATUS_LABEL[a.status] ?? a.status}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{a.avaliacao_amostras?.[0]?.count ?? 0}</TableCell>
                      <TableCell><Button size="sm" variant="outline" disabled={!(a.avaliacao_amostras?.[0]?.count)} onClick={() => { setOrigem(a); setSel(new Set()); }}>Ver amostras</Button></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOrigem(null)}><ArrowLeft className="h-4 w-4 mr-1" aria-hidden />Outra avaliação</Button>
              <div className="flex items-center gap-2">
                <Checkbox id="ia-todas" checked={todas} disabled={!disponiveis.length} onCheckedChange={(v) => setSel(v ? new Set(disponiveis) : new Set())} />
                <Label htmlFor="ia-todas" className="font-normal">Selecionar todas ({disponiveis.length})</Label>
              </div>
            </div>
            {total > rows.length && <p className="text-xs text-muted-foreground">Mostrando as primeiras {rows.length} de {total} amostras.</p>}
            <div className="overflow-x-auto rounded-md border">
              {amostras.isError ? <p className="p-6 text-sm text-destructive">{avalErrorMessage(amostras.error)}</p>
                : amostras.isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando amostras…</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-10"><span className="sr-only">Selecionar</span></TableHead><TableHead className="w-10">Nº</TableHead><TableHead>Imóvel</TableHead>
                    <TableHead className="text-right">Valor naquela avaliação</TableHead><TableHead className="text-right">Área (m²)</TableHead><TableHead>Uso na origem</TableHead><TableHead>Avisos</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{rows.map((r, i) => {
                    const id = r.amostra_origem_id!; const recente = avisoDadoRecente(r);
                    return (
                      <TableRow key={id} data-state={sel.has(id) ? 'selected' : undefined}>
                        <TableCell><Checkbox aria-label={`Selecionar amostra ${i + 1}`} checked={r.ja_na_avaliacao || sel.has(id)} disabled={r.ja_na_avaliacao} onCheckedChange={(v) => toggle(id, !!v)} /></TableCell>
                        <TableCell className="tabular-nums">{i + 1}</TableCell>
                        <TableCell className="min-w-[220px]"><p className="font-medium">{rotuloEndereco(r)}</p><p className="text-xs text-muted-foreground">{[r.bairro, r.tipo_imovel, `pesquisa em ${fmtData(r.origem_data ?? r.data_observacao)}`].filter(Boolean).join(' · ')}</p></TableCell>
                        <TableCell className="text-right tabular-nums">{fmtMoney(r.origem_valor_utilizado ?? r.valor_utilizado)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtNum(r.origem_area ?? r.area_construida)}</TableCell>
                        <TableCell className="text-xs">{r.origem_selecionada === false ? 'Não usada' : r.origem_habilitada === false ? 'Usada, fora do modelo' : 'Usada no modelo'}</TableCell>
                        <TableCell className="text-xs space-y-1 min-w-[200px]">
                          {r.ja_na_avaliacao && <Badge variant="secondary">Já nesta avaliação</Badge>}
                          {r.divergente && <p className="flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" aria-hidden />Cadastro alterado depois daquela avaliação; hoje: {fmtMoney(r.valor_utilizado)} · {fmtNum(r.area_construida)} m². A importação usa os dados atuais.</p>}
                          {recente && <p className="flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" aria-hidden />{recente}</p>}
                        </TableCell>
                      </TableRow>
                    );
                  })}</TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">{origem ? `${sel.size} selecionada(s)` : ''}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            {origem && <Button onClick={importar} disabled={!sel.size || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />}Importar para esta avaliação</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
