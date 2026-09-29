// Lote 3 — Autorização compartilhada para funções de serviço (cron/admin).
// Uma chamada é autorizada se:
//   a) apresenta o cabeçalho x-sidif-cron-secret igual ao segredo SIDIF_CRON_SECRET
//      (usado pelas rotinas automáticas agendadas no banco), OU
//   b) apresenta um Bearer token válido de um usuário administrador.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function isServiceCall(req: Request): boolean {
  const expected = Deno.env.get('SIDIF_CRON_SECRET');
  if (!expected) return false; // sem segredo configurado, nenhuma chamada de serviço é válida
  const provided = req.headers.get('x-sidif-cron-secret') ?? '';
  if (provided.length !== expected.length) return false;
  // comparação em tempo constante
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export async function isAdminCall(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  const supabaseAdmin: SupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;

  const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
  return !!isAdmin;
}

// Retorna null se autorizado, ou a Response de erro se não autorizado.
export async function requireServiceOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  if (isServiceCall(req)) return null;
  if (await isAdminCall(req)) return null;
  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
