import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Database, History, Info, Link2Off, Loader2, Lock, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { EditAmostraDialog } from '../EditAmostraDialog';
import { BancoImoveisDialog } from '../BancoImoveisDialog';
import { ImportarAmostrasDialog } from '../ImportarAmostrasDialog';
import { CamposDinamicosSection, CompletudeTable, useVariaveisStatus } from '../VariaveisShared';
import { ComparavelAviso, DuplicatePanel, emptyImovel, ImovelFields, type ImovelInput, useImovelCreator } from '../ImovelForm';
import { MunicipioCombobox } from '@/components/MunicipioCombobox';
import { UFS } from '@/lib/ufs';
import { municipioSugerido, origemAposTrocaMunicipio, origemPorMunicipio } from '@/lib/avaliacao/municipioImovel';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorCode, avalErrorMessage } from '@/lib/avaliacao/errors';
import { alteracoesDinamicas, bloqueiosCongelamento, bloqueiosDoServidor, camposDinamicos, mensagemCongelamento, nomesFaltando, obrigatoriasVazias } from '@/lib/avaliacao/variaveis';
import { fmtDateTime, fmtMoney, fmtNum } from '@/lib/avaliacao/labels';
import { type AmostraHistorica, complementosHistorica, lerAmostraHistorica, podeDesmarcar, TEXTO_HISTORICA, TEXTO_REMOVER, TITULO_REMOVER } from '@/lib/avaliacao/removerAmostra';
import { type BancoRow, exibicaoAmostra, type Foto, ORIGEM_INCLUSAO_LABEL, rotuloEndereco, SITUACAO_LABEL, TIPO_NEGOCIO_LABEL } from '@/lib/avaliacao/banco';

