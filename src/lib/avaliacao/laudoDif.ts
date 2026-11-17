// Laudo institucional DIF no navegador (rascunho): mesmo snapshot, mesma composição e mesmos renderizadores da emissão.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as docx from 'docx';
import { composeDif, type DocModel, type Img } from '../../../supabase/functions/_shared/avaliacao/laudoDif.ts';
import { renderDifDocx, renderDifPdf } from '../../../supabase/functions/_shared/avaliacao/laudoDifRender.ts';
import { imageInfo } from '../../../supabase/functions/_shared/avaliacao/images.ts';
import { db, rpc } from './api';

export { LAYOUT_DIF, MIDIA_CATEGORIAS } from '../../../supabase/functions/_shared/avaliacao/laudoDif.ts';
export * from '../../../supabase/functions/_shared/avaliacao/laudoSecoes.ts';

export async function buildDifDraft(laudoVersaoId: string): Promise<DocModel> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = await rpc<any>('aval_laudo_snapshot', { p_laudo_versao: laudoVersaoId });
  const midias = new Map<string, Img>();
  await Promise.all(((snap?.midias ?? []) as { id: string; bucket: string; path: string }[]).map(async (m) => {
    const { data } = await db.storage.from(m.bucket).download(m.path);
    if (!data) return;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const info = imageInfo(bytes);
    if (info) midias.set(m.id, { data: bytes, ...info });
  }));
  return composeDif(snap, { midias }, { rascunho: true });
}
export const difPdf = (m: DocModel): jsPDF => renderDifPdf(m, { jsPDF, autoTable });
export const difDocxBlob = (m: DocModel): Promise<Blob> => docx.Packer.toBlob(renderDifDocx(m, docx));
