// Avaliações V1 — execução oficial do motor estatístico (servidor).
// Fluxo: chamador validado → avaliação carregada → mesma organização → permissão por avaliação
// (RPC aval_can_edit com o JWT do usuário) → só então grava com service_role.
// O motor nunca decide: apenas calcula, valida por política versionada e projeta após aceite humano.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { adminClient, assertSameOrg, GuardError, guardResponse, resolveCaller } from '../_shared/tenant-guard.ts';
import {
  canonicalJson, describeEngineError, ENGINE_NAME, ENGINE_VERSION, EngineError, fitRegression, project,
  type PrecisionBand, type RegressionInput, type RegressionResult, type TransformCode,
} from '../_shared/avaliacao/engine.ts';
import { type CookRule, type FoundationGrade, type FoundationPolicy, type ManualDecision, type PolicyRule, validateModel, type VariableMeta } from '../_shared/avaliacao/validator.ts';
import { buildRunPayload, buildValidationPayload } from '../_shared/avaliacao/persist.ts';
import { buildLaudoDocx, buildLaudoPdf, issuedLaudoData, type LaudoData } from '../_shared/avaliacao/laudoDoc.ts';
import { imageInfo } from '../_shared/avaliacao/images.ts';
import { AI_CONTEXTS, AI_PROMPT_VERSION, AI_PURPOSE, type AiContext, checkAiText, systemPrompt } from '../_shared/avaliacao/aiText.ts';
import { jsPDF } from 'npm:jspdf@4.2.1';
import { autoTable } from 'npm:jspdf-autotable@5.0.8';
import * as docx from 'npm:docx@9.5.1';
import {
  AuthenticationError, ConfigurationError, GatewayError, generateResponse, PaymentRequiredError, PermissionDeniedError, RateLimitError,
} from 'npm:@lovable.dev/ai-gateway@0.1.11';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('run_model'), modelo_id: z.string().uuid() }),
  z.object({ action: z.literal('run_validation'), modelo_id: z.string().uuid() }),
  z.object({ action: z.literal('project'), acceptance_id: z.string().uuid() }),
  z.object({ action: z.literal('issue_files'), emissao_id: z.string().uuid() }),
  z.object({ action: z.literal('ai_generate'), secao_id: z.string().uuid(), context_type: z.enum(AI_CONTEXTS), modo: z.enum(['GERAR', 'MELHORAR']) }),
]);

