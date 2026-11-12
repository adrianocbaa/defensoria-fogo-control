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
import { type ManualDecision, type PolicyRule, validateModel, type VariableMeta } from '../_shared/avaliacao/validator.ts';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('run_model'), modelo_id: z.string().uuid() }),
  z.object({ action: z.literal('run_validation'), modelo_id: z.string().uuid() }),
  z.object({ action: z.literal('project'), acceptance_id: z.string().uuid() }),
]);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authorize(req: Request, admin: SupabaseClient, avaliacaoId: string, perm: string) {
  const caller = await resolveCaller(req, admin, false);
  const { data: av } = await admin.from('avaliacoes').select('id, organization_id, status').eq('id', avaliacaoId).maybeSingle();
  if (!av) throw new GuardError(404, 'not_found');
  assertSameOrg(caller, av.organization_id);
  const { data: ok, error } = await userClient(req).rpc('aval_can_edit', { _avaliacao: avaliacaoId, _perm: perm });
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
  return { policy: pol, rules: (rules ?? []) as PolicyRule[], bands };
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

async function runModel(req: Request, admin: SupabaseClient, modeloId: string) {
  const { data: m0 } = await admin.from('avaliacao_modelos').select('avaliacao_id, organization_id, status').eq('id', modeloId).maybeSingle();
  if (!m0) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, m0.avaliacao_id, 'model.run');
  const { data: prev } = await admin.from('avaliacao_modelo_execucoes').select('id').eq('modelo_id', modeloId).eq('status', 'SUCESSO').limit(1);
  if (prev && prev.length) return json(409, { error: 'model_already_executed', message: 'Este modelo já foi calculado e é imutável. Duplique-o para alterar.' });
  const b = await loadModel(admin, modeloId);
  const { bands } = await loadPolicy(admin, m0.organization_id);
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
    const { data: ex, error } = await admin.from('avaliacao_modelo_execucoes').insert({
      ...base, status: 'SUCESSO', output_json: output, output_hash: outputHash, concluido_em: new Date().toISOString(),
    }).select('id').single();
    if (error) throw error;
    const indep = fit.coefficients.slice(1);
    const center = preliminary?.centers.find((c) => c.center === (preliminary!.logResponse ? 'MEDIAN' : 'DIRECT'));
    await admin.from('modelo_resultado_resumo').insert({
      organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, execucao_id: ex.id, modelo_id: modeloId,
      n: fit.n, k: fit.k, r2: fit.r2, r2_ajustado: fit.r2Adj, f: fit.f, sig_f: fit.fPValue,
      pior_sig_regressor: indep.length ? Math.max(...indep.map((c) => c.pValue)) : null,
      amplitude_pct: center?.amplitudePct ?? null, grau_precisao: center?.precisionGrade ?? null,
      extrapola: preliminary ? preliminary.extrapolation.some((x) => !x.inside) : null, centro_preliminar: center?.value ?? null,
    });
    await admin.from('modelo_coeficientes').insert(fit.coefficients.map((c, i) => ({
      organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, execucao_id: ex.id, codigo: c.code, transformacao: c.transform,
      beta: c.beta, erro_padrao: c.stdError, t: c.t, sig: c.pValue, ordem: i,
    })));
    await admin.from('avaliacao_modelos').update({ status: 'CALCULADO' }).eq('id', modeloId);
    await admin.from('audit_events').insert({ organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, entity_type: 'modelo',
      entity_id: modeloId, event_type: 'MODEL_EXECUTED', actor_id: caller.userId, details_json: { execucao: ex.id, input_hash: inputHash, output_hash: outputHash, n: fit.n } });
    return json(200, { ok: true, execucao_id: ex.id, n: fit.n, r2: fit.r2, preliminary_error: projErr });
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    const { data: ex } = await admin.from('avaliacao_modelo_execucoes').insert({
      ...base, status: 'ERRO', erro_codigo: e.code, concluido_em: new Date().toISOString(),
    }).select('id').single();
    if (ex) await admin.from('modelo_execucao_erros').insert({ organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, execucao_id: ex.id, codigo: e.code, detalhe: (e as any).details ?? {} });
    await admin.from('avaliacao_modelos').update({ status: 'ERRO' }).eq('id', modeloId);
    return json(422, { error: e.code, message: describeEngineError(e.code), details: (e as any).details ?? {} });
  }
}

