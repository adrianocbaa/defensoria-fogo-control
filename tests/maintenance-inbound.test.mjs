import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const globals={Response,Request,URL,Uint8Array,TextDecoder,AbortSignal,atob,crypto:webcrypto,fetch};
function load(source){const exports={};vm.runInNewContext(compile(source),{exports,...globals});return exports;}
const attachments=load(await read('supabase/functions/inbound-maintenance-email/attachments.ts'));
const config=load(await read('src/lib/maintenanceInboundConfig.ts'));
const source=await read('supabase/functions/inbound-maintenance-email/index.ts');
const fixture=(mime='application/pdf',filename='report.pdf',size=20)=> {
  const bytes=new Uint8Array(size); bytes.set(mime==='image/png'?[137,80,78,71,13,10,26,10]:[37,80,68,70,45]);
  return {filename,content_type:mime,bytes};
};
const prepare=a=>attachments.prepareAttachments(a,'https://mock.supabase.co');
const rejects=(a,category)=>assert.rejects(prepare(a),e=>e.category===category);
test('normal email without attachment accepts empty batch',async()=>assert.equal((await prepare([])).length,0));
test('one PDF is accepted and routed to private documents',async()=>assert.equal((await prepare([fixture()]))[0].bucket,'documents'));
test('multiple common images are accepted',async()=>assert.equal((await prepare([fixture('image/png','one.png'),fixture('image/png','two.png')])).length,2));
test('10 attachments allowed, 11 blocked',async()=> {assert.equal((await prepare(Array.from({length:10},()=>fixture()))).length,10);await rejects(Array.from({length:11},()=>fixture()),'attachment_count_exceeded');});
test('10 MiB accepted, over 10 MiB blocked by actual bytes',async()=> {await prepare([fixture('application/pdf','a.pdf',10*1024*1024)]);await rejects([fixture('application/pdf','a.pdf',10*1024*1024+1)],'attachment_size_exceeded');});
test('25 MiB accepted, over 25 MiB blocked',async()=> {await prepare([fixture('application/pdf','a.pdf',10*1024*1024),fixture('application/pdf','b.pdf',10*1024*1024),fixture('application/pdf','c.pdf',5*1024*1024)]);await rejects([fixture('application/pdf','a.pdf',10*1024*1024),fixture('application/pdf','b.pdf',10*1024*1024),fixture('application/pdf','c.pdf',5*1024*1024+1)],'attachment_total_exceeded');});
test('executable extension is rejected',async()=>await rejects([fixture('application/pdf','payload.exe')],'attachment_type_not_allowed'));
test('dangerous intermediate extension is rejected',async()=>await rejects([fixture('image/png','payload.exe.png')],'attachment_type_not_allowed'));
test('fake image MIME and extension cannot disguise executable bytes',async()=>await rejects([{filename:'fake.png',content_type:'image/png',bytes:new Uint8Array([77,90,0,0])}],'attachment_type_not_allowed'));
test('MIME and extension must match detected content',async()=>await rejects([fixture('image/png','wrong.pdf')],'attachment_type_not_allowed'));
test('SVG is rejected',async()=>await rejects([{filename:'a.svg',content_type:'image/svg+xml',bytes:new TextEncoder().encode('<svg></svg>')}],'attachment_type_not_allowed'));
test('unknown or internal attachment download URL blocked before fetch',async()=> {let calls=0;await assert.rejects(attachments.prepareAttachments([{filename:'a.pdf',content_url:'http://127.0.0.1/private'}],'https://mock.supabase.co',async()=>{calls++;}),e=>e.category==='attachment_source_not_allowed');assert.equal(calls,0);});
test('bounded download stops when actual bytes exceed limit',async()=>await assert.rejects(attachments.readBounded(new Response(new Uint8Array(101)),100),e=>e.status===413));
test('failed upload compensates earlier uploads and reports failure',async()=> {const removed=[];let n=0;await assert.rejects(attachments.storeAttachments(await prepare([fixture(),fixture()]),'org-a','ticket-a','https://mock.supabase.co',{upload:async()=>{if(++n===2)throw Error('sensitive');},remove:async(b,p)=>removed.push([b,p])}),e=>e.category==='attachment_storage_failed');assert.equal(removed[0][1].length,1);assert.match(removed[0][1][0],/^org-a\/maintenance-inbound\/ticket-a\//);});
test('normalized config fills RPC alias/domains/addresses consistently',()=> {const c=config.normalizeInboundConfig({enabled:true,alias:' ORG-A ',policy:'allowed_domains',domains:'EXAMPLE.ORG\nexample.org',addresses:'Help@Example.org'});assert.equal(c.alias,'org-a');assert.equal(c.domains.join(','),'example.org');assert.equal(c.addresses.join(','),'help@example.org');});
test('domain-only policy requires domains',()=>assert.ok(config.validateInboundConfig({enabled:true,alias:'org-a',policy:'allowed_domains',domains:'',addresses:''})));
test('registered-or-domains policy supports registered users alone',()=>assert.equal(config.validateInboundConfig({enabled:true,alias:'org-a',policy:'registered_or_allowed_domains',domains:'',addresses:''}),null));
test('invalid domains and aliases blocked',()=> {assert.ok(config.validateInboundConfig({enabled:true,alias:'a',policy:'any',domains:'',addresses:''}));assert.ok(config.validateInboundConfig({enabled:true,alias:'org-a',policy:'any',domains:'https://example.org',addresses:''}));});

async function invoke({files=[],subject='Fixture',resolved={ok:true,organization_id:'org-a'},thread=null,secret='fixture-secret',duplicate=false,raw=false,uploadFail=false}={}) {
  let handler; const writes=[]; const uploads=[]; const rpcCalls=[]; const logs=[];
  const client={rpc:async(name,args)=>{rpcCalls.push([name,args]);return {data:resolved};},storage:{from:bucket=>({upload:async(path)=>{uploads.push([bucket,path]);return {error:uploadFail?{message:'sensitive'}:null};},remove:async()=>({error:null})})},from:table=> {
    let mutation=null;
    const q={select:()=>q,eq:()=>q,limit:()=>q,ilike:()=>q,insert:data=>{mutation=data;writes.push([table,'insert',data]);return q;},update:data=>{writes.push([table,'update',data]);return q;},maybeSingle:async()=>({data:table==='maintenance_ticket_emails'&&duplicate?{id:'email-a',ticket_id:'ticket-a'}:table==='maintenance_tickets'?thread:null}),single:async()=>({data:{id:mutation.id,ticket_number:99},error:null}),then:(resolve)=>resolve({data:[],error:null})};return q;
  }};
  const payload={from:{address:'sender@example.invalid'},to:[{address:'org-a@manutencao.sidif.com.br'}],subject,text:'Safe fixture',headers:{'message-id':'fixture-id'},attachments:files.map(f=>({filename:f.filename,content_type:f.content_type,content:Buffer.from(f.bytes).toString('base64')}))};
  vm.runInNewContext(compile(source),{exports:{},...globals,console:{warn:(...a)=>logs.push(a),error:(...a)=>logs.push(a),log:(...a)=>logs.push(a)},Deno:{env:{get:n=>n==='INBOUND_EMAIL_TOKEN'?'fixture-secret':n==='SUPABASE_URL'?'https://mock.supabase.co':'fixture'}},require:name=> {
    if(name==='./attachments.ts')return attachments;
    if(name.includes('/cors'))return {corsHeaders:{'Access-Control-Allow-Origin':'*'}};
    if(name.includes('supabase-js'))return {createClient:()=>client};
    if(name.includes('http/server'))return {serve:f=>handler=f};
    if(name.includes('postal-mime'))return {default:{parse:async()=>({...payload,attachments:files.map(f=>({filename:f.filename,mimeType:f.content_type,content:f.bytes.buffer}))})}};
    throw Error(`unexpected import ${name}`);
  }});
  const response=await handler(new Request('https://mock.invalid/inbound',{method:'POST',headers:{'content-type':raw?'message/rfc822':'application/json','x-sidif-inbound-secret':secret,'x-sidif-envelope-to':'org-a@manutencao.sidif.com.br'},body:raw?'fixture':JSON.stringify(payload)}));
  return {status:response.status,body:await response.json(),writes,uploads,rpcCalls,logs};
}
test('full normal email creates tenant-scoped ticket and email',async()=>{const r=await invoke();assert.equal(r.status,200);assert.equal(r.writes[0][2].organization_id,'org-a');assert.equal(r.writes[1][2].organization_id,'org-a');assert.equal(r.rpcCalls[0][1].p_sender,'sender@example.invalid');});
test('PDF persisted on email row using tenant-private path',async()=>{const r=await invoke({files:[fixture()]});assert.equal(r.status,200);assert.equal(r.uploads[0][0],'documents');assert.match(r.uploads[0][1],/^org-a\/maintenance-inbound\//);assert.equal(r.writes[1][2].attachments.length,1);});
test('MIME mode accepts PDF without dropping it',async()=> {const r=await invoke({files:[fixture()],raw:true});assert.equal(r.status,200);assert.equal(r.uploads.length,1);});
test('invalid batch makes no ticket/email/storage writes',async()=> {const r=await invoke({files:Array.from({length:11},()=>fixture())});assert.equal(r.status,413);assert.equal(r.writes.length,0);assert.equal(r.uploads.length,0);});
test('existing thread preserves attachment and reopening',async()=>{const r=await invoke({files:[fixture()],subject:'[SiDIF #7]',thread:{id:'ticket-a',ticket_number:7,status:'Concluído',confirmed_at:null}});assert.equal(r.status,200);assert.equal(r.body.threaded,true);assert.equal(r.writes[0][2].ticket_id,'ticket-a');assert.equal(r.writes[0][2].attachments.length,1);assert.equal(r.writes[1][2].status,'Em andamento');});
test('cross-tenant unknown thread is rejected without writes',async()=> {const r=await invoke({subject:'[SiDIF #7]'});assert.equal(r.status,404);assert.equal(r.writes.length,0);assert.equal(r.uploads.length,0);});
test('sender rejection preserved before writes',async()=>{const r=await invoke({resolved:{ok:false,reason:'sender_not_allowed'}});assert.equal(r.status,403);assert.equal(r.writes.length,0);});
test('disabled alias resolution rejected before writes',async()=> {const r=await invoke({resolved:{ok:false,reason:'inbound_disabled'}});assert.equal(r.status,400);assert.equal(r.writes.length,0);});
test('shared header secret still required',async()=> {const r=await invoke({secret:'wrong'});assert.equal(r.status,401);assert.equal(r.rpcCalls.length,0);});
test('deduplication preserved without new uploads',async()=> {const r=await invoke({duplicate:true,files:[fixture()]});assert.equal(r.body.duplicated,true);assert.equal(r.uploads.length,0);});
test('storage failure returns sanitized error before ticket creation',async()=> {const r=await invoke({files:[fixture()],uploadFail:true});assert.equal(r.status,503);assert.equal(r.writes.length,0);assert.ok(!JSON.stringify(r.body).includes('sensitive'));assert.ok(!JSON.stringify(r.logs).includes('sensitive'));});