const ISSUED_BUCKET = 'avaliacao-emitidos';
const AI_MODEL = 'openai/gpt-6-astra' as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256(text: string | Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', typeof text === 'string' ? new TextEncoder().encode(text) : text);
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Caller = Awaited<ReturnType<typeof resolveCaller>>;

async function authorize(req: Request, admin: SupabaseClient, caller: Caller, avaliacaoId: string, perm: string, onlyActive = true) {
  const { data: av } = await admin.from('avaliacoes').select('id, organization_id, status, codigo').eq('id', avaliacaoId).maybeSingle();
  if (!av) throw new GuardError(404, 'not_found');
  assertSameOrg(caller, av.organization_id);
  // aval_can_edit exige avaliação ativa; ações sobre emissões concluídas usam aval_has_perm (mesmo papel na avaliação).
  const { data: ok, error } = await userClient(req).rpc(onlyActive ? 'aval_can_edit' : 'aval_has_perm', { _avaliacao: avaliacaoId, _perm: perm });
  if (error || ok !== true) throw new GuardError(403, 'forbidden');
  return { caller: caller as { kind: 'user'; userId: string }, av };
}

async function loadPolicy(admin: SupabaseClient, orgId: string) {
  const { data: ovp } = await admin.from('organization_validation_policy').select('policy_id').eq('organization_id', orgId).maybeSingle();
  let q = admin.from('validation_policies').select('id, parametros, versao, codigo');
  q = ovp?.policy_id ? q.eq('id', ovp.policy_id) : q.is('organization_id', null).eq('status', 'VIGENTE').order('versao', { ascending: false }).limit(1);
  const { data: pols } = await q;
  const pol = pols?.[0];
  if (!pol) throw new GuardError(500, 'policy_missing');
  const { data: rules } = await admin.from('validation_policy_rules').select('*').eq('policy_id', pol.id).order('numero');
  const bands: PrecisionBand[] = ((pol.parametros as any)?.precisao_graus ?? []).map((g: any) => ({ grau: g.grau, maxAmplitudePct: Number(g.max) }));
  const normality = ((rules ?? []) as PolicyRule[]).find((r) => r.codigo === 'NORMALIDADE' && r.ativo)?.thresholds ?? null;
  const foundation = ((pol.parametros as any)?.fundamentacao ?? null) as FoundationPolicy | null;
  return { policy: pol, rules: (rules ?? []) as PolicyRule[], bands, normality, foundation };
}

/** Regra operacional de Cook configurada pela organização (procedimento interno); sem ela vale a da política. */
async function loadCookRule(admin: SupabaseClient, orgId: string): Promise<CookRule | null> {
  const { data } = await admin.from('avaliacao_modeling_settings').select('organization_id, cook_regra').or(`organization_id.eq.${orgId},organization_id.is.null`);
  const own = (data ?? []).find((r: any) => r.organization_id === orgId);
  return ((own?.cook_regra ?? (data ?? []).find((r: any) => r.organization_id === null)?.cook_regra) ?? null) as CookRule | null;
}

interface ModelBundle {
  modelo: any;
  depVar: any;
  indepVars: { mv: any; v: any }[];
  input: RegressionInput;
  avaliando: Record<string, number>;
  sampleMeta: { amostra_id: string; snapshot_hash: string }[];
}

async function loadModel(admin: SupabaseClient, modeloId: string): Promise<ModelBundle> {
  const { data: modelo } = await admin.from('avaliacao_modelos').select('*').eq('id', modeloId).maybeSingle();
  if (!modelo) throw new GuardError(404, 'not_found');
  const [{ data: mvs }, { data: vars }, { data: snaps }, { data: avVals }] = await Promise.all([
    admin.from('avaliacao_modelo_variaveis').select('*').eq('modelo_id', modeloId).order('ordem'),
    admin.from('avaliacao_variaveis').select('*').eq('avaliacao_id', modelo.avaliacao_id),
    admin.from('avaliacao_amostra_snapshots').select('amostra_id, hash, dados').eq('conjunto_id', modelo.conjunto_id).order('amostra_id').limit(10000),
    admin.from('avaliacao_variavel_valores').select('variavel_id, valor').eq('avaliacao_id', modelo.avaliacao_id).eq('scope_type', 'AVALIANDO').limit(10000),
  ]);
  const byId = new Map((vars ?? []).map((v: any) => [v.id, v]));
  const depVar = byId.get(modelo.dependente_variavel_id);
  if (!depVar) throw new EngineError('INVALID_INPUT', { reason: 'dependent_missing' });
  const indepVars = (mvs ?? []).map((mv: any) => ({ mv, v: byId.get(mv.variavel_id) }));
  const excl = new Set<string>(modelo.amostras_excluidas ?? []);
  const used = (snaps ?? []).filter((s: any) => s.dados?.habilitada_modelo !== false && !excl.has(s.amostra_id));
  const col = (code: string) => used.map((s: any) => {
    const raw = s.dados?.variaveis?.[code];
    return raw === null || raw === undefined ? NaN : Number(raw);
  });
  const input: RegressionInput = {
    sampleIds: used.map((s: any) => s.amostra_id),
    dependent: { code: depVar.codigo, transform: modelo.dependente_transformacao as TransformCode, power: modelo.dependente_power ?? undefined, values: col(depVar.codigo) },
    independents: indepVars.map(({ mv, v }) => ({ code: v.codigo, transform: mv.transformacao as TransformCode, power: mv.power ?? undefined, values: col(v.codigo) })),
  };
  const avaliando: Record<string, number> = {};
  for (const r of avVals ?? []) {
    const v = byId.get((r as any).variavel_id);
    if (v && (r as any).valor !== null) avaliando[v.codigo] = Number((r as any).valor);
  }
  return { modelo, depVar, indepVars, input, avaliando, sampleMeta: used.map((s: any) => ({ amostra_id: s.amostra_id, snapshot_hash: s.hash })) };
}

async function runModel(req: Request, admin: SupabaseClient, caller0: Caller, modeloId: string) {
  const { data: m0 } = await admin.from('avaliacao_modelos').select('avaliacao_id, organization_id, status').eq('id', modeloId).maybeSingle();
  if (!m0) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, caller0, m0.avaliacao_id, 'model.run');
  const { data: prev } = await admin.from('avaliacao_modelo_execucoes').select('id').eq('modelo_id', modeloId).eq('status', 'SUCESSO').limit(1);
  if (prev && prev.length) return json(409, { error: 'model_already_executed', message: 'Este modelo já foi calculado e é imutável. Duplique-o para alterar.' });
  const b = await loadModel(admin, modeloId);
  const pol = await loadPolicy(admin, m0.organization_id);
  const { bands } = pol;
  const startedAt = new Date().toISOString();
  const inputSnapshot = {
    engine: { name: ENGINE_NAME, version: ENGINE_VERSION },
    modelo: { id: b.modelo.id, numero: b.modelo.numero, conjunto_id: b.modelo.conjunto_id, dependente: b.depVar.codigo,
      dependente_transformacao: b.modelo.dependente_transformacao, dependente_power: b.modelo.dependente_power,
      nivel_confianca: b.modelo.nivel_confianca, amostras_excluidas: b.modelo.amostras_excluidas },
    variaveis: b.indepVars.map(({ mv, v }) => ({ codigo: v.codigo, transformacao: mv.transformacao, power: mv.power })),
    amostras: b.sampleMeta, regression_input: b.input, avaliando: b.avaliando,
  };
  const inputHash = await sha256(canonicalJson(inputSnapshot));
  const base = { organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, modelo_id: modeloId, engine_name: ENGINE_NAME,
    engine_version: ENGINE_VERSION, input_snapshot_json: inputSnapshot, input_hash: inputHash, iniciado_em: startedAt, executado_por: caller.userId };
  try {
    const fit: RegressionResult = fitRegression(b.input);
    let preliminary = null as ReturnType<typeof project> | null;
    let projErr: string | null = null;
    try { preliminary = project(fit, b.input, b.avaliando, Number(b.modelo.nivel_confianca), bands); }
    catch (e) { projErr = e instanceof EngineError ? e.code : 'NON_FINITE'; }
    const output = { fit, preliminary_projection: preliminary, preliminary_projection_error: projErr };
    const outputHash = await sha256(canonicalJson(output));
    // Execução, resumo, coeficientes e tabelas derivadas gravados numa única transação, a partir do MESMO output.
    const payload = buildRunPayload(base, output, outputHash, b.input, { policyId: pol.policy.id, thresholds: pol.normality });
    const { data: exId, error } = await admin.rpc('aval_engine_persist_run', { p: payload });
    if (error) throw error;
    const ex = { id: exId as string };
    return json(200, { ok: true, execucao_id: ex.id, n: fit.n, r2: fit.r2, preliminary_error: projErr });
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    const { data: ex } = await admin.from('avaliacao_modelo_execucoes').insert({
      ...base, status: 'ERRO', erro_codigo: e.code, concluido_em: new Date().toISOString(),
    }).select('id').single();
    if (ex) await admin.from('modelo_execucao_erros').insert({ organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, execucao_id: ex.id, codigo: e.code, detalhe: e.detail });
    await admin.from('avaliacao_modelos').update({ status: 'ERRO' }).eq('id', modeloId);
    return json(422, { error: e.code, message: describeEngineError(e.code), details: e.detail });
  }
}