async function runValidation(req: Request, admin: SupabaseClient, modeloId: string) {
  const { data: m0 } = await admin.from('avaliacao_modelos').select('avaliacao_id, organization_id, status, stale').eq('id', modeloId).maybeSingle();
  if (!m0) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, m0.avaliacao_id, 'validation.run');
  if (m0.stale) return json(409, { error: 'model_stale', message: 'Modelo desatualizado. Crie um novo modelo.' });
  if (m0.status !== 'EM_VALIDACAO') return json(409, { error: 'model_not_in_validation', message: 'Envie o modelo para validação antes.' });
  const { data: exs } = await admin.from('avaliacao_modelo_execucoes').select('id, output_json, input_snapshot_json')
    .eq('modelo_id', modeloId).eq('status', 'SUCESSO').order('created_at', { ascending: false }).limit(1);
  const ex = exs?.[0];
  if (!ex) return json(409, { error: 'model_not_calculated' });
  const b = await loadModel(admin, modeloId);
  const fit = (ex.output_json as any).fit as RegressionResult;
  const input = (ex.input_snapshot_json as any).regression_input as RegressionInput;
  const { policy, rules, bands } = await loadPolicy(admin, m0.organization_id);
  let projection = null;
  try { projection = project(fit, input, b.avaliando, Number(b.modelo.nivel_confianca), bands); } catch { projection = null; }
  const vars: VariableMeta[] = b.indepVars.map(({ mv, v }, i) => ({
    code: v.codigo, tipo: v.tipo_variavel, relacao_esperada: v.relacao_esperada, transform: mv.transformacao, power: mv.power ?? undefined,
    values: input.independents[i].values,
  }));
  const { data: reviews } = await admin.from('validation_manual_reviews').select('codigo, decisao, created_at').eq('modelo_id', modeloId).order('created_at');
  const manual: Record<string, ManualDecision> = {};
  for (const r of reviews ?? []) manual[(r as any).codigo] = (r as any).decisao;
  const out = validateModel(fit, projection, vars, { transform: b.modelo.dependente_transformacao, power: b.modelo.dependente_power ?? undefined }, rules, manual);
  const { data: val, error } = await admin.from('model_validations').insert({
    organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, modelo_id: modeloId, execucao_id: ex.id, policy_id: policy.id,
    overall_status: out.overall, fundamentacao_grau: out.fundamentacao.grau, precisao_grau: out.precisao.grau, amplitude_pct: out.precisao.amplitudePct,
    resumo_json: { fundamentacao: out.fundamentacao, precisao: out.precisao, pendentes_revisao: out.pendentesRevisao, impedimentos_grau_iii: out.impedimentosGrauIII, politica: { codigo: policy.codigo, versao: policy.versao } },
    created_by: caller.userId,
  }).select('id').single();
  if (error) throw error;
  await admin.from('model_validation_results').insert(out.results.map((r) => ({
    organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, validation_id: val.id, codigo: r.codigo, numero: r.numero, nome: r.nome,
    origem: r.origem, modo: r.modo, status: r.status, grau: r.grau, valor: r.valor, detalhe: r.detalhe, dados: r.dados ?? null,
    revisado: !!manual[r.codigo] || !!r.revisado, bloqueante: r.bloqueante,
  })));
  await admin.from('audit_events').insert({ organization_id: m0.organization_id, avaliacao_id: m0.avaliacao_id, entity_type: 'modelo', entity_id: modeloId,
    event_type: 'VALIDATION_EXECUTED', actor_id: caller.userId, details_json: { validacao: val.id, status: out.overall, politica: policy.codigo + ' v' + policy.versao } });
  return json(200, { ok: true, validation_id: val.id, overall: out.overall });
}

async function runProjection(req: Request, admin: SupabaseClient, acceptanceId: string) {
  const { data: ac } = await admin.from('model_acceptances').select('*').eq('id', acceptanceId).maybeSingle();
  if (!ac) throw new GuardError(404, 'not_found');
  const { caller } = await authorize(req, admin, ac.avaliacao_id, 'economic.select_center');
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
    if (e instanceof EngineError) return json(422, { error: e.code, message: describeEngineError(e.code), details: (e as any).details ?? {} });
    throw e;
  }
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
    if (body.action === 'run_model') return await runModel(req, admin, body.modelo_id);
    if (body.action === 'run_validation') return await runValidation(req, admin, body.modelo_id);
    return await runProjection(req, admin, body.acceptance_id);
  } catch (e) {
    const g = guardResponse(e, corsHeaders);
    if (g) return g;
    console.error('avaliacao-engine: falha interna', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal_error' });
  }
});
