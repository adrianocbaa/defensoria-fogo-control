import { drawImageContain, GRAY_LABEL, GRAY_LINE, GRAY_TEXT, MARGIN, type SidifDoc } from '@/lib/pdf/sidifPdf';
import type { FotoPdf } from './pendencias';

/** Baixa a imagem e converte para data URL (mantém storage/URLs intactos). */
export async function carregarImagem(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const LEGENDA_H = 14;

export interface LayoutFotos {
  colunas: number;
  larguraCel: number;
  alturaCel: number;
  linhas: number;
  alturaLinha: number;
  alturaTotal: number;
}

/**
 * 1 foto → centralizada e maior; 2 fotos → duas colunas; 3+ → grid 2 colunas.
 * Sempre com proporção preservada (contain).
 */
export function layoutFotos(qtd: number, contentW: number): LayoutFotos {
  if (qtd <= 0) {
    return { colunas: 0, larguraCel: 0, alturaCel: 0, linhas: 0, alturaLinha: 0, alturaTotal: 0 };
  }
  if (qtd === 1) {
    const larguraCel = Math.min(320, contentW);
    const alturaCel = 210;
    return {
      colunas: 1,
      larguraCel,
      alturaCel,
      linhas: 1,
      alturaLinha: alturaCel + LEGENDA_H,
      alturaTotal: alturaCel + LEGENDA_H,
    };
  }
  const colunas = 2;
  const larguraCel = (contentW - 16) / colunas;
  const alturaCel = qtd === 2 ? 175 : 150;
  const linhas = Math.ceil(qtd / colunas);
  const alturaLinha = alturaCel + LEGENDA_H;
  return { colunas, larguraCel, alturaCel, linhas, alturaLinha, alturaTotal: linhas * alturaLinha };
}

/** Aviso compacto quando não houver registro fotográfico. */
export function semFoto(s: SidifDoc) {
  s.ensure(16);
  s.doc.setFont('helvetica', 'italic');
  s.doc.setFontSize(8);
  s.doc.setTextColor(...GRAY_LABEL);
  s.doc.text('Sem registro fotográfico.', MARGIN, s.y + 8);
  s.doc.setTextColor(...GRAY_TEXT);
  s.y += 14;
}

/**
 * Desenha as fotos linha a linha; quando a linha não couber na página,
 * chama `aoQuebrar` para reimprimir o cabeçalho de continuação.
 */
export async function desenharFotos(
  s: SidifDoc,
  fotos: FotoPdf[],
  aoQuebrar?: () => void,
) {
  if (!fotos.length) return semFoto(s);

  const lay = layoutFotos(fotos.length, s.contentW);
  const offsetX = lay.colunas === 1 ? (s.contentW - lay.larguraCel) / 2 : 0;

  for (let i = 0; i < fotos.length; i += lay.colunas) {
    if (s.y + lay.alturaLinha > s.bottomLimit) {
      s.novaPagina();
      aoQuebrar?.();
    }
    const linhaY = s.y;
    for (let c = 0; c < lay.colunas; c++) {
      const foto = fotos[i + c];
      if (!foto) continue;
      const x = MARGIN + offsetX + c * (lay.larguraCel + 16);

      s.doc.setDrawColor(...GRAY_LINE);
      s.doc.setLineWidth(0.6);
      s.doc.rect(x, linhaY, lay.larguraCel, lay.alturaCel);

      const dataUrl = await carregarImagem(foto.url);
      if (dataUrl) {
        try {
          drawImageContain(s.doc, dataUrl, x + 2, linhaY + 2, lay.larguraCel - 4, lay.alturaCel - 4);
        } catch {
          /* imagem inválida — mantém o quadro vazio */
        }
      } else {
        s.doc.setFont('helvetica', 'italic');
        s.doc.setFontSize(8);
        s.doc.setTextColor(...GRAY_LABEL);
        s.doc.text('Imagem indisponível', x + lay.larguraCel / 2, linhaY + lay.alturaCel / 2, {
          align: 'center',
        });
      }

      s.doc.setFont('helvetica', 'normal');
      s.doc.setFontSize(7.5);
      s.doc.setTextColor(...GRAY_LABEL);
      s.doc.text(foto.legenda, x + lay.larguraCel / 2, linhaY + lay.alturaCel + 10, {
        align: 'center',
      });
      s.doc.setTextColor(...GRAY_TEXT);
    }
    s.y = linhaY + lay.alturaLinha;
  }
}