async function runValidation(req: Request, admin: SupabaseClient, caller0: Caller, modeloId: string) {
  const { data: m0 } = await admin.from('avaliacao_modelos').select('avaliacao_id, organization_id, status, stale').eq('id', modeloId).maybeSingle();
  if (!m0) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, caller0, m0.avaliacao_id, 'validation.run');
  if (m0.stale) return json(409, { error: 'model_stale', message: 'Modelo desatualizado. Crie um novo modelo.' });
  if (m0.status !== 'EM_VALIDACAO') return json(409, { error: 'model_not_in_validation', message: 'Envie o modelo para validação antes.' });
  const { data: exs } = await admin.from('avaliacao_modelo_execucoes').select('id, output_json, input_snapshot_json')
    .eq('modelo_id', modeloId).eq('status', 'SUCESSO').order('created_at', { ascending: false }).limit(1);
  const ex = exs?.[0];
  if (!ex) return json(409, { error: 'model_not_calculated' });
  const b = await loadModel(admin, modeloId);
  const fit = (ex.output_json as any).fit as RegressionResult;
  const input = (ex.input_snapshot_json as any).regression_input as RegressionInput;
  const { policy, rules, bands, foundation } = await loadPolicy(admin, m0.organization_id);
  let projection = null;
  try { projection = project(fit, input, b.avaliando, Number(b.modelo.nivel_confianca), bands); } catch { projection = null; }
  const vars: VariableMeta[] = b.indepVars.map(({ mv, v }, i) => ({
    code: v.codigo, tipo: v.tipo_variavel, categorica: v.categorica ?? null, relacao_esperada: v.relacao_esperada, transform: mv.transformacao, power: mv.power ?? undefined,
    values: input.independents[i].values,
  }));
  const [{ data: reviews }, { data: grades }, cookRule] = await Promise.all([
    admin.from('validation_manual_reviews').select('codigo, decisao, created_at').eq('modelo_id', modeloId).order('created_at'),
    admin.from('validation_foundation_manual_grades').select('codigo, grau, created_at').eq('modelo_id', modeloId).order('created_at'),
    loadCookRule(admin, m0.organization_id),
  ]);
  const manual: Record<string, ManualDecision> = {};
  for (const r of reviews ?? []) manual[(r as any).codigo] = (r as any).decisao;
  const foundationGrades: Record<string, FoundationGrade> = {};
  for (const g of grades ?? []) foundationGrades[(g as any).codigo] = (g as any).grau;
  const out = validateModel(fit, projection, vars, { transform: b.modelo.dependente_transformacao, power: b.modelo.dependente_power ?? undefined }, rules, manual,
    { cookRule, foundation, foundationGrades });
  const payload = buildValidationPayload(
    { organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, modelo_id: modeloId, execucao_id: ex.id, created_by: caller.userId },
    policy, out, manual, { cook_regra: cookRule, fundamentacao_estruturada: out.foundation?.summary ?? null });
  const { data: valId, error } = await admin.rpc('aval_engine_persist_validation', { p: payload });
  if (error) throw error;
  const val = { id: valId as string };
  return json(200, { ok: true, validation_id: val.id, overall: out.overall });
}

