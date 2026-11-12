import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtNum } from '@/lib/avaliacao/labels';

export interface ImovelInput {
  tipo_imovel: string; endereco: string; numero: string; complemento: string; bairro: string;
  area_construida: string; area_terreno: string; anuncio_url: string; anuncio_id: string;
}
export const emptyImovel = (tipo = ''): ImovelInput => ({ tipo_imovel: tipo, endereco: '', numero: '', complemento: '', bairro: '', area_construida: '', area_terreno: '', anuncio_url: '', anuncio_id: '' });
const num = (s: string) => { if (!s.trim()) return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

interface Dup { imovel_id: string; pontos: number; motivos: string[]; endereco: string | null; numero: string | null; complemento: string | null; bairro: string | null; area_construida: number | null }

/**
 * Cadastro físico único de imóvel. Antes de criar, procura possíveis duplicidades por endereço/unidade,
 * coordenadas, anúncio, fotos, bairro/tipo e área — nunca por telefone, corretor ou imobiliária, e nunca une automaticamente.
 */
export function ImovelFields({ value, onChange, showAnuncio }: { value: ImovelInput; onChange: (v: ImovelInput) => void; showAnuncio?: boolean }) {
  const f = (k: keyof ImovelInput) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="grid gap-1.5 sm:col-span-6"><Label>Tipo de imóvel</Label><Input value={value.tipo_imovel} onChange={f('tipo_imovel')} maxLength={120} /></div>
      <div className="grid gap-1.5 sm:col-span-4"><Label>Endereço</Label><Input value={value.endereco} onChange={f('endereco')} maxLength={200} /></div>
      <div className="grid gap-1.5 sm:col-span-2"><Label>Número</Label><Input value={value.numero} onChange={f('numero')} maxLength={20} /></div>
      <div className="grid gap-1.5 sm:col-span-3"><Label>Complemento/unidade</Label><Input value={value.complemento} onChange={f('complemento')} maxLength={80} /></div>
      <div className="grid gap-1.5 sm:col-span-3"><Label>Bairro</Label><Input value={value.bairro} onChange={f('bairro')} maxLength={120} /></div>
      <div className="grid gap-1.5 sm:col-span-3"><Label>Área construída (m²)</Label><Input inputMode="decimal" value={value.area_construida} onChange={f('area_construida')} /></div>
      <div className="grid gap-1.5 sm:col-span-3"><Label>Área do terreno (m²)</Label><Input inputMode="decimal" value={value.area_terreno} onChange={f('area_terreno')} /></div>
      {showAnuncio && <>
        <div className="grid gap-1.5 sm:col-span-4"><Label>Link do anúncio</Label><Input value={value.anuncio_url} onChange={f('anuncio_url')} maxLength={500} /></div>
        <div className="grid gap-1.5 sm:col-span-2"><Label>Código do anúncio</Label><Input value={value.anuncio_id} onChange={f('anuncio_id')} maxLength={80} /></div>
      </>}
    </div>
  );
}

export function useImovelCreator(municipio: { ibge: string | null; nome: string; uf: string }) {
  const [dups, setDups] = useState<Dup[] | null>(null);
  const check = async (v: ImovelInput) => {
    const rows = await rpc<Dup[]>('aval_find_duplicates', {
      p_endereco: v.endereco, p_numero: v.numero, p_complemento: v.complemento, p_municipio_ibge: municipio.ibge,
      p_latitude: null, p_longitude: null, p_anuncio_url: v.anuncio_url || null, p_anuncio_id: v.anuncio_id || null,
      p_area: num(v.area_construida), p_foto_hashes: [], p_exclude: null,
      p_bairro: v.bairro.trim() || null, p_tipo_imovel: v.tipo_imovel.trim() || null,
    });
    return rows ?? [];
  };
  const create = async (v: ImovelInput): Promise<string> => {
    const { data, error } = await db.from('imoveis').insert({
      tipo_imovel: v.tipo_imovel.trim() || 'Não informado', endereco: v.endereco.trim() || null, numero: v.numero.trim() || null,
      complemento: v.complemento.trim() || null, bairro: v.bairro.trim() || null, municipio_nome: municipio.nome, municipio_ibge: municipio.ibge, uf: municipio.uf,
      area_construida: num(v.area_construida), area_terreno: num(v.area_terreno), anuncio_url: v.anuncio_url.trim() || null, anuncio_id: v.anuncio_id.trim() || null,
    }).select('id').single();
    if (error) throw error;
    return data.id as string;
  };
  /** Retorna o id do imóvel a usar (existente escolhido ou novo) ou null quando aguardando decisão sobre duplicidade. */
  const resolve = async (v: ImovelInput, decision?: { useExisting?: string; forceNew?: boolean }): Promise<string | null> => {
    try {
      if (decision?.useExisting) { setDups(null); return decision.useExisting; }
      if (!decision?.forceNew) {
        const found = await check(v);
        if (found.length) { setDups(found); return null; }
      }
      setDups(null);
      return await create(v);
    } catch (e) { toast.error(avalErrorMessage(e)); return null; }
  };
  return { dups, setDups, resolve };
}

export function DuplicatePanel({ dups, onUse, onForce }: { dups: Dup[]; onUse: (id: string) => void; onForce: () => void }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-3">
      <div role="alert">
        <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />Encontramos um imóvel possivelmente já cadastrado.</p>
        <p className="text-xs text-muted-foreground">Deseja utilizar o existente ou cadastrar um novo? Imóveis diferentes no mesmo endereço ou condomínio podem ser cadastrados normalmente.</p>
      </div>
      <ul className="space-y-2">
        {dups.map((d) => (
          <li key={d.imovel_id} className="flex flex-col gap-2 rounded border bg-background p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium">{[d.endereco, d.numero, d.complemento].filter(Boolean).join(', ') || 'Sem endereço'}{d.bairro ? ` — ${d.bairro}` : ''}</p>
              <p className="text-xs text-muted-foreground">{d.area_construida ? `${fmtNum(d.area_construida)} m² · ` : ''}{d.motivos.join(' · ')}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onUse(d.imovel_id)}>Utilizar o existente</Button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={onForce}>Não é o mesmo — cadastrar novo</Button></div>
    </div>
  );
}
