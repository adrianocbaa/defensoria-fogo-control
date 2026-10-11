// Lote 3/S4 — Autorização compartilhada para funções de serviço (cron/admin).
// Chamada interna autorizada:
//   a) cabeçalho x-sidif-cron-secret igual ao segredo SIDIF_CRON_SECRET, OU
//   b) cabeçalho x-sidif-internal-token conferido no Vault (verify_internal_cron_token), OU
//   c) Bearer igual à SUPABASE_SERVICE_ROLE_KEY (servidor→servidor).
// Execução manual de rotina GLOBAL: somente super_admin (S4). Admin de órgão nunca.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function bearer(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

export function isServiceCall(req: Request): boolean {
  const expected = Deno.env.get('SIDIF_CRON_SECRET');
  if (!expected) return false;
  return safeEqual(req.headers.get('x-sidif-cron-secret') ?? '', expected);
}

export async function isInternalCallAsync(req: Request): Promise<boolean> {
  if (isServiceCall(req)) return true;
  if (safeEqual(bearer(req), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')) return true;
  const tok = req.headers.get('x-sidif-internal-token') ?? '';
  if (tok.length < 32) return false;
  const { data } = await admin().rpc('verify_internal_cron_token', { p_token: tok });
  return data === true;
}

export async function isSuperAdminCall(req: Request): Promise<boolean> {
  const token = bearer(req);
  if (!token) return false;
  const a = admin();
  const { data: { user }, error } = await a.auth.getUser(token);
  if (error || !user) return false;
  const { data } = await a.rpc('is_super_admin', { _user_id: user.id });
  return data === true;
}

function deny(cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/** Rotina interna: somente cron/servidor. */
export async function requireInternal(req: Request, cors: Record<string, string>): Promise<Response | null> {
  return (await isInternalCallAsync(req)) ? null : deny(cors);
}

/** Rotina global com execução manual permitida apenas a super_admin. */
export async function requireServiceOrSuperAdmin(req: Request, cors: Record<string, string>): Promise<Response | null> {
  if (await isInternalCallAsync(req)) return null;
  if (await isSuperAdminCall(req)) return null;
  return deny(cors);
}

/** @deprecated S4: admin de órgão não pode disparar rotina global. Mantido como alias seguro. */
export const requireServiceOrAdmin = requireServiceOrSuperAdmin;