async function runProjection(req: Request, admin: SupabaseClient, caller0: Caller, acceptanceId: string) {
  const { data: ac } = await admin.from('model_acceptances').select('*').eq('id', acceptanceId).maybeSingle();
  if (!ac) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, caller0, ac.avaliacao_id, 'economic.select_center');
  if (ac.status !== 'VIGENTE') return json(409, { error: 'acceptance_not_current', message: 'O aceite do modelo não está vigente.' });
  const { data: ex } = await admin.from('avaliacao_modelo_execucoes').select('output_json, input_snapshot_json').eq('id', ac.execucao_id).single();
  const b = await loadModel(admin, ac.modelo_id);
  const { bands } = await loadPolicy(admin, ac.organization_id);
  const fit = (ex!.output_json as any).fit as RegressionResult;
  const input = (ex!.input_snapshot_json as any).regression_input as RegressionInput;
  try {
    const p = project(fit, input, b.avaliando, Number(b.modelo.nivel_confianca), bands);
    await admin.from('avaliacao_projecoes').update({ stale: true }).eq('avaliacao_id', ac.avaliacao_id).eq('stale', false);
    const { data: pj, error } = await admin.from('avaliacao_projecoes').insert({
      organization_id: ac.organization_id, avaliacao_id: ac.avaliacao_id, modelo_id: ac.modelo_id, acceptance_id: ac.id, execucao_id: ac.execucao_id,
      nivel_confianca: p.confidenceLevel, z0: p.z0, se_media: p.seMean, t_critico: p.tCritical, log_response: p.logResponse,
      avaliando_json: b.avaliando, extrapolacao: p.extrapolation, intervalo_predicao_status: p.predictionInterval.status,
      engine_version: ENGINE_VERSION, created_by: caller.userId,
    }).select('id').single();
    if (error) throw error;
    await admin.from('avaliacao_projecao_centros').insert(p.centers.map((c) => ({
      organization_id: ac.organization_id, avaliacao_id: ac.avaliacao_id, projecao_id: pj.id, centro: c.center, valor: c.value,
      limite_inferior: c.lower, limite_superior: c.upper, amplitude_pct: c.amplitudePct, grau_precisao: c.precisionGrade,
    })));
    await admin.from('audit_events').insert({ organization_id: ac.organization_id, avaliacao_id: ac.avaliacao_id, entity_type: 'projecao', entity_id: pj.id,
      event_type: 'PROJECTION_CALCULATED', actor_id: caller.userId, details_json: { aceite: ac.id } });
    return json(200, { ok: true, projecao_id: pj.id });
  } catch (e) {
    if (e instanceof EngineError) return json(422, { error: e.code, message: describeEngineError(e.code), details: e.detail });
    throw e;
  }
}

