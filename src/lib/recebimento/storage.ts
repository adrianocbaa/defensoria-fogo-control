import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'checklist-fotos';
const MAX_DIM = 1600;
const QUALITY = 0.75;

/** Redimensiona/comprime a imagem no cliente antes do upload. */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export interface UploadFotoArgs {
  file: File;
  obraId: string;
  vistoriaId: string;
  ambienteId?: string | null;
  pendenciaId?: string | null;
}

/** Upload isolado do recebimento: recebimento/{obra}/{vistoria}/{ambiente}/... */
export async function uploadRecebimentoFoto({
  file,
  obraId,
  vistoriaId,
  ambienteId,
  pendenciaId,
}: UploadFotoArgs): Promise<string> {
  const blob = await compressImage(file);
  const scope = pendenciaId ? `pendencia_${pendenciaId}` : 'geral';
  const path = `recebimento/${obraId}/${vistoriaId}/${ambienteId ?? 'sem-ambiente'}/${scope}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function signRecebimentoFoto(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function signRecebimentoFotos(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d: any) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}
