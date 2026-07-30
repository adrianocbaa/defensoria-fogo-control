import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'documents';
const EXPIRES_IN = 60 * 60; // 1 hora

/** Extrai o caminho do objeto dentro do bucket a partir de uma URL do Supabase Storage. */
export function extractDocumentPath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath.replace(/^\/+/, '');
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/${BUCKET}/`,
  ];
  for (const m of markers) {
    const idx = urlOrPath.indexOf(m);
    if (idx !== -1) return decodeURIComponent(urlOrPath.slice(idx + m.length).split('?')[0]);
  }
  return null;
}

/**
 * O bucket `documents` é privado — URLs públicas retornam "Bucket not found".
 * Esta função gera uma URL assinada temporária para visualizar/baixar.
 */
export async function getObraDocumentUrl(
  urlOrPath: string,
  opts?: { download?: string },
): Promise<string | null> {
  const path = extractDocumentPath(urlOrPath);
  if (!path) return urlOrPath || null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRES_IN, opts?.download ? { download: opts.download } : undefined);

  if (error || !data?.signedUrl) {
    console.error('getObraDocumentUrl error', path, error);
    return null;
  }
  return data.signedUrl;
}

export async function openObraDocument(urlOrPath: string, nome?: string, download = false) {
  const signed = await getObraDocumentUrl(urlOrPath, download ? { download: nome || true as any } : undefined);
  if (!signed) return false;
  if (download) {
    const a = document.createElement('a');
    a.href = signed;
    a.download = nome || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(signed, '_blank', 'noopener,noreferrer');
  }
  return true;
}