/** Fotos do avaliando para o anexo fotográfico (somente arquivos da própria organização). */
async function loadFigures(admin: SupabaseClient, orgId: string, avaliacaoId: string): Promise<NonNullable<LaudoData['figuras']>> {
  const { data: ai } = await admin.from('avaliacao_imoveis').select('imovel_id').eq('avaliacao_id', avaliacaoId).eq('papel', 'AVALIANDO').maybeSingle();
  if (!ai) return [];
  const { data: midias } = await admin.from('imovel_midias').select('storage_ref, legenda').eq('imovel_id', ai.imovel_id).eq('organization_id', orgId)
    .eq('tipo', 'FOTO').order('created_at').limit(6);
  const out: NonNullable<LaudoData['figuras']> = [];
  for (const m of midias ?? []) {
    const ref = String((m as any).storage_ref ?? '');
    const mm = ref.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/) ?? ref.match(/^([a-z0-9-]+)\/(.+)$/);
    if (!mm) continue;
    const bucket = mm[1]; const path = decodeURIComponent(mm[2]);
    if (!['documents', 'service-photos'].includes(bucket) || !path.startsWith(`${orgId}/`)) continue;
    const { data: blob } = await admin.storage.from(bucket).download(path);
    if (!blob || blob.size > 8 * 1024 * 1024) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const info = imageInfo(bytes);
    if (info) out.push({ titulo: (m as any).legenda || 'Imóvel avaliando', data: bytes, ...info });
  }
  return out;
}

const slug = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'laudo';

