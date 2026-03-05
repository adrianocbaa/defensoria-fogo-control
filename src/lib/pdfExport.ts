import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Html2PdfOptions {
  margin?: number | number[];
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: {
    scale?: number;
    useCORS?: boolean;
    logging?: boolean;
    letterRendering?: boolean;
    allowTaint?: boolean;
    width?: number;
    windowWidth?: number;
  };
  jsPDF?: {
    unit?: string;
    format?: string;
    orientation?: 'portrait' | 'landscape';
    compress?: boolean;
  };
  pagebreak?: any;
}

/**
 * Generate a PDF from an HTML element, mimicking html2pdf.js behavior
 * using jspdf + html2canvas (both patched/maintained versions)
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  options: Html2PdfOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    image = { type: 'jpeg', quality: 0.95 },
    html2canvas: canvasOptions = {},
    jsPDF: pdfOptions = {},
  } = options;

  const orientation = pdfOptions.orientation || 'portrait';
  const format = pdfOptions.format || 'a4';

  // Render HTML to canvas
  const canvas = await html2canvas(element, {
    scale: canvasOptions.scale || 2,
    useCORS: canvasOptions.useCORS !== false,
    logging: canvasOptions.logging || false,
    allowTaint: canvasOptions.allowTaint || false,
    width: canvasOptions.width,
    windowWidth: canvasOptions.windowWidth,
  });

  const imgData = canvas.toDataURL(
    `image/${image.type || 'jpeg'}`,
    image.quality || 0.95
  );

  // Create PDF
  const pdf = new jsPDF({
    orientation,
    unit: (pdfOptions.unit as any) || 'mm',
    format,
    compress: pdfOptions.compress !== false,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Parse margins
  let marginTop = 0, marginRight = 0, marginBottom = 0, marginLeft = 0;
  if (options.margin !== undefined) {
    if (Array.isArray(options.margin)) {
      [marginTop, marginRight, marginBottom, marginLeft] = options.margin.length === 4
        ? options.margin
        : [options.margin[0], options.margin[0], options.margin[0], options.margin[0]];
    } else {
      marginTop = marginRight = marginBottom = marginLeft = options.margin;
    }
  }

  const contentWidth = pdfWidth - marginLeft - marginRight;
  const contentHeight = pdfHeight - marginTop - marginBottom;

  // Calculate image dimensions to fit page
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Add pages if content is taller than one page
  let heightLeft = imgHeight;
  let position = marginTop;
  let page = 0;

  while (heightLeft > 0) {
    if (page > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      imgData,
      (image.type || 'jpeg').toUpperCase(),
      marginLeft,
      position - (page * contentHeight),
      imgWidth,
      imgHeight
    );

    heightLeft -= contentHeight;
    position -= contentHeight;
    page++;
  }

  pdf.save(filename);
}

/**
 * Generate a PDF from an HTML element using html2canvas (image-based, same quality as before)
 * with smart page breaks that detect actual <tr> row positions so no row is ever cut.
 */
