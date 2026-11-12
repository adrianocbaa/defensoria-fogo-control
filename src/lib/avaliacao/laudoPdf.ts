// Documentos do laudo no navegador (rascunho). A emissão oficial usa o mesmo módulo no servidor.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as docx from 'docx';
import { buildLaudoDocx as buildDocx, buildLaudoPdf as buildPdf, type LaudoData } from '../../../supabase/functions/_shared/avaliacao/laudoDoc.ts';

export { foundationFrom, issuedLaudoData, resolveTokens, snapAmostra, type LaudoData } from '../../../supabase/functions/_shared/avaliacao/laudoDoc.ts';

export const buildLaudoPdf = (d: LaudoData): jsPDF => buildPdf(d, { jsPDF, autoTable });
export const buildLaudoDocxBlob = (d: LaudoData): Promise<Blob> => docx.Packer.toBlob(buildDocx(d, docx));
