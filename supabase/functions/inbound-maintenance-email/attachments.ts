export const ATTACHMENT_LIMITS = Object.freeze({ count: 10, fileBytes: 10 * 1024 * 1024, totalBytes: 25 * 1024 * 1024 });
export const MAX_REQUEST_BYTES = 40 * 1024 * 1024;

export class AttachmentError extends Error {
  constructor(public category: string, public status = 400) { super(category); }
}
export type IncomingAttachment = { filename?: string; content_type?: string; content?: string; content_url?: string; size?: number; bytes?: Uint8Array };
export type PreparedAttachment = { filename: string; mime: string; bytes: Uint8Array; bucket: string };

export async function readBounded(response: Response | Request, max: number): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > max) throw new AttachmentError('attachment_size_exceeded', 413);
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length;
      if (total > max) { await reader.cancel(); throw new AttachmentError('attachment_size_exceeded', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

function sniff(b: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.subarray(start, end));
  const starts = (...s: number[]) => s.every((v, i) => b[i] === v);
  if (starts(0x25,0x50,0x44,0x46,0x2d)) return 'application/pdf';
  if (starts(0xff,0xd8,0xff)) return 'image/jpeg';
  if (starts(137,80,78,71,13,10,26,10)) return 'image/png';
  if (['GIF87a','GIF89a'].includes(ascii(0,6))) return 'image/gif';
  if (ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP') return 'image/webp';
  if (ascii(0,2)==='BM' && b.length>=14) return 'image/bmp';
  if (starts(73,73,42,0) || starts(77,77,0,42)) return 'image/tiff';
  if (ascii(4,8)==='ftyp') {
    const brand=ascii(8,12);
    if (['heic','heix','hevc','hevx'].includes(brand)) return 'image/heic';
    if (['mif1','msf1'].includes(brand)) return 'image/heif';
  }
  return null;
}
const EXTENSIONS: Record<string,string[]> = {
  'application/pdf':['pdf'], 'image/jpeg':['jpg','jpeg'], 'image/png':['png'], 'image/gif':['gif'],
  'image/webp':['webp'], 'image/bmp':['bmp'], 'image/tiff':['tif','tiff'], 'image/heic':['heic'], 'image/heif':['heif'],
};
const MIME_ALIASES: Record<string,string> = { 'image/jpg':'image/jpeg','image/pjpeg':'image/jpeg','image/x-ms-bmp':'image/bmp','image/x-tiff':'image/tiff' };

export async function prepareAttachments(attachments: IncomingAttachment[], supabaseUrl: string, fetcher: typeof fetch = fetch): Promise<PreparedAttachment[]> {
  if (attachments.length > ATTACHMENT_LIMITS.count) throw new AttachmentError('attachment_count_exceeded',413);
  let total = 0; const result: PreparedAttachment[] = [];
  for (const att of attachments) {
    if (att.size != null && (!Number.isSafeInteger(att.size) || att.size < 0)) throw new AttachmentError('invalid_attachment');
    if ((att.size ?? 0) > ATTACHMENT_LIMITS.fileBytes) throw new AttachmentError('attachment_size_exceeded',413);
    let bytes = att.bytes;
    if (!bytes && att.content != null) {
      const compact = att.content.replace(/\s/g,'');
      if (compact.length > Math.ceil(ATTACHMENT_LIMITS.fileBytes/3)*4) throw new AttachmentError('attachment_size_exceeded',413);
      try { const binary=atob(compact); bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)); }
      catch { throw new AttachmentError('invalid_attachment'); }
    }
    if (!bytes && att.content_url) {
      let url: URL; try { url=new URL(att.content_url); } catch { throw new AttachmentError('attachment_source_not_allowed'); }
      const host=url.hostname.toLowerCase();
      const allowed=host===new URL(supabaseUrl).hostname || host==='resend.com' || host.endsWith('.resend.com') || host==='resend.dev' || host.endsWith('.resend.dev');
      if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443') || !allowed) throw new AttachmentError('attachment_source_not_allowed');
      let response: Response;
      try { response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(15000)}); }
      catch { throw new AttachmentError('attachment_download_failed',502); }
      if (!response.ok) throw new AttachmentError('attachment_download_failed',502);
      bytes=await readBounded(response,ATTACHMENT_LIMITS.fileBytes);
    }
    if (!bytes?.length) throw new AttachmentError('invalid_attachment');
    if (bytes.length>ATTACHMENT_LIMITS.fileBytes) throw new AttachmentError('attachment_size_exceeded',413);
    total+=bytes.length;
    if (total>ATTACHMENT_LIMITS.totalBytes) throw new AttachmentError('attachment_total_exceeded',413);
    const mime=sniff(bytes); const raw=att.filename || '';
    const ext=raw.split('.').pop()?.toLowerCase() || '';
    const declared=(att.content_type || '').split(';')[0].trim().toLowerCase();
    if (!mime || !EXTENSIONS[mime]?.includes(ext) || (declared && declared!=='application/octet-stream' && (MIME_ALIASES[declared] || declared)!==mime)) throw new AttachmentError('attachment_type_not_allowed',415);
    // Reject dangerous intermediate extensions as well (e.g. payload.exe.jpg).
    if (/(?:^|\.)(exe|com|bat|cmd|ps1|js|vbs|scr|msi|jar|html?|svg|sh|dll)(?:\.|$)/i.test(raw)) throw new AttachmentError('attachment_type_not_allowed',415);
    result.push({ filename:raw.replace(/[^\w.\-]+/g,'_').slice(0,120), mime, bytes,
      bucket:['image/jpeg','image/png','image/gif','image/webp'].includes(mime)?'service-photos':'documents' });
  }
  return result;
}

export type StoredAttachment = { id: string; url: string; bucket: string; path: string; description: string; content_type: string; size: number; uploaded_at: string; uploaded_by: null; uploaded_by_name: string };
type StorageAdapter = { upload: (bucket: string,path: string,bytes: Uint8Array,mime: string)=>Promise<void>; remove:(bucket: string,paths: string[])=>Promise<void> };
export async function cleanupAttachments(stored: StoredAttachment[], storage: StorageAdapter) {
  for (const bucket of [...new Set(stored.map(a=>a.bucket))]) await storage.remove(bucket,stored.filter(a=>a.bucket===bucket).map(a=>a.path));
}
export async function storeAttachments(prepared: PreparedAttachment[], orgId: string, ticketId: string, supabaseUrl: string, storage: StorageAdapter): Promise<StoredAttachment[]> {
  const stored: StoredAttachment[]=[];
  try {
    for (const a of prepared) {
      const id=crypto.randomUUID(); const path=`${orgId}/maintenance-inbound/${ticketId}/${id}-${a.filename}`;
      await storage.upload(a.bucket,path,a.bytes,a.mime);
      stored.push({id,bucket:a.bucket,path,description:a.filename,content_type:a.mime,size:a.bytes.length,
        url:`${supabaseUrl}/storage/v1/object/public/${a.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`,
        uploaded_at:new Date().toISOString(),uploaded_by:null,uploaded_by_name:'E-mail (solicitante)'});
    }
    return stored;
  } catch {
    try { await cleanupAttachments(stored,storage); } catch { throw new AttachmentError('attachment_cleanup_failed',500); }
    throw new AttachmentError('attachment_storage_failed',503);
  }
}