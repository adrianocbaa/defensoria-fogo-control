import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';

const CAMPOS: { k: string; rotulo: string; ajuda?: string; tipo?: 'texto' | 'area' | 'data' }[] = [
  { k: 'solicitante', rotulo: 'Solicitante', ajuda: 'Vazio: nome do órgão.' },
  { k: 'endereco_titulo', rotulo: 'Linha de identificação sob o título', ajuda: 'Vazio: endereço do imóvel avaliando.' },
  { k: 'objeto', rotulo: 'OBJETO (quadro-resumo)', tipo: 'area', ajuda: 'Vazio: texto do tópico "Objeto da Avaliação".' },
  { k: 'objetivo', rotulo: 'OBJETIVO (quadro-resumo)', tipo: 'area', ajuda: 'Vazio: texto do tópico "Objetivo da Avaliação".' },
  { k: 'finalidade', rotulo: 'FINALIDADE (quadro-resumo)', tipo: 'area', ajuda: 'Vazio: texto do tópico "Finalidade do Laudo".' },
  { k: 'metodologia', rotulo: 'METODOLOGIA (quadro-resumo)', tipo: 'area', ajuda: 'Vazio: método comparativo direto com inferência estatística.' },
  { k: 'data_vistoria', rotulo: 'Data da vistoria', tipo: 'data' },
  { k: 'data_referencia', rotulo: 'Data de referência', tipo: 'data' },
  { k: 'local', rotulo: 'Local da assinatura', ajuda: 'Vazio: Cuiabá – MT.' },
  { k: 'responsavel_nome', rotulo: 'Responsável pela elaboração', ajuda: 'Vazio: nome do responsável técnico no cadastro.' },
  { k: 'responsavel_cargo', rotulo: 'Cargo/função', ajuda: 'Vazio: cargo do cadastro.' },
  { k: 'responsavel_titulo', rotulo: 'Título profissional', ajuda: 'Vazio: Engenheiro Civil.' },
  { k: 'responsavel_crea', rotulo: 'CREA', ajuda: 'Vazio: registro do cadastro.' },
];

export function LaudoCapa({ laudoVersaoId, capa, canEdit, onSaved }: { laudoVersaoId: string; capa: Record<string, string> | null; canEdit: boolean; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, string>>(capa ?? {});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setV(capa ?? {}); }, [capa]);
  const dirty = JSON.stringify(v) !== JSON.stringify(capa ?? {});
  const salvar = async () => {
    setBusy(true);
    try {
      const limpo = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (x ?? '').trim()]).filter(([, x]) => x));
      await rpc('aval_laudo_capa_salvar', { p_laudo_versao: laudoVersaoId, p_capa: limpo });
      toast.success('Página inicial e assinatura salvas.'); onSaved();
    } catch (e) { toast.error(avalErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Campos do quadro-resumo e da página de assinatura. Valores, graus e datas de emissão vêm do sistema e não são digitados aqui.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.k} className={`space-y-1 ${c.tipo === 'area' ? 'md:col-span-2' : ''}`}>
            <Label htmlFor={`capa-${c.k}`} className="text-xs">{c.rotulo}</Label>
            {c.tipo === 'area'
              ? <Textarea id={`capa-${c.k}`} rows={2} value={v[c.k] ?? ''} disabled={!canEdit} maxLength={600} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />
              : <Input id={`capa-${c.k}`} type={c.tipo === 'data' ? 'date' : 'text'} value={v[c.k] ?? ''} disabled={!canEdit} maxLength={600} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />}
            {c.ajuda && <p className="text-[11px] text-muted-foreground">{c.ajuda}</p>}
          </div>
        ))}
      </div>
      {canEdit && <Button onClick={salvar} disabled={!dirty || busy}>{busy ? 'Salvando…' : 'Salvar página inicial'}</Button>}
    </div>
  );
}
