import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAvalQuery } from '../../useAvaliacao';
import { db } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { MIDIA_CATEGORIAS } from '@/lib/avaliacao/laudoDif';
import { MIDIA_MAX_BYTES, enviarMidia, paginasPdf, prepararImagem } from '@/lib/avaliacao/laudoMidia';

const GRUPOS: { titulo: string; ajuda: string; categorias: string[] }[] = [
  { titulo: 'Quadro-resumo', ajuda: 'Foto principal exibida ao lado do campo OBJETO na página inicial.', categorias: ['FOTO_PRINCIPAL'] },
  { titulo: 'Localização', ajuda: 'Mapa inserido em largura ampla no item de identificação do imóvel.', categorias: ['MAPA_LOCALIZACAO'] },
  { titulo: 'Imóvel avaliando', ajuda: 'Fachada e planta em largura ampla; duas fotos verticais seguidas ficam lado a lado.', categorias: ['FACHADA', 'PLANTA', 'RECEPCAO', 'CORREDOR', 'SALA', 'TI', 'BANHEIRO', 'DML', 'OUTRA'] },
  { titulo: 'Documentos do imóvel (Anexo I)', ajuda: 'Cada página entra inteira, como imagem do original. PDFs são convertidos página a página.', categorias: ['DOCUMENTO'] },
  { titulo: 'Imóveis de amostra (Anexo II)', ajuda: 'Fotos exibidas na ficha de cada amostra.', categorias: ['AMOSTRA_MERCADO'] },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Midia = Record<string, any>;

export function LaudoMidias({ avaliacaoId, canEdit, onChanged }: { avaliacaoId: string; canEdit: boolean; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState('FACHADA');
  const [legenda, setLegenda] = useState('');
  const [fonte, setFonte] = useState('');
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [amostra, setAmostra] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Midia | null>(null);
  const [edits, setEdits] = useState<Record<string, Midia>>({});

  const q = useAvalQuery(avaliacaoId, 'laudo-midias', async () => {
    const [{ data: ms, error }, { data: am }] = await Promise.all([
      db.from('laudo_midias').select('*').eq('avaliacao_id', avaliacaoId).order('ordem').order('created_at').limit(1000),
      db.from('avaliacao_amostras').select('id, created_at, snapshot_inclusao').eq('avaliacao_id', avaliacaoId).order('created_at').limit(10000),
    ]);
    if (error) throw error;
    const lista = (ms ?? []) as Midia[];
    const urls: Record<string, string> = {};
    if (lista.length) {
      const { data: signed } = await db.storage.from('documents').createSignedUrls(lista.map((m) => m.storage_path), 900);
      (signed ?? []).forEach((s: { signedUrl?: string }, i: number) => { if (s?.signedUrl) urls[lista[i].id] = s.signedUrl; });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amostras = ((am ?? []) as any[]).map((a, i) => {
      const im = a.snapshot_inclusao?.imovel ?? {};
      return { id: a.id as string, rotulo: `${String(i + 1).padStart(2, '0')} — ${[im.endereco, im.numero].filter(Boolean).join(', ') || im.tipo_imovel || 'Amostra'}` };
    });
    return { lista, urls, amostras };
  });
  const lista = q.data?.lista ?? [];
  const proximaOrdem = () => (lista.reduce((m, x) => Math.max(m, Number(x.ordem ?? 0)), 0) + 10);

  const enviar = async (files: FileList) => {
    if (categoria === 'AMOSTRA_MERCADO' && !amostra) { toast.error('Escolha a amostra a que as fotos pertencem.'); return; }
    setBusy('up');
    let ordem = proximaOrdem(); let n = 0;
    try {
      for (const f of Array.from(files)) {
        if (f.size > 60 * 1024 * 1024) { toast.error(`${f.name}: arquivo muito grande.`); continue; }
        const anoN = ano.trim() ? Number(ano) : null;
        const base = { categoria, legenda: legenda || null, fonte: fonte || null, ano: anoN && anoN >= 1900 && anoN <= 2100 ? anoN : null, amostra_id: amostra || null };
        if (f.type === 'application/pdf') {
          if (categoria !== 'DOCUMENTO') { toast.error('PDF só pode ser anexado como documento do imóvel.'); continue; }
          const paginas = await paginasPdf(f);
          const grupo = crypto.randomUUID();
          for (let i = 0; i < paginas.length; i++) {
            await enviarMidia(avaliacaoId, paginas[i], { ...base, legenda: `${legenda || f.name.replace(/\.pdf$/i, '')} — página ${i + 1}/${paginas.length}`, ordem: ordem += 1, documento_grupo: grupo, pagina: i + 1, nome: `${f.name}-p${i + 1}.jpg` });
            n++;
          }
        } else {
          const blob = await prepararImagem(f);
          if (blob.size > MIDIA_MAX_BYTES) { toast.error(`${f.name}: imagem maior que 15 MB.`); continue; }
          await enviarMidia(avaliacaoId, blob, { ...base, ordem: ordem += 10, nome: f.name });
          n++;
        }
      }
      if (n) { toast.success(n === 1 ? 'Imagem adicionada ao laudo.' : `${n} imagens adicionadas ao laudo.`); setLegenda(''); }
    } catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível adicionar a imagem. Use JPEG, PNG ou PDF.')); }
    finally { setBusy(null); q.refetch(); onChanged(); }
  };

  const atualizar = async (m: Midia, patch: Midia) => {
    setBusy(`u-${m.id}`);
    try { const { error } = await db.from('laudo_midias').update(patch).eq('id', m.id); if (error) throw error; setEdits((e) => { const n = { ...e }; delete n[m.id]; return n; }); q.refetch(); onChanged(); }
    catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); }
  };
  const mover = async (grupo: Midia[], i: number, d: -1 | 1) => {
    const a = grupo[i]; const b = grupo[i + d]; if (!a || !b) return;
    setBusy(`m-${a.id}`);
    try {
      const oa = Number(a.ordem); const ob = Number(b.ordem) === oa ? oa + d : Number(b.ordem);
      const r1 = await db.from('laudo_midias').update({ ordem: ob }).eq('id', a.id); if (r1.error) throw r1.error;
      const r2 = await db.from('laudo_midias').update({ ordem: oa }).eq('id', b.id); if (r2.error) throw r2.error;
      q.refetch(); onChanged();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); }
  };
  const remover = async (m: Midia) => {
    setBusy(`d-${m.id}`);
    try { const { error } = await db.from('laudo_midias').delete().eq('id', m.id); if (error) throw error; toast.success('Imagem retirada do laudo.'); q.refetch(); onChanged(); }
    catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(null); setExcluir(null); }
  };
  const campo = (m: Midia, k: string) => (edits[m.id]?.[k] ?? m[k] ?? '') as string;
  const setCampo = (m: Midia, k: string, v: string) => setEdits((e) => ({ ...e, [m.id]: { ...e[m.id], [k]: v } }));
  const salvarCampos = (m: Midia) => {
    const e = edits[m.id]; if (!e) return;
    const patch: Midia = {};
    if ('legenda' in e) patch.legenda = String(e.legenda).trim() || null;
    if ('fonte' in e) patch.fonte = String(e.fonte).trim() || null;
    if ('ano' in e) { const v = Number(e.ano); patch.ano = String(e.ano).trim() && v >= 1900 && v <= 2100 ? v : null; }
    atualizar(m, patch);
  };

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-sm font-medium">Adicionar imagens</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MIDIA_CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="md-leg" className="text-xs">Legenda</Label><Input id="md-leg" className="h-9" value={legenda} onChange={(e) => setLegenda(e.target.value)} maxLength={300} placeholder="Ex.: Fachada do imóvel" /></div>
            <div className="space-y-1"><Label htmlFor="md-fonte" className="text-xs">Fonte</Label><Input id="md-fonte" className="h-9" value={fonte} onChange={(e) => setFonte(e.target.value)} maxLength={200} placeholder="Ex.: Autor, Google Earth" /></div>
            <div className="space-y-1"><Label htmlFor="md-ano" className="text-xs">Ano</Label><Input id="md-ano" className="h-9" inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>
          </div>
          {categoria === 'AMOSTRA_MERCADO' && (
            <div className="space-y-1 max-w-md"><Label className="text-xs">Amostra</Label>
              <Select value={amostra} onValueChange={setAmostra}><SelectTrigger className="h-9"><SelectValue placeholder="Escolha a amostra" /></SelectTrigger>
                <SelectContent>{(q.data?.amostras ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.rotulo}</SelectItem>)}</SelectContent></Select></div>
          )}
          <input ref={fileRef} type="file" multiple className="hidden" accept={categoria === 'DOCUMENTO' ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png'}
            onChange={(e) => { if (e.target.files?.length) enviar(e.target.files); e.target.value = ''; }} />
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={() => fileRef.current?.click()} disabled={busy === 'up'}><ImagePlus className="h-4 w-4 mr-1" />{busy === 'up' ? 'Enviando…' : 'Escolher arquivos'}</Button>
            <p className="text-xs text-muted-foreground">JPEG ou PNG (e PDF para documentos). A imagem é reduzida sem cortes e mantém a proporção.</p>
          </div>
        </div>
      )}

      {GRUPOS.map((g) => {
        const grupo = lista.filter((m) => g.categorias.includes(m.categoria));
        return (
          <section key={g.titulo} className="space-y-2" aria-label={g.titulo}>
            <div><h4 className="text-sm font-medium">{g.titulo} <span className="text-muted-foreground font-normal">({grupo.length})</span></h4><p className="text-xs text-muted-foreground">{g.ajuda}</p></div>
            {grupo.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma imagem.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{grupo.map((m, i) => (
                <li key={m.id} className={`rounded-lg border p-2 space-y-2 ${m.incluir ? '' : 'opacity-60'}`}>
                  <div className="aspect-[4/3] rounded-md bg-muted overflow-hidden flex items-center justify-center">
                    {q.data?.urls[m.id] ? <img src={q.data.urls[m.id]} alt={m.legenda ?? MIDIA_CATEGORIAS[m.categoria]} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-xs text-muted-foreground">Pré-visualização indisponível</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge variant="outline">{MIDIA_CATEGORIAS[m.categoria] ?? m.categoria}</Badge>
                    <span className="text-muted-foreground">{m.largura}×{m.altura}{m.altura > m.largura * 1.05 ? ' · vertical' : ''}{m.pagina ? ` · pág. ${m.pagina}` : ''}</span>
                  </div>
                  {canEdit ? (
                    <div className="space-y-1.5">
                      {g.categorias.length > 1 && (
                        <Select value={m.categoria} onValueChange={(v) => atualizar(m, { categoria: v })}><SelectTrigger className="h-8 text-xs" aria-label="Categoria"><SelectValue /></SelectTrigger>
                          <SelectContent>{g.categorias.map((c) => <SelectItem key={c} value={c}>{MIDIA_CATEGORIAS[c]}</SelectItem>)}</SelectContent></Select>
                      )}
                      <Input className="h-8 text-xs" aria-label="Legenda" placeholder="Legenda" value={campo(m, 'legenda')} onChange={(e) => setCampo(m, 'legenda', e.target.value)} onBlur={() => salvarCampos(m)} maxLength={300} />
                      <div className="flex gap-1.5">
                        <Input className="h-8 text-xs" aria-label="Fonte" placeholder="Fonte" value={campo(m, 'fonte')} onChange={(e) => setCampo(m, 'fonte', e.target.value)} onBlur={() => salvarCampos(m)} maxLength={200} />
                        <Input className="h-8 text-xs w-20" aria-label="Ano" placeholder="Ano" inputMode="numeric" value={String(campo(m, 'ano'))} onChange={(e) => setCampo(m, 'ano', e.target.value.replace(/\D/g, '').slice(0, 4))} onBlur={() => salvarCampos(m)} />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Mover para antes" disabled={i === 0 || !!busy} onClick={() => mover(grupo, i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Mover para depois" disabled={i === grupo.length - 1 || !!busy} onClick={() => mover(grupo, i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`inc-${m.id}`} className="text-xs">No laudo</Label>
                          <Switch id={`inc-${m.id}`} checked={m.incluir} onCheckedChange={(v) => atualizar(m, { incluir: v })} />
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Retirar imagem" onClick={() => setExcluir(m)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-xs">{m.legenda ?? '—'}{m.fonte ? ` · Fonte: ${m.fonte}` : ''}</p>}
                </li>
              ))}</ul>
            )}
          </section>
        );
      })}

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Retirar esta imagem do laudo?</AlertDialogTitle>
            <AlertDialogDescription>A imagem deixa de aparecer nos próximos rascunhos e emissões. Laudos já emitidos não mudam.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir && remover(excluir)}>Retirar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
