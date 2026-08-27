import { GRAY_LABEL, GRAY_LINE, GRAY_TEXT, MARGIN, type SidifDoc } from '@/lib/pdf/sidifPdf';
import type { ChecklistAmbiente } from '@/hooks/useChecklistDinamico';
import { indicePins, statusCor, statusLabel } from './pendencias';

/** Renderiza a página do projeto (PDF) como imagem via pdf.js. */
async function renderizarPagina(
  pdfUrl: string,
  pageNum: number,
  targetWidthPx = 1600,
): Promise<string | null> {
  try {
    const lib = (window as unknown as { pdfjsLib?: any }).pdfjsLib;
    if (!lib) return null;
    const pdfDoc = await lib.getDocument({ url: pdfUrl, withCredentials: false }).promise;
    const page = await pdfDoc.getPage(pageNum);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = targetWidthPx / vp0.width;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

/**
 * Planta de localização: uma seção por página do projeto que tenha pins.
 * Coordenadas, numeração e vínculo dos pins permanecem exatamente como hoje.
 */
export async function desenharPlanta(
  s: SidifDoc,
  ambientes: ChecklistAmbiente[],
  pdfUrl?: string,
  _totalPaginas?: number,
) {
  if (!pdfUrl) return;

  const pins = indicePins(ambientes);
  const porPagina = new Map<number, ChecklistAmbiente[]>();
  ambientes.forEach((a) => {
    if (!porPagina.has(a.pagina)) porPagina.set(a.pagina, []);
    porPagina.get(a.pagina)!.push(a);
  });

  const paginas = Array.from(porPagina.keys())
    .filter((pg) => (porPagina.get(pg) ?? []).some((a) => a.servicos.some((sv) => sv.location_pin)))
    .sort((a, b) => a - b);

  if (!paginas.length) return;

  for (const pagina of paginas) {
    const imagem = await renderizarPagina(pdfUrl, pagina);
    s.novaPagina();
    s.section(`Planta de localização — página ${pagina}`);

    const plantaW = s.contentW;
    const plantaH = Math.min(430, s.bottomLimit - s.y - 20);
    const topo = s.y;

    s.doc.setDrawColor(...GRAY_LINE);
    s.doc.setLineWidth(0.6);
    s.doc.rect(MARGIN, topo, plantaW, plantaH);

    if (imagem) {
      s.doc.addImage(imagem, 'JPEG', MARGIN, topo, plantaW, plantaH, undefined, 'FAST');
    } else {
      s.doc.setFont('helvetica', 'italic');
      s.doc.setFontSize(9);
      s.doc.setTextColor(...GRAY_LABEL);
      s.doc.text('Planta indisponível para renderização.', MARGIN + plantaW / 2, topo + plantaH / 2, {
        align: 'center',
      });
      s.doc.setTextColor(...GRAY_TEXT);
    }

    const daPagina = porPagina.get(pagina) ?? [];
    const legenda: string[][] = [];

    daPagina.forEach((amb) => {
      amb.servicos.forEach((sv) => {
        const pin = sv.location_pin;
        if (!pin) return;
        const num = pins.get(sv.id) ?? 0;
        const [r, g, b] = statusCor(sv.status);
        const px = MARGIN + (pin.x / 100) * plantaW;
        const py = topo + (pin.y / 100) * plantaH;

        s.doc.setFillColor(r, g, b);
        s.doc.setDrawColor(255, 255, 255);
        s.doc.setLineWidth(1.2);
        s.doc.circle(px, py, 7, 'FD');
        s.doc.setFont('helvetica', 'bold');
        s.doc.setFontSize(num > 9 ? 6.5 : 8);
        s.doc.setTextColor(255, 255, 255);
        s.doc.text(String(num), px, py + (num > 9 ? 2.2 : 2.8), { align: 'center' });
        s.doc.setTextColor(...GRAY_TEXT);

        legenda.push([String(num), amb.nome, sv.descricao, statusLabel(sv.status)]);
      });
    });

    s.y = topo + plantaH + 14;

    if (legenda.length) {
      s.table({
        head: [['Pin', 'Ambiente', 'Verificação', 'Situação']],
        body: legenda,
        styles: { fontSize: 8, cellPadding: 3.4, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 34, halign: 'center' },
          1: { cellWidth: 130 },
          3: { cellWidth: 80 },
        },
      });
    }
  }
}