/** Gera e congela os arquivos oficiais (PDF e DOCX) de uma emissão, a partir do snapshot imutável. Idempotente. */
async function issueFiles(req: Request, admin: SupabaseClient, caller0: Caller, emissaoId: string) {
  const { data: em } = await admin.from('laudo_emissoes').select('id, organization_id, avaliacao_id, codigo, hash').eq('id', emissaoId).maybeSingle();
  if (!em) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, caller0, em.avaliacao_id, 'report.issue', false);
  const cols = 'id, formato, display_filename, mime_type, file_size, sha256, storage_path';
  const { data: existing } = await admin.from('laudo_arquivos_emitidos').select(cols).eq('emissao_id', em.id);
  if ((existing ?? []).length >= 2) return json(200, { ok: true, arquivos: existing });
  if ((existing ?? []).length) return json(409, { error: 'files_partial', message: 'Arquivos oficiais incompletos para esta emissão. Acione o suporte técnico.' });
  const { data: snap } = await admin.from('laudo_emissao_snapshots').select('dados, hash').eq('emissao_id', em.id).single();
  if (!snap || snap.hash !== em.hash) throw new GuardError(409, 'snapshot_mismatch');
  const data = issuedLaudoData(snap.dados, em.hash);
  data.figuras = await loadFigures(admin, em.organization_id, em.avaliacao_id);
  const pdf = new Uint8Array(buildLaudoPdf(data, { jsPDF, autoTable }).output('arraybuffer'));
  const docxBytes = new Uint8Array(await docx.Packer.toBuffer(buildLaudoDocx(data, docx)));
  const base = `${em.organization_id}/avaliacoes/${em.avaliacao_id}/${em.id}`;
  const nome = `laudo-${slug(em.codigo)}`;
  const files = [
    { formato: 'PDF', bytes: pdf, mime: 'application/pdf', ext: 'pdf' },
    { formato: 'DOCX', bytes: docxBytes, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
  ];
  const rows = [];
  const uploaded: string[] = [];
  try {
    for (const f of files) {
      const path = `${base}/${nome}.${f.ext}`;
      const { error } = await admin.storage.from(ISSUED_BUCKET).upload(path, f.bytes, { contentType: f.mime, upsert: true });
      if (error) throw error;
      uploaded.push(path);
      const hash = await sha256(f.bytes);
      rows.push({ organization_id: em.organization_id, avaliacao_id: em.avaliacao_id, emissao_id: em.id, formato: f.formato,
        storage_ref: `${ISSUED_BUCKET}/${path}`, hash, storage_bucket: ISSUED_BUCKET, storage_path: path, display_filename: `${nome}.${f.ext}`,
        mime_type: f.mime, file_size: f.bytes.byteLength, sha256: hash, created_by: caller.userId });
    }
    const { data: ins, error } = await admin.from('laudo_arquivos_emitidos').insert(rows).select(cols);
    if (error) throw error;
    await admin.from('audit_events').insert({ organization_id: em.organization_id, avaliacao_id: em.avaliacao_id, entity_type: 'laudo_emissao', entity_id: em.id,
      event_type: 'REPORT_FILES_FROZEN', actor_id: caller.userId, details_json: { arquivos: rows.map((r) => ({ formato: r.formato, sha256: r.sha256, bytes: r.file_size })) } });
    return json(200, { ok: true, arquivos: ins });
  } catch (e) {
    if (uploaded.length) await admin.storage.from(ISSUED_BUCKET).remove(uploaded);
    console.error('avaliacao-engine: falha ao congelar arquivos', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'files_failed', message: 'Não foi possível gerar os arquivos oficiais. Tente novamente.' });
  }
}

const pick = (o: Record<string, unknown> | null | undefined, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => o && o[k] !== null && o[k] !== undefined && o[k] !== '').map((k) => [k, o![k]]));

