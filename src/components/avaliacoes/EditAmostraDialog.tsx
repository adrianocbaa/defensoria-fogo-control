import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComparavelAviso, type ComparavelRow, ImovelFields, type ImovelInput } from './ImovelForm';
import { ImpactDialog, type PendingChange } from './ImpactDialog';
import { CompartilhadoAviso, type Compartilhamento } from './CompartilhadoAviso';
import { CamposDinamicosSection, useVariaveisStatus } from './VariaveisShared';
import { rpc } from '@/lib/avaliacao/api';
import { fmtNum } from '@/lib/avaliacao/labels';
import { camposInvalidos, montarAlteracoes, normalizar, paraFormulario, valorUnitario, type CampoEdicao } from '@/lib/avaliacao/edicao';
import { municipioValido, mudouMunicipio, origemAposTrocaMunicipio } from '@/lib/avaliacao/municipioImovel';
import { alteracoesDinamicas, camposDinamicos, obrigatoriasVazias, valorParaFormulario } from '@/lib/avaliacao/variaveis';

export const NATUREZA: Record<string, string> = { OFERTA: 'Oferta', NEGOCIACAO: 'Negociação', CONTRATO_PRIVADO: 'Contrato privado', CONTRATO_PUBLICO: 'Contrato público', OUTRO: 'Outro' };
export const FONTE: Record<string, string> = { IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor', PROPRIETARIO: 'Proprietário', PORTAL: 'Portal', ORGAO_PUBLICO: 'Órgão público', REDE_SOCIAL: 'Rede social', PLACA: 'Placa', OUTRO: 'Outro' };
export const ORIGEM: Record<string, string> = { LOCAL: 'Mesmo município', MUNICIPIO_COMPARAVEL: 'Município comparável', CONTRATO_PUBLICO_LOCAL: 'Contrato público local', CONTRATO_PUBLICO_EXTERNO: 'Contrato público externo', OUTRA_FONTE: 'Outra' };

type Modo = 'COMPARTILHADO' | 'CLONAR';

/** Campos editáveis da amostra; imóvel físico com contexto (dado e escolha de compartilhamento). */
export function camposAmostra(a: { id: string; dado_id: string; imovel_id: string }, modo?: Modo): CampoEdicao[] {
  const ctx = { dado_id: a.dado_id, ...(modo ? { modo } : {}) };
  const im = (chave: string, rotulo: string, tipo: CampoEdicao['tipo'] = 'texto', extra: Partial<CampoEdicao> = {}): CampoEdicao =>
    ({ chave, entity_type: 'imovel', entity_id: a.imovel_id, campo: chave, rotulo, tipo, contexto: ctx, ...extra });
  const dm = (chave: string, campo: string, rotulo: string, tipo: CampoEdicao['tipo'], extra: Partial<CampoEdicao> = {}): CampoEdicao =>
    ({ chave, entity_type: 'dado_mercado', entity_id: a.dado_id, campo, rotulo, tipo, ...extra });
  return [
    im('tipo_imovel', 'Tipo de imóvel'), im('endereco', 'Endereço'), im('numero', 'Número'), im('complemento', 'Complemento'), im('bairro', 'Bairro'),
    im('uf', 'UF do imóvel'), im('municipio_ibge', 'Código IBGE do município'), im('municipio_nome', 'Município do imóvel'),
    im('area_construida', 'Área construída', 'numero', { casas: 2, sufixo: 'm²' }), im('area_terreno', 'Área do terreno', 'numero', { casas: 2, sufixo: 'm²' }),
    im('anuncio_url', 'Link do anúncio (imóvel)', 'texto', { origem: 'imovel_anuncio_url' }), im('anuncio_id', 'Código do anúncio (imóvel)', 'texto', { origem: 'imovel_anuncio_id' }),
    dm('anuncio_url', 'url_anuncio', 'Link do anúncio', 'texto', { origem: 'url_anuncio' }), dm('anuncio_id', 'anuncio_id', 'Código do anúncio', 'texto', { origem: 'dado_anuncio_id' }),
    dm('natureza_dado', 'natureza_dado', 'Natureza', 'opcao', { opcoes: NATUREZA }),
    dm('valor_ofertado', 'valor_ofertado', 'Valor ofertado', 'numero', { casas: 2, prefixo: 'R$' }),
    dm('valor_utilizado', 'valor_utilizado', 'Valor utilizado', 'numero', { casas: 2, prefixo: 'R$' }),
    dm('data_observacao', 'data_observacao', 'Data da observação', 'data'),
    { chave: 'origem_territorial', entity_type: 'amostra', entity_id: a.id, campo: 'origem_territorial', rotulo: 'Origem territorial', tipo: 'opcao', opcoes: ORIGEM },
    { chave: 'fonte_tipo', entity_type: 'fonte_principal', entity_id: a.dado_id, campo: 'tipo', rotulo: 'Tipo da fonte', tipo: 'opcao', opcoes: FONTE },
    { chave: 'fonte_nome', entity_type: 'fonte_principal', entity_id: a.dado_id, campo: 'nome', rotulo: 'Nome da fonte', tipo: 'texto' },
  ];
}

/** Valores atuais da amostra no formato de comparação (chaves de origem). */
export function originalAmostra(a: any): Record<string, unknown> {
  const d = a.dados_mercado ?? {}; const imv = d.imoveis ?? {};
  const fonte = (d.dados_mercado_fontes ?? []).find((f: any) => f.principal)?.fontes_mercado ?? null;
  return {
    tipo_imovel: imv.tipo_imovel, endereco: imv.endereco, numero: imv.numero, complemento: imv.complemento, bairro: imv.bairro,
    uf: imv.uf, municipio_ibge: imv.municipio_ibge, municipio_nome: imv.municipio_nome,
    area_construida: imv.area_construida, area_terreno: imv.area_terreno, imovel_anuncio_url: imv.anuncio_url, imovel_anuncio_id: imv.anuncio_id,
    url_anuncio: d.url_anuncio, dado_anuncio_id: d.anuncio_id, natureza_dado: d.natureza_dado, valor_ofertado: d.valor_ofertado,
    valor_utilizado: d.valor_utilizado, data_observacao: d.data_observacao, origem_territorial: a.origem_territorial,
    fonte_tipo: fonte?.tipo ?? null, fonte_nome: fonte?.nome ?? null,
  };
}

export function EditAmostraDialog({ avaliacaoId, avaliacao, comparaveis = [], amostra, indice, onClose, onSaved }: {
  avaliacaoId: string; amostra: any | null; indice: number; onClose: () => void; onSaved: () => void;
  /** Município da avaliação: define a origem territorial sugerida quando o município do imóvel muda. */
  avaliacao?: { municipio_ibge?: string | null; municipio_nome?: string | null; uf?: string | null };
  comparaveis?: ComparavelRow[];
}) {
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [inicial, setInicial] = useState<Record<string, string>>({});
  const [share, setShare] = useState<Compartilhamento | null>(null);
  const [modo, setModo] = useState<Modo | ''>('');
  const [changes, setChanges] = useState<PendingChange[] | null>(null);
  const [dyn, setDyn] = useState<Record<string, string>>({});
  const status = useVariaveisStatus(avaliacaoId);
  const amostraSt = status.data?.amostras.find((x) => x.amostra_id === amostra?.id) ?? null;
  const campos = camposDinamicos(status.data, 'AMOSTRA');
  const ids = amostra ? { id: amostra.id as string, dado_id: amostra.dado_id as string, imovel_id: amostra.dados_mercado?.imovel_id as string } : null;
  const original = useMemo(() => (amostra ? originalAmostra(amostra) : {}), [amostra]);

  useEffect(() => {
    setChanges(null); setShare(null); setModo('');
    if (!amostra || !ids) { setForm(null); return; }
    const f: Record<string, string> = {};
    for (const c of camposAmostra(ids)) if (!(c.chave in f)) f[c.chave] = paraFormulario(c.tipo, original[c.origem ?? c.chave]);
    if (!f.anuncio_url) f.anuncio_url = paraFormulario('texto', original.imovel_anuncio_url);
    if (!f.anuncio_id) f.anuncio_id = paraFormulario('texto', original.imovel_anuncio_id);
    if (!f.fonte_tipo) f.fonte_tipo = 'IMOBILIARIA';
    setForm(f); setInicial(f);
    rpc<Compartilhamento>('aval_imovel_sharing', { p_avaliacao: avaliacaoId, p_imovel: ids.imovel_id, p_dado: ids.dado_id })
      .then(setShare).catch(() => setShare(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amostra?.id]);
  // Variáveis desta avaliação: valores atuais lidos das fontes (característica do imóvel ou valor manual).
  useEffect(() => {
    setDyn(Object.fromEntries(campos.filter((c) => c.editavel).map((c) => [c.variavel.id, valorParaFormulario(c.variavel, amostraSt?.valores?.[c.variavel.id])])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amostra?.id, !!amostraSt, campos.length]);

  if (!amostra || !ids) return null;
  const set = (k: string, v: string) => form && setForm({ ...form, [k]: v });
  // Link/código do anúncio só entram no lote quando o usuário os altera (imóvel e dado podem divergir em cadastros antigos).
  const filtrar = (lote: PendingChange[]) => lote.filter((c) => {
    const chave = c.entity_type === 'dado_mercado' && c.campo === 'url_anuncio' ? 'anuncio_url' : c.campo;
    return !['anuncio_url', 'anuncio_id'].includes(chave) || form?.[chave] !== inicial[chave];
  });
  const lotePrevio = form ? filtrar(montarAlteracoes(camposAmostra(ids), original, form)) : [];
  const destino = { imovel_id: ids.imovel_id, dado_id: ids.dado_id, amostra_id: ids.id };
  const dynPrevio = alteracoesDinamicas(campos, amostraSt?.valores ?? {}, dyn, destino).alteracoes;
  const mudaImovel = lotePrevio.some((c) => c.entity_type === 'imovel') || dynPrevio.some((c) => c.entity_type === 'imovel_atributo');
  const precisaEscolha = !!share?.compartilhado && mudaImovel;

  const area = normalizar('numero', form?.area_construida) as number | null;
  const valor = (normalizar('numero', form?.valor_utilizado) as number | null);
  const vuNovo = valorUnitario(valor, area);
  const vuAtual = amostra.dados_mercado?.valor_unitario ?? null;
  const referencias = Object.fromEntries(campos.filter((c) => !c.editavel).map((c) => {
    const k = c.variavel.campo_origem;
    const r = k === 'valor_utilizado' ? valor : k === 'valor_unitario' ? (vuNovo ?? (vuAtual === null ? null : Number(vuAtual)))
      : k === 'area_construida' ? area : k === 'area_terreno' ? (normalizar('numero', form?.area_terreno) as number | null) : null;
    return [c.variavel.id, r];
  }));
  const faltando = obrigatoriasVazias(campos, dyn, referencias);

  const revisar = () => {
    if (!form) return;
    const cs = camposAmostra(ids, precisaEscolha && modo ? modo : undefined);
    const inval = camposInvalidos(cs, form);
    if (inval.length) { toast.error(`Revise: ${inval.join(', ')}.`); return; }
    if (!form.tipo_imovel.trim()) { toast.error('Informe o tipo de imóvel.'); return; }
    if (mudouMunicipio(original, form) && !municipioValido(form)) { toast.error('Escolha a UF e o município do imóvel.'); return; }
    if (valor === null || !(valor > 0)) { toast.error('Informe o valor utilizado.'); return; }
    for (const k of ['area_construida', 'area_terreno']) { const n = normalizar('numero', form[k]) as number | null; if (n !== null && !(n > 0)) { toast.error('As áreas precisam ser maiores que zero.'); return; } }
    const vo = normalizar('numero', form.valor_ofertado) as number | null;
    if (vo !== null && vo < 0) { toast.error('O valor ofertado não pode ser negativo.'); return; }
    if (precisaEscolha && !modo) { toast.error('Escolha como tratar o imóvel compartilhado.'); return; }
    let lote = filtrar(montarAlteracoes(cs, original, form));
    // Fonte: sem fonte anterior e sem nome, não há o que vincular.
    if (!original.fonte_nome && !form.fonte_nome.trim()) lote = lote.filter((c) => c.entity_type !== 'fonte_principal');
    const din = alteracoesDinamicas(campos, amostraSt?.valores ?? {}, dyn, { ...destino, ...(precisaEscolha && modo ? { modo } : {}) });
    if (din.invalidos.length) { toast.error(`Revise: ${din.invalidos.join(', ')}.`); return; }
    lote = [...lote, ...din.alteracoes];
    if (!lote.length) { toast.info('Nenhum campo foi alterado.'); return; }
    setChanges(lote);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar amostra {indice}</DialogTitle>
          <DialogDescription>Corrige o cadastro vivo; a amostra mantém o mesmo registro. O conjunto já congelado não muda — congele uma nova versão para usar a correção.</DialogDescription>
        </DialogHeader>
        {form && (
          <div className="space-y-5">
            <section className="space-y-3" aria-labelledby="ea-imovel">
              <h3 id="ea-imovel" className="text-sm font-semibold">Imóvel físico</h3>
              <ImovelFields value={form as unknown as ImovelInput} municipioAvaliacao={avaliacao} showAnuncio
                onChange={(v) => setForm({ ...form, ...(v as unknown as Record<string, string>),
                  // Origem territorial acompanha o município do imóvel (origens escolhidas pelo avaliador são mantidas).
                  ...(v.municipio_ibge !== form.municipio_ibge && v.municipio_ibge ? { origem_territorial: origemAposTrocaMunicipio(form.origem_territorial, avaliacao?.municipio_ibge, v.municipio_ibge) } : {}) })} />
              {avaliacao && <ComparavelAviso av={avaliacao} mun={form as never} comparaveis={comparaveis} />}
              {share?.compartilhado && (
                <CompartilhadoAviso share={share}>
                  {mudaImovel ? (
                    <RadioGroup value={modo} onValueChange={(v) => setModo(v as Modo)} className="gap-2" aria-label="Como tratar o imóvel compartilhado">
                      <label className="flex items-start gap-2 cursor-pointer"><RadioGroupItem value="COMPARTILHADO" className="mt-0.5" />
                        <span><span className="font-medium">Corrigir cadastro físico compartilhado</span><br /><span className="text-muted-foreground">Vale para todos os registros vivos que usam este imóvel. Fotografias congeladas não mudam.</span></span></label>
                      <label className="flex items-start gap-2 cursor-pointer"><RadioGroupItem value="CLONAR" className="mt-0.5" />
                        <span><span className="font-medium">Este anúncio é de outro imóvel — criar imóvel separado para esta amostra</span><br /><span className="text-muted-foreground">Copia o cadastro atual, aplica as correções na cópia e muda somente esta amostra.</span></span></label>
                    </RadioGroup>
                  ) : <p className="text-muted-foreground">Ao alterar dados do imóvel, você escolherá se a correção vale para todos ou só para esta amostra.</p>}
                </CompartilhadoAviso>
              )}
            </section>
            <section className="space-y-3" aria-labelledby="ea-obs">
              <h3 id="ea-obs" className="text-sm font-semibold">Observação de mercado</h3>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="grid gap-1.5 sm:col-span-2"><Label>Natureza</Label>
                  <Select value={form.natureza_dado} onValueChange={(v) => set('natureza_dado', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(NATUREZA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ea-vo">Valor ofertado (R$/mês)</Label><Input id="ea-vo" inputMode="decimal" value={form.valor_ofertado} onChange={(e) => set('valor_ofertado', e.target.value)} /></div>
                <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ea-vu">Valor utilizado (R$/mês)</Label><Input id="ea-vu" inputMode="decimal" value={form.valor_utilizado} onChange={(e) => set('valor_utilizado', e.target.value)} /></div>
                <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="ea-data">Data da observação</Label><Input id="ea-data" type="date" value={form.data_observacao} onChange={(e) => set('data_observacao', e.target.value)} /></div>
                <div className="grid gap-1.5 sm:col-span-4"><Label>Origem territorial</Label>
                  <Select value={form.origem_territorial} onValueChange={(v) => set('origem_territorial', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ORIGEM).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">Valor unitário: {fmtNum(vuAtual, 2)} R$/m²{vuNovo !== null && vuNovo !== (vuAtual === null ? null : Number(vuAtual)) ? ` → ${fmtNum(vuNovo, 2)} R$/m² (recalculado ao salvar)` : ''}</p>
              {(share?.dado_outras_avaliacoes?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">Este dado de mercado também é usado em {share!.dado_outras_avaliacoes!.join(', ')}; a correção da observação vale lá também.</p>
              )}
            </section>
            {campos.length > 0 && (
              <section className="space-y-3" aria-labelledby="ea-vars">
                <h3 id="ea-vars" className="text-sm font-semibold">Variáveis desta avaliação</h3>
                <CamposDinamicosSection campos={campos} form={dyn} onChange={(id, v) => setDyn({ ...dyn, [id]: v })} referencias={referencias} idPrefix="ea" />
                {faltando.length > 0 && <p className="text-xs text-destructive" role="status">Falta {faltando.join(', ')}. A amostra pode ser salva, mas fica incompleta e não entra no conjunto congelado.</p>}
              </section>
            )}
            <section className="space-y-3" aria-labelledby="ea-fonte">
              <h3 id="ea-fonte" className="text-sm font-semibold">Fonte principal</h3>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="grid gap-1.5 sm:col-span-2"><Label>Tipo da fonte</Label>
                  <Select value={form.fonte_tipo || 'IMOBILIARIA'} onValueChange={(v) => set('fonte_tipo', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FONTE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-1.5 sm:col-span-4"><Label htmlFor="ea-fn">Nome da fonte</Label><Input id="ea-fn" value={form.fonte_nome} onChange={(e) => set('fonte_nome', e.target.value)} maxLength={160} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Se já existir uma fonte com o mesmo tipo e nome, ela é reaproveitada; nenhuma fonte é duplicada sem necessidade.</p>
            </section>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={revisar}>Revisar alterações</Button></DialogFooter>
        <ImpactDialog avaliacaoId={avaliacaoId} changes={changes} titulo={`Revisar alterações da amostra ${indice}`}
          onClose={() => setChanges(null)} onApplied={() => { onSaved(); onClose(); }} />
      </DialogContent>
    </Dialog>
  );
}
