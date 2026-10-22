import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { classifyPasswordUpdateError, resetErrorMessages, type ResetErrorCategory } from './errors.ts';

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';

function errorResponse(category: ResetErrorCategory, status: number): Response {
  console.error(JSON.stringify({ category, status }));
  return new Response(JSON.stringify({ error: category, message: resetErrorMessages[category] }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse('invalid_request', 400); }
    if (!body || typeof body !== 'object' || !('code' in body) || !('newPassword' in body)) {
      return errorResponse('invalid_request', 400);
    }
    const { code, newPassword } = body;

    if (typeof code !== 'string' || !/^\d{6}$/.test(code) || typeof newPassword !== 'string' || !newPassword) {
      return errorResponse('invalid_request', 400);
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return errorResponse('password_requirements', 400);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find valid code
    const { data: resetRecord, error: queryError } = await supabase
      .from("password_resets")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) return errorResponse('internal_error', 500);
    if (!resetRecord) return errorResponse('reset_code_invalid_or_expired', 400);

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetRecord.user_id,
      { password: newPassword }
    );

    if (updateError) {
      const category = classifyPasswordUpdateError(updateError);
      return errorResponse(category, category === 'internal_error' ? 500 : 400);
    }

    // Mark code as used
    await supabase
      .from("password_resets")
      .update({ used: true })
      .eq("id", resetRecord.id);

    // Get user email for audit log
    const { data: userData } = await supabase.auth.admin.getUserById(resetRecord.user_id);
    
    // Log audit
    if (userData?.user?.email) {
      await supabase.rpc("log_login_attempt", {
        p_identifier: userData.user.email,
        p_success: true,
        p_user_agent: "password_reset_success",
      });
    }

    // Cleanup old codes
    await supabase.rpc("cleanup_expired_reset_codes");

    return new Response(
      JSON.stringify({ message: "Senha redefinida com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch {
    return errorResponse('internal_error', 500);
  }
});
