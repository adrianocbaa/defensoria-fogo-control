// Lote S2 — Barreira de autorização multi-tenant para Edge Functions que usam service_role.
// Fluxo: validar chamador → resolver organização no servidor → carregar entidade →
// conferir organization_id → conferir permissão → só então operar com service_role.
// Helpers globais (is_admin, user_has_obra_access, can_view_maintenance_ticket) NUNCA
// são usados isoladamente: sempre combinados com a igualdade de organização.

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isServiceCall } from './service-auth.ts';

export type Caller =
  | { kind: 'service' }
  | { kind: 'user'; userId: string; orgId: string | null; role: string | null; superAdmin: boolean };

export class GuardError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function bearer(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Chamada servidor→servidor (outra Edge Function com service_role, ou cron com segredo). */
export function isInternalCall(req: Request): boolean {
  if (isServiceCall(req)) return true;
  return safeEqual(bearer(req), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}

/** 401 se não houver usuário real. A anon key não resolve usuário em getUser → 401. */
export async function resolveCaller(req: Request, admin: SupabaseClient, allowInternal = true): Promise<Caller> {
  if (allowInternal && isInternalCall(req)) return { kind: 'service' };
  const token = bearer(req);
  if (!token) throw new GuardError(401, 'unauthenticated');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) throw new GuardError(401, 'unauthenticated');
  const userId = data.user.id;
  const [{ data: orgId }, { data: role }, { data: superAdmin }] = await Promise.all([
    admin.rpc('user_organization_id', { _user_id: userId }),
    admin.rpc('get_user_role', { user_uuid: userId }),
    admin.rpc('is_super_admin', { _user_id: userId }),
  ]);
  return { kind: 'user', userId, orgId: (orgId as string) ?? null, role: (role as string) ?? null, superAdmin: !!superAdmin };
}

/** Entidade de outro órgão é tratada como inexistente (404) para não permitir enumeração. */
export function assertSameOrg(caller: Caller, entityOrg: string | null | undefined) {
  if (caller.kind === 'service' || caller.superAdmin) return;
  if (!caller.orgId || !entityOrg || caller.orgId !== entityOrg) throw new GuardError(404, 'not_found');
}

export async function assertObraAccess(
  admin: SupabaseClient, caller: Caller, obraId: string, mode: 'read' | 'edit_rdo',
): Promise<{ id: string; organization_id: string }> {
  const { data: obra } = await admin.from('obras').select('id, organization_id').eq('id', obraId).maybeSingle();
  if (!obra) throw new GuardError(404, 'not_found');
  assertSameOrg(caller, obra.organization_id);
  if (caller.kind === 'service' || caller.superAdmin) return obra;

  const uid = caller.userId;
  const [{ data: hasAccess }, { data: canEditObra }, { data: canEditRdo }] = await Promise.all([
    admin.rpc('user_has_obra_access', { user_uuid: uid, obra_uuid: obraId }),
    admin.rpc('can_edit_obra', { obra_uuid: obraId, user_uuid: uid }),
    admin.rpc('can_edit_rdo', { user_uuid: uid }),
  ]);
  const ok = mode === 'read' ? (!!hasAccess || !!canEditObra) : (!!canEditRdo && (!!hasAccess || !!canEditObra));
  if (!ok) throw new GuardError(403, 'forbidden');
  return obra;
}

export async function loadAuthorizedReport(admin: SupabaseClient, caller: Caller, reportId: string, mode: 'read' | 'edit_rdo') {
  const { data: report } = await admin.from('rdo_reports').select('id, obra_id, organization_id').eq('id', reportId).maybeSingle();
  if (!report) throw new GuardError(404, 'not_found');
  assertSameOrg(caller, report.organization_id);
  const obra = await assertObraAccess(admin, caller, report.obra_id, mode);
  if (report.organization_id && obra.organization_id !== report.organization_id) throw new GuardError(404, 'not_found');
  return report as { id: string; obra_id: string; organization_id: string };
}

export async function loadAuthorizedTicket(admin: SupabaseClient, caller: Caller, ticketId: string, mode: 'read' | 'manage') {
  const { data: t } = await admin.from('maintenance_tickets')
    .select('id, organization_id, user_id, manager_ids, requester_email').eq('id', ticketId).maybeSingle();
  if (!t) throw new GuardError(404, 'not_found');
  assertSameOrg(caller, t.organization_id);
  if (caller.kind === 'service' || caller.superAdmin) return t;
  const uid = caller.userId;
  const managers: string[] = t.manager_ids ?? [];
  const [{ data: isAdmin }, { data: isResp }] = await Promise.all([
    admin.rpc('is_admin', { user_uuid: uid }),
    admin.rpc('is_maintenance_responsible', { _user_id: uid }),
  ]);
  const canManage = !!isAdmin || !!isResp || managers.includes(uid);
  const canRead = canManage || t.user_id === uid;
  if (mode === 'read' ? !canRead : !canManage) throw new GuardError(403, 'forbidden');
  return t;
}

export function guardResponse(e: unknown, headers: Record<string, string>): Response | null {
  if (!(e instanceof GuardError)) return null;
  return new Response(JSON.stringify({ error: e.code }), {
    status: e.status, headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