/** Contexto factual (sem dados pessoais) entregue à IA, conforme o tipo de texto. */
async function aiContext(req: Request, admin: SupabaseClient, av: any, secao: any, tipo: AiContext) {
  const { data: tokens } = await userClient(req).rpc('aval_tokens', { p_avaliacao: av.id });
  const { data: dt } = await admin.from('document_tokens').select('codigo, descricao');
  const marcadores = Object.fromEntries((dt ?? []).map((t: any) => [t.codigo, { descricao: t.descricao, valor: (tokens as any)?.[t.codigo] ?? null }]));
  const ctx: Record<string, unknown> = {
    secao: { codigo: secao.codigo, titulo: secao.titulo },
    avaliacao: pick(av, ['tipo', 'uf', 'municipio_nome', 'tipo_imovel']),
    marcadores,
  };
  if (tipo === 'PROPERTY_DESCRIPTION') {
    const { data: ai } = await admin.from('avaliacao_imoveis').select('imovel_id').eq('avaliacao_id', av.id).eq('papel', 'AVALIANDO').maybeSingle();
    if (ai) {
      const { data: im } = await admin.from('imoveis').select('*').eq('id', ai.imovel_id).maybeSingle();
      ctx.imovel = pick(im, ['tipo_imovel', 'descricao', 'bairro', 'municipio_nome', 'uf', 'area_construida', 'area_terreno', 'padrao']);
      const { data: at } = await admin.from('imovel_atributos').select('*').eq('imovel_id', ai.imovel_id).limit(100);
      ctx.atributos = (at ?? []).map((a: any) => pick(a, ['codigo', 'nome', 'valor_texto', 'valor_numero', 'valor_booleano', 'unidade']));
    }
  } else if (tipo === 'MARKET_DIAGNOSIS') {
    const [{ count }, { data: mc }] = await Promise.all([
      admin.from('avaliacao_amostras').select('id', { count: 'exact', head: true }).eq('avaliacao_id', av.id).eq('selecionada', true),
      admin.from('avaliacao_municipios_comparaveis').select('*').eq('avaliacao_id', av.id).limit(50),
    ]);
    ctx.pesquisa = { amostras_selecionadas: count ?? 0, municipios_comparaveis: (mc ?? []).map((m: any) => pick(m, ['municipio_nome', 'uf', 'decisao', 'justificativa'])) };
  } else if (tipo === 'VALIDATION_EXPLANATION') {
    const { data: ac } = await admin.from('model_acceptances').select('validation_id').eq('avaliacao_id', av.id).eq('status', 'VIGENTE').maybeSingle();
    if (ac) {
      const [{ data: rs }, { data: fi }] = await Promise.all([
        admin.from('model_validation_results').select('numero, nome, status, grau, detalhe').eq('validation_id', ac.validation_id).order('numero'),
        admin.from('validation_foundation_items').select('item_number, titulo, status, grade_achieved').eq('validation_id', ac.validation_id).order('item_number'),
      ]);
      ctx.validacao = { criterios: rs ?? [], fundamentacao_itens: fi ?? [] };
    }
  } else if (tipo === 'COMPATIBILITY' || tipo === 'CONCLUSION') {
    const { data: res } = await admin.from('avaliacao_resultado_economico').select('id, centro, conclusao, conclusao_texto').eq('avaliacao_id', av.id).eq('status', 'VIGENTE').maybeSingle();
    if (res) {
      ctx.resultado = pick(res, ['centro', 'conclusao', 'conclusao_texto']);
      const { data: cp } = await admin.from('avaliacao_compatibilidades').select('tipo_valor, direcao, posicao_ic, posicao_campo, diferenca_percentual').eq('resultado_id', res.id);
      ctx.compatibilidades = cp ?? [];
    }
  }
  return { ctx, allowedTokens: Object.keys(marcadores) };
}

function responseText(r: any): string {
  if (typeof r?.output_text === 'string') return r.output_text;
  return (r?.output ?? []).flatMap((o: any) => (o?.type === 'message' ? o.content ?? [] : []))
    .filter((c: any) => c?.type === 'output_text').map((c: any) => c.text ?? '').join('');
}

