// Preparo de imagens do laudo no navegador: orientação correta, proporção preservada, tamanho controlado e
// páginas de PDF convertidas em imagem (o documento original é inserido como imagem, nunca reinterpretado).
import { supabase } from '@/integrations/supabase/client';
import { tenantPath } from '@/lib/privateStorage';
import { imageInfo } from '../../../supabase/functions/_shared/avaliacao/images.ts';
import { db, sha256Hex } from './api';

export const MIDIA_MAX_BYTES = 15 * 1024 * 1024;
const MAX_LADO = 2400;
const safeName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);

async function canvasBlob(c: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q));
}

/** Reduz para no máximo 2400 px no maior lado (sem cortar) e aplica a orientação gravada pela câmera. */
export async function prepararImagem(file: File): Promise<Blob> {
  const png = file.type === 'image/png';
  if (!png && file.type !== 'image/jpeg') throw new Error('aval:invalid_value');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size <= 4 * 1024 * 1024 && png) return file;
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!; if (!png) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return canvasBlob(c, png ? 'image/png' : 'image/jpeg', png ? undefined : 0.88);
}

/** Converte cada página de um PDF em imagem JPEG (até 30 páginas). */
export async function paginasPdf(file: File): Promise<Blob[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: Blob[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
    const page = await doc.getPage(p);
    const vp0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 1654 / vp0.width });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.push(await canvasBlob(c, 'image/jpeg', 0.9));
  }
  return out;
}

export interface NovaMidia { categoria: string; legenda?: string | null; fonte?: string | null; ano?: number | null; amostra_id?: string | null; ordem: number; documento_grupo?: string | null; pagina?: number | null; nome: string }

/** Envia a imagem para a pasta da avaliação (organização/avaliação) e registra a mídia com SHA-256 e dimensões. */
export async function enviarMidia(avaliacaoId: string, blob: Blob, m: NovaMidia) {
  if (blob.size > MIDIA_MAX_BYTES) throw new Error('aval:file_too_large');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const info = imageInfo(bytes);
  if (!info) throw new Error('aval:invalid_value');
  const { data: u } = await supabase.auth.getUser();
  const ext = info.tipo === 'png' ? 'png' : 'jpg';
  const path = await tenantPath('avaliacao', avaliacaoId, 'laudo-midias', u.user?.id ?? 'anon', `${Date.now()}_${safeName(m.nome).replace(/\.[a-z0-9]+$/i, '')}.${ext}`);
  const mime = info.tipo === 'png' ? 'image/png' : 'image/jpeg';
  const { error: upErr } = await supabase.storage.from('documents').upload(path, bytes, { upsert: false, contentType: mime });
  if (upErr) throw upErr;
  const { error } = await db.from('laudo_midias').insert({
    avaliacao_id: avaliacaoId, categoria: m.categoria, storage_bucket: 'documents', storage_path: path, nome_arquivo: m.nome.slice(0, 255), mime_type: mime,
    largura: info.largura, altura: info.altura, file_size: bytes.byteLength, sha256: await sha256Hex(bytes.buffer as ArrayBuffer),
    legenda: m.legenda?.trim() || null, fonte: m.fonte?.trim() || null, ano: m.ano ?? null, ordem: m.ordem, amostra_id: m.categoria === 'AMOSTRA_MERCADO' ? m.amostra_id ?? null : null,
    documento_grupo: m.documento_grupo ?? null, pagina: m.pagina ?? null,
  });
  if (error) { await supabase.storage.from('documents').remove([path]); throw error; }
}
