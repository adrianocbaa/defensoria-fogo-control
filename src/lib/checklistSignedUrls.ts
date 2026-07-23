import { supabase } from '@/integrations/supabase/client';

const EXPIRES_IN = 60 * 60; // 1 hour

/**
 * Extract the storage object path for a given bucket from a stored URL.
 * Accepts either a full Supabase public URL or a bare path.
 */
export function extractStoragePath(bucket: string, urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  // If it already looks like a bare path (no protocol), return it
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath.replace(/^\/+/, '');
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/${bucket}/`,
  ];
  for (const m of markers) {
    const idx = urlOrPath.indexOf(m);
    if (idx !== -1) {
      const rest = urlOrPath.slice(idx + m.length);
      // Strip any query string (e.g. existing token)
      return rest.split('?')[0];
    }
  }
  return null;
}

export async function signChecklistUrl(
  bucket: 'checklist-pdfs' | 'checklist-fotos',
  urlOrPath: string | null | undefined,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(bucket, urlOrPath);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, EXPIRES_IN);
  if (error || !data?.signedUrl) {
    console.error('signChecklistUrl error', bucket, path, error);
    return null;
  }
  return data.signedUrl;
}

export async function signChecklistUrls<T extends string | null | undefined>(
  bucket: 'checklist-pdfs' | 'checklist-fotos',
  urls: T[],
): Promise<(string | null)[]> {
  return Promise.all(urls.map((u) => signChecklistUrl(bucket, u)));
}
