import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using the is_admin() function
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin
      .rpc('is_admin', { user_uuid: user.id });

    if (adminCheckError || !isAdmin) {
      console.error('Admin check failed:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self password reset
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode resetar sua própria senha' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure random temporary password
    const crypto = await import('node:crypto');
    const tempPassword = crypto.randomBytes(16).toString('base64url').slice(0, 22);
    
    // Reset password with secure random value
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao resetar senha: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action without exposing the password
    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'auth.users',
      record_id: userId,
      operation: 'UPDATE',
      new_values: { password_reset: true, reset_method: 'admin_action' },
      user_id: user.id,
      user_email: user.email || 'unknown'
    });

    console.log(`Password reset successfully for user ${userId} by admin ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Senha temporária gerada: ${tempPassword}`,
        tempPassword: tempPassword,
        note: 'Informe esta senha ao usuário de forma segura. Ela deve ser alterada no primeiro login.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-reset-password function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
