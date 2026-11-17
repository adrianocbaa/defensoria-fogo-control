// PNG mínimo (RGB 8 bits) e base64 puros — usados pelos gráficos e imagens do laudo no navegador, no servidor e nos testes.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INV = (() => { const t = new Int16Array(256).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();

export function b64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0; let buf = 0; let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | B64_INV[clean.charCodeAt(i)]; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

export function bytesToB64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function adler32(b: Uint8Array): number { let a = 1, d = 0; for (let i = 0; i < b.length; i++) { a = (a + b[i]) % 65521; d = (d + a) % 65521; } return ((d << 16) | a) >>> 0; }

/** zlib sem compressão (blocos "stored"): sempre disponível, usado quando o ambiente não tem CompressionStream. */
export function zlibStored(data: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(data.length / 65535));
  const out = new Uint8Array(2 + data.length + blocks * 5 + 4);
  out[0] = 0x78; out[1] = 0x01; let o = 2;
  for (let i = 0; i < blocks; i++) {
    const s = i * 65535; const len = Math.min(65535, data.length - s);
    out[o++] = i === blocks - 1 ? 1 : 0; out[o++] = len & 0xff; out[o++] = len >> 8; out[o++] = ~len & 0xff; out[o++] = (~len >> 8) & 0xff;
    out.set(data.subarray(s, s + len), o); o += len;
  }
  const a = adler32(data); out[o++] = a >>> 24; out[o++] = (a >>> 16) & 0xff; out[o++] = (a >>> 8) & 0xff; out[o++] = a & 0xff;
  return out;
}

export type Deflate = (data: Uint8Array) => Promise<Uint8Array>;

/** zlib (formato "deflate" das Compression Streams), com recurso ao modo sem compressão. */
export const zlibDeflate: Deflate = async (data) => {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (typeof g.CompressionStream !== 'function' || typeof g.Blob !== 'function' || typeof g.Response !== 'function') return zlibStored(data);
  try {
    const stream = new g.Blob([data]).stream().pipeThrough(new g.CompressionStream('deflate'));
    return new Uint8Array(await new g.Response(stream).arrayBuffer());
  } catch { return zlibStored(data); }
};

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Codifica pixels RGB (3 bytes por pixel, linha a linha) em PNG. */
export async function encodePng(rgb: Uint8Array, w: number, h: number, deflate: Deflate = zlibDeflate): Promise<Uint8Array> {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
