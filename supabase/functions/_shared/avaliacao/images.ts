// Dimensões de imagens PNG/JPEG (para inserir fotos nos documentos sem decodificar a imagem).
export function imageInfo(b: Uint8Array): { tipo: 'png' | 'jpg'; largura: number; altura: number } | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { tipo: 'png', largura: dv.getUint32(16), altura: dv.getUint32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { tipo: 'jpg', altura: (b[i + 5] << 8) | b[i + 6], largura: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
  }
  return null;
}