/** IA propõe texto; o profissional revisa e aprova depois (aval_ai_decide). Nunca grava no laudo diretamente. */
async function aiGenerate(req: Request, admin: SupabaseClient, caller0: Caller, secaoId: string, tipo: AiContext, modo: 'GERAR' | 'MELHORAR') {
  const { data: secao } = await admin.from('laudo_secoes').select('id, avaliacao_id, laudo_versao_id, codigo, titulo, conteudo').eq('id', secaoId).maybeSingle();
  if (!secao) throw new GuardError(404, 'not_found');
  const { caller, av } = await authorize(req, admin, caller0, secao.avaliacao_id, 'report.edit');
  const { data: lv } = await admin.from('laudo_versoes').select('status').eq('id', secao.laudo_versao_id).single();
  if (!['RASCUNHO', 'EM_REVISAO'].includes(lv?.status)) return json(409, { error: 'report_issued_immutable', message: 'O laudo emitido não pode ser alterado.' });
  const { data: avFull } = await admin.from('avaliacoes').select('id, tipo, uf, municipio_nome, tipo_imovel').eq('id', av.id).single();
  const baseText = String(secao.conteudo ?? '');
  if (modo === 'MELHORAR' && !baseText.trim()) return json(400, { error: 'ai_empty_base', message: 'Escreva um texto antes de pedir melhoria.' });
  const { ctx, allowedTokens } = await aiContext(req, admin, avFull, secao, tipo);
  const contextJson = { ...ctx, finalidade: AI_PURPOSE[tipo], modo };
  const contextText = JSON.stringify(contextJson);
  const contextHash = await sha256(canonicalJson(contextJson));
  let generated: string;
  try {
    const r = await generateResponse({
      model: AI_MODEL,
      instructions: systemPrompt(modo),
      input: [{ role: 'user', content: `CONTEXTO:\n${contextText}\n\nTEXTO_BASE:\n${baseText || '(vazio)'}` }],
      max_output_tokens: 2000,
    });
    generated = responseText(r).trim();
  } catch (e) {
    if (e instanceof ConfigurationError || e instanceof AuthenticationError) return json(503, { error: 'ai_not_configured', message: 'Integração de IA não configurada. O laudo pode ser redigido manualmente.' });
    if (e instanceof PaymentRequiredError) return json(402, { error: 'ai_credits', message: 'Sem créditos de IA no momento. O laudo pode ser redigido manualmente.' });
    if (e instanceof RateLimitError) return json(429, { error: 'ai_rate_limited', message: 'Muitas solicitações de IA. Aguarde alguns instantes.' });
    if (e instanceof PermissionDeniedError) return json(403, { error: 'ai_denied', message: 'A IA não está liberada para esta organização.' });
    if (e instanceof GatewayError) { console.error('avaliacao-engine: IA', e.code); return json(502, { error: 'ai_failed', message: 'A IA não respondeu. Tente novamente.' }); }
    throw e;
  }
  const check = checkAiText(generated, modo === 'MELHORAR' ? baseText : '', allowedTokens, contextText);
  if (!check.ok) {
    const msg = check.erro === 'TOKEN_REMOVIDO' ? 'A proposta removeu dados protegidos e foi descartada. Tente novamente.'
      : check.erro === 'TOKEN_DESCONHECIDO' ? 'A proposta criou marcadores inexistentes e foi descartada. Tente novamente.' : 'A IA não retornou texto.';
    return json(422, { error: 'ai_rejected', message: msg });
  }
  const { data: row, error } = await admin.from('avaliacao_ai_conteudos').insert({
    organization_id: av.organization_id, avaliacao_id: av.id, context_type: tipo, context_id: secao.id, purpose: AI_PURPOSE[tipo],
    prompt_version: AI_PROMPT_VERSION, model: AI_MODEL, context_json: contextJson, context_hash: contextHash, base_text: baseText || null,
    modo, generated_text: generated, alertas: check.alertas, status: 'PROPOSTO', created_by: caller.userId,
  }).select('id').single();
  if (error) throw error;
  await admin.from('audit_events').insert({ organization_id: av.organization_id, avaliacao_id: av.id, entity_type: 'ai_conteudo', entity_id: row.id,
    event_type: 'AI_TEXT_PROPOSED', actor_id: caller.userId, details_json: { contexto: tipo, modo, secao: secao.codigo, prompt_version: AI_PROMPT_VERSION, model: AI_MODEL } });
  return json(200, { ok: true, conteudo_id: row.id, alertas: check.alertas });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  let body: z.infer<typeof Body>;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json(400, { error: 'invalid_request' });
    body = parsed.data;
  } catch { return json(400, { error: 'invalid_request' }); }
  const admin = adminClient();
  try {
    // Valida o chamador antes de qualquer leitura, para não revelar existência de registros.
    const caller = await resolveCaller(req, admin, false);
    if (body.action === 'run_model') return await runModel(req, admin, caller, body.modelo_id);
    if (body.action === 'run_validation') return await runValidation(req, admin, caller, body.modelo_id);
    if (body.action === 'issue_files') return await issueFiles(req, admin, caller, body.emissao_id);
    if (body.action === 'ai_generate') return await aiGenerate(req, admin, caller, body.secao_id, body.context_type, body.modo);
    return await runProjection(req, admin, caller, body.acceptance_id);
  } catch (e) {
    const g = guardResponse(e, corsHeaders);
    if (g) return g;
    console.error('avaliacao-engine: falha interna', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal_error' });
  }
});
