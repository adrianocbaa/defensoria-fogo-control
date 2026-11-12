import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime } from '@/lib/avaliacao/labels';
import { openPrivateFile, storageRef, tenantPath } from '@/lib/privateStorage';

const CATEGORIAS: Record<string, string> = { IMOVEL: 'Imóvel', MERCADO: 'Mercado', PROCESSO: 'Processo', LAUDO: 'Laudo', OUTRO: 'Outro' };
const MAX_BYTES = 20 * 1024 * 1024;
const safeName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120);

export function DocumentosBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const id = ctx.avaliacao.data!.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState('PROCESSO');
  const [titulo, setTitulo] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = useAvalQuery(id, 'documentos', async () => {
    const { data, error } = await db.from('avaliacao_documentos').select('*').eq('avaliacao_id', id).order('created_at', { ascending: false }).limit(10000);
    if (error) throw error;
    return data as any[];
  });
  const canEdit = ctx.can('evaluation.edit');

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) { toast.error('Arquivo maior que 20 MB.'); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = await tenantPath('avaliacao', id, u.user?.id ?? 'anon', `${Date.now()}_${safeName(file.name)}`);
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { error } = await db.from('avaliacao_documentos').insert({
        avaliacao_id: id, categoria, titulo: titulo.trim() || file.name, storage_ref: storageRef('documents', path), nome_arquivo: file.name, tamanho_bytes: file.size,
      });
      if (error) throw error;
      toast.success('Documento anexado.');
      setTitulo('');
      ctx.refresh();
    } catch (e) { toast.error(avalErrorMessage(e, 'Não foi possível anexar o documento.')); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Documentos da avaliação</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Título (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} />
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            <Button onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="h-4 w-4 mr-2" />{busy ? 'Enviando…' : 'Anexar'}</Button>
          </div>
        )}
        {(docs.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> : (
          <ul className="divide-y">
            {(docs.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{d.titulo}</p><p className="text-xs text-muted-foreground">{CATEGORIAS[d.categoria]} · {fmtDateTime(d.created_at)}</p></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openPrivateFile(d.storage_ref, 'documents')}>Abrir</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
