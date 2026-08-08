import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/recebimento/storage';

/** Mesmo bucket do checklist, com prefixo isolado da Entrega Institucional. */
const BUCKET = 'checklist-fotos';

export interface UploadArgs {
  file: File;
  obraId: string;
  entregaId: string;
  ambienteId?: string | null;
  pendenciaId?: string | null;
}

export async function uploadEntregaFoto({
  file,
  obraId,
  entregaId,
  ambienteId,
  pendenciaId,
}: UploadArgs): Promise<string> {
  const blob = await compressImage(file);
  const escopo = pendenciaId ? `pendencias/${pendenciaId}` : 'geral';
  // A policy do bucket exige que a 1ª pasta seja o UUID da obra
  const path = `${obraId}/entrega-institucional/${entregaId}/${ambienteId ?? 'sem-ambiente'}/${escopo}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function assinarEntregaFotos(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const map: Record<string, string> = {};
  // createSignedUrls tem limite prático de itens por chamada — envia em lotes
  for (let i = 0; i < paths.length; i += 100) {
    const lote = paths.slice(i, i + 100);
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(lote, 60 * 60);
    (data ?? []).forEach((d: { path?: string | null; signedUrl?: string | null }) => {
      if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    });
  }
  return map;
}