const NATUREZA: Record<string, string> = { OFERTA: 'Oferta', NEGOCIACAO: 'Negociação', CONTRATO_PRIVADO: 'Contrato privado', CONTRATO_PUBLICO: 'Contrato público', OUTRO: 'Outro' };
const FONTE: Record<string, string> = { IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor', PROPRIETARIO: 'Proprietário', PORTAL: 'Portal', ORGAO_PUBLICO: 'Órgão público', REDE_SOCIAL: 'Rede social', PLACA: 'Placa', OUTRO: 'Outro' };
const CONJ: Record<string, string> = { RASCUNHO: 'Rascunho', CONGELADO: 'Congelado (vigente)', SUPERADO: 'Superado', EM_USO: 'Em uso' };
const num = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

export function MercadoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [add, setAdd] = useState(false);
  const [im, setIm] = useState<ImovelInput>(emptyImovel(av.tipo_imovel, municipioSugerido(av)));
  const [dado, setDado] = useState({ natureza: 'OFERTA', negocio: 'LOCACAO', situacao: 'ATIVO', obs: '', ofertado: '', utilizado: '', data: '', fonteTipo: 'IMOBILIARIA', fonteNome: '', origem: 'LOCAL' });
  const [imovelFixo, setImovelFixo] = useState<BancoRow | null>(null);
  const [banco, setBanco] = useState(false);
  const [importar, setImportar] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [editar, setEditar] = useState<{ amostra: any; indice: number } | null>(null);
  const [remover, setRemover] = useState<{ amostra: any; indice: number; historica: AmostraHistorica | null } | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [mun, setMun] = useState<{ nome: string; uf: string; ibge: string; just: string; noCadastro?: boolean } | null>(null);
  const creator = useImovelCreator();
  const [dynNovo, setDynNovo] = useState<Record<string, string>>({});
  const status = useVariaveisStatus(av.id);
  const st = status.data;
  const campos = camposDinamicos(st, 'AMOSTRA');
  const stAmostra = new Map((st?.amostras ?? []).map((x) => [x.amostra_id, x]));
  const bloqueios = bloqueiosCongelamento(st);

  const q = useAvalQuery(av.id, 'mercado', async () => {
    const [am, cj, mc, sn] = await Promise.all([
      db.from('avaliacao_amostras').select('*, dados_mercado(*, imoveis(*), dados_mercado_fontes(principal, fontes_mercado(id, tipo, nome)))').eq('avaliacao_id', av.id).order('created_at').limit(10000),
      db.from('avaliacao_conjuntos_dados').select('*').eq('avaliacao_id', av.id).order('versao', { ascending: false }),
      db.from('avaliacao_municipios_comparaveis').select('*').eq('avaliacao_id', av.id).order('created_at'),
      db.from('avaliacao_amostra_snapshots').select('amostra_id, dados, avaliacao_conjuntos_dados!inner(status, versao)').eq('avaliacao_id', av.id)
        .in('avaliacao_conjuntos_dados.status', ['CONGELADO', 'EM_USO']).limit(10000),
    ]);
    if (am.error) throw am.error;
    // Foto usada pelo conjunto vigente (a versão mais recente congelada/em uso) para cada amostra.
    const fotos = new Map<string, { versao: number; dados: Foto }>();
    for (const x of (sn.data ?? []) as any[]) {
      const v = x.avaliacao_conjuntos_dados?.versao ?? 0; const cur = fotos.get(x.amostra_id);
      if (!cur || v > cur.versao) fotos.set(x.amostra_id, { versao: v, dados: x.dados });
    }
    return { amostras: am.data as any[], conjuntos: (cj.data ?? []) as any[], municipios: (mc.data ?? []) as any[], fotos };
  });
  // Incluir amostra (novo, banco, importação) é editar a pesquisa; marcar Usar/No modelo e congelar são decisões do RT.
  const canEdit = ctx.can('market.edit');
  const canSel = ctx.can('market.select_samples');
  const amostras = q.data?.amostras ?? [];
  const vigente = (q.data?.conjuntos ?? []).find((c) => c.status === 'CONGELADO');

  const concluida = av.status !== 'ATIVA';
  const abrirNovo = (fixo: BancoRow | null) => {
    setImovelFixo(fixo); creator.setDups(null); setDynNovo({}); setMun(null);
    // Origem territorial pelo município do imóvel (existente: o do cadastro; novo: o escolhido no formulário).
    const ibge = fixo ? fixo.municipio_ibge : im.municipio_ibge;
    setDado((d) => ({ ...d, origem: origemAposTrocaMunicipio(d.origem, av.municipio_ibge, ibge),
      ...(fixo ? { negocio: fixo.tipo_negocio || 'LOCACAO', ofertado: '', utilizado: '', data: '', obs: '' } : {}) }));
    setBanco(false); setAdd(true);
  };
  const salvar = async (decision?: { useExisting?: string; forceNew?: boolean }) => {
    const valorUt = num(dado.utilizado) ?? num(dado.ofertado);
    if (!valorUt || valorUt <= 0) { toast.error('Informe o valor do dado de mercado.'); return; }
    const pre = alteracoesDinamicas(campos, {}, dynNovo, { imovel_id: 'novo' });
    if (pre.invalidos.length) { toast.error(`Revise: ${pre.invalidos.join(', ')}.`); return; }
    const imovelId = imovelFixo ? imovelFixo.imovel_id : await creator.resolve(im, decision);
    if (!imovelId) return;
    try {
      const area = imovelFixo ? imovelFixo.area_construida : num(im.area_construida);
      const { data: d, error } = await db.from('dados_mercado').insert({
        imovel_id: imovelId, natureza_dado: dado.natureza, tipo_negocio: dado.negocio, periodicidade: dado.negocio === 'VENDA' ? 'UNICO' : 'MENSAL',
        status: dado.situacao, descricao: dado.obs.trim() || null, valor_ofertado: num(dado.ofertado), valor_utilizado: valorUt,
        valor_unitario: area ? Math.round((valorUt / area) * 10000) / 10000 : null, data_observacao: dado.data || null,
        url_anuncio: imovelFixo ? null : im.anuncio_url.trim() || null, anuncio_id: imovelFixo ? null : im.anuncio_id.trim() || null,
      }).select('id').single();
      if (error) throw error;
      if (dado.fonteNome.trim()) {
        const { data: f, error: fe } = await db.from('fontes_mercado').insert({ tipo: dado.fonteTipo, nome: dado.fonteNome.trim() }).select('id').single();
        if (fe) throw fe;
        await db.from('dados_mercado_fontes').insert({ dado_id: d.id, fonte_id: f.id, principal: true });
      }
      const { data: a, error: ae } = await db.from('avaliacao_amostras').insert({ avaliacao_id: av.id, dado_id: d.id, origem_territorial: dado.origem }).select('id').single();
      if (ae) throw ae;
      // Variáveis desta avaliação: cada valor vai para a sua fonte (característica do imóvel ou valor manual).
      const { alteracoes } = alteracoesDinamicas(campos, {}, dynNovo, { imovel_id: imovelId, dado_id: d.id, amostra_id: a.id, modo: 'COMPARTILHADO' });
      let aviso = false;
      if (alteracoes.length) {
        try { await rpc('aval_apply_changes', { p_avaliacao: av.id, p_changes: alteracoes, p_motivo: 'Cadastro da amostra' }); }
        catch (e) { aviso = true; toast.warning(`Dado incluído, mas as variáveis não foram salvas: ${avalErrorMessage(e)} Use Editar amostra para completar.`); }
      }
      if (!aviso) toast.success('Dado de mercado incluído.');
      setAdd(false); setImovelFixo(null); setIm(emptyImovel(av.tipo_imovel, municipioSugerido(av))); setDado({ ...dado, origem: 'LOCAL', ofertado: '', utilizado: '', fonteNome: '', obs: '' }); setDynNovo({}); setMun(null);
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
    } catch (e) {
      const srv = avalErrorCode(e) === 'dataset_incomplete' ? bloqueiosDoServidor((e as { details?: unknown })?.details) : [];
      toast.error(srv.length ? mensagemCongelamento(srv) : avalErrorMessage(e));
      ctx.refresh();
    }
  };
  // Remover desfaz só o vínculo (RPC central); amostra já congelada é histórica e a tela orienta desmarcar + nova versão.
  const abrirRemover = (a: any, indice: number) => {
    const congelada = q.data?.fotos.has(a.id);
    setRemover({ amostra: a, indice, historica: congelada ? { motivos: ['CONJUNTO_CONGELADO'], selecionada: !!a.selecionada, habilitada_modelo: !!a.habilitada_modelo } : null });
  };
  const confirmarRemover = async () => {
    if (!remover) return;
    setRemovendo(true);
    try {
      await rpc('aval_amostra_remover', { p_avaliacao: av.id, p_amostra: remover.amostra.id });
      toast.success('Amostra removida da avaliação. O imóvel e o dado de mercado continuam no Banco de Imóveis.');
      setRemover(null); ctx.refresh();
    } catch (e) {
      const h = avalErrorCode(e) === 'amostra_historica' ? lerAmostraHistorica((e as { details?: unknown })?.details) : null;
      if (h) setRemover({ ...remover, historica: h }); else toast.error(avalErrorMessage(e));
    } finally { setRemovendo(false); }
  };
  const desmarcarParaNovaVersao = async () => {
    if (!remover) return;
    setRemovendo(true);
    const { error } = await db.from('avaliacao_amostras').update({ selecionada: false, habilitada_modelo: false }).eq('id', remover.amostra.id);
    setRemovendo(false);
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Amostra desmarcada. Congele uma nova versão do conjunto para que as próximas análises deixem de usá-la.');
    setRemover(null); ctx.refresh();
  };
  const salvarMun = async () => {
    if (!mun || !mun.ibge || !mun.nome.trim() || mun.just.trim().length < 10) { toast.error('Escolha o município e escreva uma justificativa (mínimo 10 caracteres).'); return; }
    const { error } = await db.from('avaliacao_municipios_comparaveis').insert({ avaliacao_id: av.id, uf: mun.uf, municipio_nome: mun.nome.trim(), municipio_ibge: mun.ibge, justificativa: mun.just.trim(), status: 'SUGERIDO' });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Município sugerido; aguarda decisão do responsável técnico.');
    setMun(null); ctx.refresh();
  };
  const comparaveis = (q.data?.municipios ?? []) as { municipio_ibge: string | null; municipio_nome: string; uf: string; status: string }[];
  const mudarImovel = (v: ImovelInput) => {
    if (v.municipio_ibge !== im.municipio_ibge) setDado((d) => ({ ...d, origem: origemAposTrocaMunicipio(d.origem, av.municipio_ibge, v.municipio_ibge) }));
    setIm(v);
  };
  const munNovo = imovelFixo ? { uf: imovelFixo.uf ?? '', municipio_ibge: imovelFixo.municipio_ibge ?? '', municipio_nome: imovelFixo.municipio_nome ?? '' } : im;
  const decidirMun = async (m: any, status: 'APROVADO' | 'REJEITADO') => {
    const { error } = await db.from('avaliacao_municipios_comparaveis').update({ status, decidido_em: new Date().toISOString() }).eq('id', m.id);
    if (error) toast.error(avalErrorMessage(error)); else ctx.refresh();
  };

  return (
    <div className="space-y-5">
      {st && campos.length > 0 && amostras.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Completude das variáveis</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto"><CompletudeTable st={st} /></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle className="text-base">Amostras de mercado ({amostras.filter((a) => a.selecionada).length} selecionadas)</CardTitle>
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button size="sm" variant="outline" onClick={() => abrirNovo(null)}><Plus className="h-4 w-4 mr-1" aria-hidden />Cadastrar novo imóvel</Button>}
            {canEdit && <Button size="sm" variant="outline" onClick={() => setBanco(true)}><Database className="h-4 w-4 mr-1" aria-hidden />Buscar imóveis existentes</Button>}
            {canEdit && <Button size="sm" variant="outline" onClick={() => setImportar(true)}><Copy className="h-4 w-4 mr-1" aria-hidden />Importar amostras de outra avaliação</Button>}
            {canSel && <Button size="sm" onClick={() => setFreeze(true)} disabled={!amostras.some((a) => a.selecionada)}><Lock className="h-4 w-4 mr-1" aria-hidden />Congelar conjunto</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {canEdit && !canSel && !concluida && <p className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 shrink-0" aria-hidden />Você pode incluir e corrigir amostras. Marcar “Usar” e “No modelo” e congelar o conjunto cabem ao responsável técnico.</p>}
          {concluida && amostras.length > 0 && <p className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground"><History className="h-3.5 w-3.5" aria-hidden />Avaliação concluída: os valores abaixo são a foto dos dados usados no laudo, mesmo que o cadastro tenha mudado depois.</p>}
          {amostras.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum dado de mercado incluído. Cadastre um imóvel, busque no banco da organização ou importe amostras de outra avaliação.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-12">Usar</TableHead><TableHead className="w-16">No modelo</TableHead><TableHead>Imóvel</TableHead>
                <TableHead>Natureza</TableHead><TableHead className="text-right">Área (m²)</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">R$/m²</TableHead>
                {campos.length > 0 && <TableHead>Variáveis</TableHead>}
                {canEdit && <TableHead className="w-20"><span className="sr-only">Ações</span></TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {amostras.map((a, i) => {
                  const ex = exibicaoAmostra(a, q.data?.fotos.get(a.id)?.dados, concluida);
                  const d = ex.dado as any; const imv = ex.imovel as any;
                  return (
                    <TableRow key={a.id}>
                      <TableCell><Checkbox aria-label={`Selecionar amostra ${i + 1}`} checked={a.selecionada} disabled={!canSel} onCheckedChange={(v) => toggle(a, 'selecionada', !!v)} /></TableCell>
                      <TableCell><Checkbox aria-label={`Habilitar no modelo amostra ${i + 1}`} checked={a.habilitada_modelo} disabled={!canSel} onCheckedChange={(v) => toggle(a, 'habilitada_modelo', !!v)} /></TableCell>
                      <TableCell className="min-w-[220px]">
                        <p className="font-medium">{i + 1}. {rotuloEndereco(imv ?? {})}</p>
                        <p className="text-xs text-muted-foreground">{[imv?.bairro, imv?.municipio_nome ? `${imv.municipio_nome}/${imv.uf ?? ''}` : null, a.origem_territorial !== 'LOCAL' ? 'fora do município' : null, d?.tipo_negocio === 'VENDA' ? TIPO_NEGOCIO_LABEL.VENDA : null,
                          d?.status && d.status !== 'ATIVO' ? SITUACAO_LABEL[d.status] : null].filter(Boolean).join(' · ')}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.origem_inclusao && a.origem_inclusao !== 'CADASTRO_NOVO' && <Badge variant="outline" className="text-[11px] font-normal">{ORIGEM_INCLUSAO_LABEL[a.origem_inclusao]}</Badge>}
                          {ex.alterados.length > 0 && <Badge variant="secondary" className="text-[11px] font-normal" title={`Mudou: ${ex.alterados.join(', ')}`}>
                            Cadastro alterado desde {ex.comparadoCom === 'CONJUNTO' ? 'o congelamento' : 'a inclusão'}: {ex.alterados.join(', ')}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{NATUREZA[d?.natureza_dado]}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(imv?.area_construida)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(d?.valor_utilizado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(d?.valor_unitario)}</TableCell>
                      {campos.length > 0 && <TableCell className="text-xs">{(() => {
                        const sa = stAmostra.get(a.id);
                        if (!sa) return '—';
                        if (sa.completa) return <span className="inline-flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />Completa</span>;
                        return (
                          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="inline-flex items-center gap-1 font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />Falta {nomesFaltando(st!, sa.faltando).join(', ')}</span>
                            {canEdit && <button type="button" className="underline underline-offset-2" onClick={() => setEditar({ amostra: a, indice: i + 1 })}>Corrigir amostra</button>}
                          </span>
                        );
                      })()}</TableCell>}
                      {canEdit && <TableCell><div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Editar amostra ${i + 1}`} title="Editar amostra" onClick={() => setEditar({ amostra: a, indice: i + 1 })}><Pencil className="h-4 w-4" /></Button>
                        {!concluida && <Button size="icon" variant="ghost" aria-label={`Remover amostra ${i + 1} da avaliação`} title="Remover da avaliação" onClick={() => abrirRemover(a, i + 1)}><Link2Off className="h-4 w-4" /></Button>}
                      </div></TableCell>}
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
            {canEdit && <Button size="sm" variant="outline" onClick={() => setMun({ nome: '', uf: av.uf, ibge: '', just: '' })}><Plus className="h-4 w-4 mr-1" />Sugerir</Button>}
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="text-muted-foreground">Usar dados de outro município exige justificativa e decisão do responsável técnico.</p>
            {mun && !mun.noCadastro && (
              <div className="grid gap-2 rounded-md border p-3">
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <Select value={mun.uf || undefined} onValueChange={(uf) => setMun({ ...mun, uf, ibge: '', nome: '' })}><SelectTrigger aria-label="UF do município comparável"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{UFS.map((u) => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla}</SelectItem>)}</SelectContent></Select>
                  <MunicipioCombobox uf={mun.uf} value={mun.ibge} savedName={mun.nome} onChange={(m) => setMun({ ...mun, ibge: m.ibge, nome: m.nome })} />
                </div>
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
            <DialogTitle>{imovelFixo ? 'Novo dado de mercado para imóvel existente' : 'Cadastrar novo imóvel'}</DialogTitle>
            <DialogDescription>{imovelFixo ? 'O imóvel continua com um único cadastro. Este novo dado (valor, data, fonte) fica registrado ao lado dos anteriores.'
              : 'O imóvel entra no banco da organização e poderá ser usado em outras avaliações. Se já existir, use o cadastro existente.'}</DialogDescription>
          </DialogHeader>
          {imovelFixo ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{rotuloEndereco(imovelFixo)}</p>
              <p className="text-xs text-muted-foreground">{[imovelFixo.bairro, imovelFixo.municipio_nome && `${imovelFixo.municipio_nome}/${imovelFixo.uf ?? ''}`, imovelFixo.tipo_imovel,
                imovelFixo.area_construida ? `${fmtNum(imovelFixo.area_construida)} m²` : null].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 text-xs text-muted-foreground">Último dado: {fmtMoney(imovelFixo.valor_utilizado)} em {imovelFixo.data_observacao ? imovelFixo.data_observacao.split('-').reverse().join('/') : '—'}</p>
            </div>
          ) : <ImovelFields value={im} onChange={mudarImovel} showAnuncio municipioAvaliacao={av} />}
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="grid gap-1.5 sm:col-span-2"><Label>Finalidade</Label>
              <Select value={dado.negocio} onValueChange={(v) => setDado({ ...dado, negocio: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIPO_NEGOCIO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Natureza</Label>
              <Select value={dado.natureza} onValueChange={(v) => setDado({ ...dado, natureza: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NATUREZA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Situação do anúncio</Label>
              <Select value={dado.situacao} onValueChange={(v) => setDado({ ...dado, situacao: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['ATIVO', 'INATIVO', 'DESATUALIZADO'].map((k) => <SelectItem key={k} value={k}>{SITUACAO_LABEL[k]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Valor ofertado ({dado.negocio === 'VENDA' ? 'R$' : 'R$/mês'})</Label><Input inputMode="decimal" value={dado.ofertado} onChange={(e) => setDado({ ...dado, ofertado: e.target.value })} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Valor utilizado ({dado.negocio === 'VENDA' ? 'R$' : 'R$/mês'})</Label><Input inputMode="decimal" value={dado.utilizado} onChange={(e) => setDado({ ...dado, utilizado: e.target.value })} placeholder="igual ao ofertado" /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Data da pesquisa</Label><Input type="date" value={dado.data} onChange={(e) => setDado({ ...dado, data: e.target.value })} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Fonte</Label>
              <Select value={dado.fonteTipo} onValueChange={(v) => setDado({ ...dado, fonteTipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FONTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label>Nome da fonte</Label><Input value={dado.fonteNome} onChange={(e) => setDado({ ...dado, fonteNome: e.target.value })} maxLength={160} /></div>
            <div className="grid gap-1.5 sm:col-span-6"><Label>Origem territorial</Label>
              <Select value={dado.origem} onValueChange={(v) => setDado({ ...dado, origem: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="LOCAL">Mesmo município</SelectItem><SelectItem value="MUNICIPIO_COMPARAVEL">Município comparável</SelectItem>
                <SelectItem value="CONTRATO_PUBLICO_LOCAL">Contrato público local</SelectItem><SelectItem value="CONTRATO_PUBLICO_EXTERNO">Contrato público externo</SelectItem><SelectItem value="OUTRA_FONTE">Outra</SelectItem>
              </SelectContent></Select>
              <p className="text-xs text-muted-foreground">Definida pelo município do imóvel: {origemPorMunicipio(av.municipio_ibge, munNovo.municipio_ibge) === 'LOCAL' ? 'mesmo município da avaliação' : 'fora do município da avaliação'}.</p></div>
            <div className="sm:col-span-6">
              <ComparavelAviso av={av} mun={munNovo} comparaveis={comparaveis}
                onSugerir={canEdit ? () => setMun({ nome: munNovo.municipio_nome, uf: munNovo.uf, ibge: munNovo.municipio_ibge, just: '', noCadastro: true }) : undefined}>
                {mun?.noCadastro && mun.ibge === munNovo.municipio_ibge && (
                  <div className="grid gap-2">
                    <Label htmlFor="nd-mun-just">Justificativa para usar {mun.nome}/{mun.uf}</Label>
                    <Input id="nd-mun-just" value={mun.just} onChange={(e) => setMun({ ...mun, just: e.target.value })} maxLength={500} placeholder="Semelhança de mercado, escassez de dados locais…" />
                    <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setMun(null)}>Cancelar</Button><Button type="button" size="sm" onClick={salvarMun}>Enviar sugestão</Button></div>
                  </div>
                )}
              </ComparavelAviso>
            </div>
            <div className="grid gap-1.5 sm:col-span-6"><Label htmlFor="nd-obs">Observações</Label><Textarea id="nd-obs" rows={2} value={dado.obs} onChange={(e) => setDado({ ...dado, obs: e.target.value })} maxLength={1000} placeholder="Contato, condições do anúncio, estado do imóvel…" /></div>
          </div>
          {campos.length > 0 && (
            <section className="space-y-3" aria-labelledby="nd-vars">
              <h3 id="nd-vars" className="text-sm font-semibold">Variáveis desta avaliação</h3>
              {(() => {
                const area = imovelFixo ? imovelFixo.area_construida : num(im.area_construida); const vu = num(dado.utilizado) ?? num(dado.ofertado);
                const refs = Object.fromEntries(campos.filter((c) => !c.editavel).map((c) => {
                  const k = c.variavel.campo_origem;
                  return [c.variavel.id, k === 'valor_utilizado' ? vu : k === 'valor_unitario' ? (vu && area ? Math.round((vu / area) * 10000) / 10000 : null)
                    : k === 'area_construida' ? area : k === 'area_terreno' ? (imovelFixo ? imovelFixo.area_terreno : num(im.area_terreno)) : null];
                }));
                const falta = obrigatoriasVazias(campos, dynNovo, refs);
                return (<>
                  <CamposDinamicosSection campos={campos} form={dynNovo} onChange={(id, v) => setDynNovo({ ...dynNovo, [id]: v })} referencias={refs} idPrefix="nd" />
                  {falta.length > 0 && <p className="text-xs text-muted-foreground" role="status">Falta {falta.join(', ')}. Você pode incluir agora; a amostra fica marcada como incompleta até ser corrigida.</p>}
                </>);
              })()}
            </section>
          )}
          {!imovelFixo && creator.dups && <DuplicatePanel dups={creator.dups} onUse={(id) => salvar({ useExisting: id })} onForce={() => salvar({ forceNew: true })} />}
          <DialogFooter><Button variant="outline" onClick={() => setAdd(false)}>Cancelar</Button><Button onClick={() => salvar()}>Incluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {banco && <BancoImoveisDialog ctx={ctx} open={banco} onOpenChange={setBanco} onNovoDado={(r) => abrirNovo(r)} comparaveis={comparaveis} />}
      {importar && <ImportarAmostrasDialog ctx={ctx} open={importar} onOpenChange={setImportar} />}

      <EditAmostraDialog avaliacaoId={av.id} avaliacao={av} comparaveis={comparaveis} amostra={editar?.amostra ?? null} indice={editar?.indice ?? 0} onClose={() => setEditar(null)} onSaved={ctx.refresh} />

      <AlertDialog open={!!remover} onOpenChange={(v) => { if (!v && !removendo) setRemover(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{remover?.historica ? 'Esta amostra não pode ser removida' : TITULO_REMOVER}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {remover && <p className="font-medium text-foreground">Amostra {remover.indice}: {rotuloEndereco(remover.amostra.dados_mercado?.imoveis ?? {})}</p>}
                {remover?.historica ? (<>
                  <p>{TEXTO_HISTORICA}</p>
                  {complementosHistorica(remover.historica).map((c) => <p key={c}>{c}</p>)}
                  {!canSel && (remover.historica.selecionada || remover.historica.habilitada_modelo) && <p>Desmarcar a amostra cabe ao responsável técnico.</p>}
                </>) : <p>{TEXTO_REMOVER}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>{remover?.historica ? 'Fechar' : 'Cancelar'}</AlertDialogCancel>
            {remover && !remover.historica && <AlertDialogAction disabled={removendo} onClick={(e) => { e.preventDefault(); confirmarRemover(); }}>
              {removendo && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />}Remover da avaliação</AlertDialogAction>}
            {remover?.historica && podeDesmarcar(remover.historica, canSel) && <AlertDialogAction disabled={removendo} onClick={(e) => { e.preventDefault(); desmarcarParaNovaVersao(); }}>
              {removendo && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />}Desmarcar e preparar nova versão</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={freeze} onOpenChange={setFreeze}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bloqueios.length ? 'Ainda não é possível congelar' : 'Congelar conjunto de dados?'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {bloqueios.length > 0 ? (
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-destructive">{mensagemCongelamento(bloqueios)}</p>
                  <ul className="divide-y rounded-md border">{bloqueios.map((b) => {
                    const a = amostras.find((x) => x.id === b.amostra_id);
                    return (
                      <li key={b.indice} className="flex items-center justify-between gap-2 px-3 py-2 text-foreground">
                        <span>Amostra {b.indice}: falta {b.faltando.join(', ')}</span>
                        {canEdit && a && <Button size="sm" variant="outline" onClick={() => { setFreeze(false); setEditar({ amostra: a, indice: b.indice }); }}>Corrigir amostra</Button>}
                      </li>
                    );
                  })}</ul>
                  <p className="text-muted-foreground">Complete os valores ou desmarque a amostra em “No modelo”.</p>
                </div>
              ) : (
                <p>As {amostras.filter((a) => a.selecionada).length} amostras selecionadas e os valores atuais das variáveis serão fotografados. {vigente ? 'O conjunto vigente será substituído e os modelos atuais ficarão desatualizados (sem apagar nada).' : 'Os modelos passarão a usar esta versão.'}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{bloqueios.length ? 'Fechar' : 'Cancelar'}</AlertDialogCancel>
            {bloqueios.length === 0 && <AlertDialogAction onClick={(e) => { e.preventDefault(); congelar(); }}>Congelar</AlertDialogAction>}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
