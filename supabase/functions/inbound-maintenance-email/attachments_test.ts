import { assertEquals, assertRejects } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import PostalMime from 'npm:postal-mime@2.2.7';
import { AttachmentError, prepareAttachments, ATTACHMENT_LIMITS } from './attachments.ts';

Deno.test('PDF in actual MIME parser is preserved and validated', async () => {
  const raw = ['From: fixture@example.invalid','To: org@manutencao.sidif.com.br','Subject: Fixture','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="safe"','','--safe','Content-Type: text/plain','','Fixture','--safe','Content-Type: application/pdf','Content-Disposition: attachment; filename="fixture.pdf"','Content-Transfer-Encoding: base64','','JVBERi0xLjQKJSVFT0Y=','--safe--'].join('\r\n');
  const parsed = await PostalMime.parse(raw);
  const prepared = await prepareAttachments(parsed.attachments.map(a=>({filename:a.filename || '',content_type:a.mimeType,bytes:new Uint8Array(a.content as ArrayBuffer)})), 'https://mock.supabase.co');
  assertEquals(prepared.length,1);
  assertEquals(prepared[0].mime,'application/pdf');
  assertEquals(prepared[0].bucket,'documents');
});
Deno.test('technical limits are 10 files, 10 MiB each and 25 MiB total', () => {
  assertEquals(ATTACHMENT_LIMITS,{count:10,fileBytes:10485760,totalBytes:26214400});
});
Deno.test('invalid batch rejects before storage', async () => {
  await assertRejects(()=>prepareAttachments(Array.from({length:11},()=>({})), 'https://mock.supabase.co'),AttachmentError,'attachment_count_exceeded');
});