export async function generatePdfFromElementAutoPage(
  element: HTMLElement,
  options: Html2PdfOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    image = { type: 'jpeg', quality: 0.97 },
    html2canvas: canvasOptions = {},
    jsPDF: pdfOptions = {},
  } = options;

  const orientation = pdfOptions.orientation || 'portrait';
  const format = pdfOptions.format || 'a4';

  // Collect row top/bottom positions relative to element using offsetTop
  // getBoundingClientRect is unreliable when element is off-screen (e.g. top: -99999px)
  const rows = Array.from(element.querySelectorAll('tr')) as HTMLTableRowElement[];
  const rowBounds = rows.map(tr => {
    // Walk up to find cumulative offsetTop relative to our root element
    let top = 0;
    let el: HTMLElement | null = tr;
    while (el && el !== element) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    const bottom = top + tr.offsetHeight;
    return { top, bottom };
  });

  // Render full content as one canvas
  const canvas = await html2canvas(element, {
    scale: canvasOptions.scale || 2,
    useCORS: canvasOptions.useCORS !== false,
    logging: false,
    allowTaint: canvasOptions.allowTaint || false,
    width: canvasOptions.width,
    windowWidth: canvasOptions.windowWidth,
  });

  const imgData = canvas.toDataURL(
    `image/${image.type || 'jpeg'}`,
    image.quality || 0.97
  );

  const pdf = new jsPDF({
    orientation,
    unit: (pdfOptions.unit as any) || 'mm',
    format,
    compress: pdfOptions.compress !== false,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  let marginTop = 0, marginRight = 0, marginBottom = 0, marginLeft = 0;
  if (options.margin !== undefined) {
    if (Array.isArray(options.margin)) {
      [marginTop, marginRight, marginBottom, marginLeft] = options.margin.length === 4
        ? options.margin
        : [options.margin[0], options.margin[0], options.margin[0], options.margin[0]];
    } else {
      marginTop = marginRight = marginBottom = marginLeft = options.margin;
    }
  }

  const contentWidth = pdfWidth - marginLeft - marginRight;
  const contentHeight = pdfHeight - marginTop - marginBottom;

  // Scale factor: canvas pixels → PDF mm
  const scale = contentWidth / canvas.width;
  const totalImgHeightMm = canvas.height * scale;

  // Build smart page-break points using row positions
  // Convert pixel row positions to mm using same scale
  const rowBottomsMm = rowBounds.map(r => r.bottom * scale);
  const rowTopsMm    = rowBounds.map(r => r.top * scale);

  // Find break points: when a row would be cut by a page boundary, break before that row
  const pageBreaks: number[] = [0]; // start of first page in mm
  let pageStart = 0;

  while (true) {
    const pageEnd = pageStart + contentHeight;
    if (pageEnd >= totalImgHeightMm) break; // last page, no break needed

    // Find the last row that fits entirely within this page
    let breakAt = pageEnd;
    for (let i = rowBottomsMm.length - 1; i >= 0; i--) {
      if (rowTopsMm[i] >= pageStart && rowBottomsMm[i] > pageEnd) {
        // This row is cut — move break to before this row
        breakAt = rowTopsMm[i];
        break;
      }
    }

    pageBreaks.push(breakAt);
    pageStart = breakAt;
  }

  // Render each page slice
  for (let p = 0; p < pageBreaks.length; p++) {
    if (p > 0) pdf.addPage();

    const sliceStartMm = pageBreaks[p];
    const sliceEndMm = p + 1 < pageBreaks.length ? pageBreaks[p + 1] : totalImgHeightMm;
    const sliceHeightMm = sliceEndMm - sliceStartMm;

    // Convert slice to canvas pixels
    const srcY = Math.round(sliceStartMm / scale);
    const srcH = Math.round(sliceHeightMm / scale);

    // Crop canvas to this slice
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = srcH;
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    const sliceData = sliceCanvas.toDataURL(
      `image/${image.type || 'jpeg'}`,
      image.quality || 0.97
    );

    pdf.addImage(sliceData, (image.type || 'jpeg').toUpperCase(), marginLeft, marginTop, contentWidth, sliceHeightMm);
  }

  pdf.save(filename);
}

/**
 * Generate a PDF from an HTML element and return as Blob
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  options: Html2PdfOptions = {}
): Promise<Blob> {
  const {
    image = { type: 'jpeg', quality: 0.98 },
    html2canvas: canvasOptions = {},
    jsPDF: pdfOptions = {},
  } = options;

  const orientation = pdfOptions.orientation || 'portrait';
  const format = pdfOptions.format || 'a4';

  const canvas = await html2canvas(element, {
    scale: canvasOptions.scale || 2,
    useCORS: canvasOptions.useCORS !== false,
    logging: false,
    allowTaint: canvasOptions.allowTaint || false,
    width: canvasOptions.width,
    windowWidth: canvasOptions.windowWidth,
  });

  const imgData = canvas.toDataURL(
    `image/${image.type || 'jpeg'}`,
    image.quality || 0.98
  );

  const pdf = new jsPDF({
    orientation,
    unit: (pdfOptions.unit as any) || 'mm',
    format,
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  let marginTop = 0, marginRight = 0, marginLeft = 0;
  if (options.margin !== undefined) {
    if (Array.isArray(options.margin)) {
      [marginTop, marginRight, , marginLeft] = options.margin.length === 4
        ? options.margin
        : [options.margin[0], options.margin[0], options.margin[0], options.margin[0]];
    } else {
      marginTop = marginRight = marginLeft = options.margin;
    }
  }

  const contentWidth = pdfWidth - marginLeft - marginRight;
  const contentHeight = pdfHeight - marginTop;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginTop;
  let page = 0;

  while (heightLeft > 0) {
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', marginLeft, position - (page * contentHeight), imgWidth, imgHeight);
    heightLeft -= contentHeight;
    position -= contentHeight;
    page++;
  }

  return pdf.output('blob');
}
