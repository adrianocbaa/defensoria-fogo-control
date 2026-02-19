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
