import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DeleteBody = {
  email?: string;
  userId?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    console.log('Admin delete user function invoked');

    // Authn
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Authz
    const { data: isAdminData, error: adminError } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    if (adminError || !isAdminData) throw new Error('User is not an admin');

    const body = await req.json() as DeleteBody;
    let targetUserId = body.userId?.trim();

    // Resolve by email if needed
    if (!targetUserId) {
      const email = body.email?.trim();
      if (!email) throw new Error('Email or userId is required');

      // Try to find via profiles first (fast path)
      const { data: prof, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (profErr) {
        console.warn('profiles lookup error:', profErr);
      }

      if (prof?.user_id) {
        targetUserId = prof.user_id as string;
      } else {
        // Fallback: scan auth users to find by email
        console.log('Falling back to admin.listUsers to locate by email');
        let page = 1;
        const perPage = 1000;
        let found = false;
        while (!found) {
          const { data: list, error: listErr } = await (supabaseAdmin.auth.admin as any).listUsers({ page, perPage });
          if (listErr) throw listErr;
          const users = list?.users ?? list; // compatibility
          if (!users || users.length === 0) break;
          for (const u of users) {
            if (u.email?.toLowerCase() === email.toLowerCase()) {
              targetUserId = u.id;
              found = true;
              break;
            }
          }
          if (!found) page++;
          if (users.length < perPage) break; // no more pages
        }

        if (!targetUserId) throw new Error('User not found for provided email');
      }
    }

    console.log('Deleting related rows for user:', targetUserId);

    // Clean dependent rows that may block deletion
    const safeDeletes = [
      () => supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId),
      () => supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId),
      () => supabaseAdmin.from('user_obra_access').delete().eq('user_id', targetUserId),
      () => supabaseAdmin.from('password_resets').delete().eq('user_id', targetUserId),
    ];

    const safeNullUpdates = [
      () => supabaseAdmin.from('obras').update({ created_by: null }).eq('created_by', targetUserId),
      () => supabaseAdmin.from('rdo_reports').update({ created_by: null }).eq('created_by', targetUserId),
      () => supabaseAdmin.from('rdo_comments').update({ created_by: null }).eq('created_by', targetUserId),
      () => supabaseAdmin.from('rdo_activity_notes').update({ created_by: null }).eq('created_by', targetUserId),
      () => supabaseAdmin.from('rdo_templates_atividades').update({ created_by: null }).eq('created_by', targetUserId),
      () => supabaseAdmin.from('rdo_audit_log').update({ actor_id: null }).eq('actor_id', targetUserId),
      () => supabaseAdmin.from('rdo_config').update({ chosen_by: null }).eq('chosen_by', targetUserId),
      () => supabaseAdmin.from('cronograma_financeiro').update({ user_id: null }).eq('user_id', targetUserId),
      () => supabaseAdmin.from('obra_checklist_items').update({ user_id: null }).eq('user_id', targetUserId),
      () => supabaseAdmin.from('nucleos_central').update({ user_id: null }).eq('user_id', targetUserId),
      () => supabaseAdmin.from('nuclei').update({ user_id: null }).eq('user_id', targetUserId),
      () => supabaseAdmin.from('stock_movements').update({ user_id: null }).eq('user_id', targetUserId),
      () => supabaseAdmin.from('travels').update({ user_id: null }).eq('user_id', targetUserId),
    ];

    for (const op of [...safeDeletes, ...safeNullUpdates]) {
      try { await op(); } catch (e) { console.warn('cleanup step skipped', e?.message); }
    }

    // Finally delete auth user
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      console.error('Error deleting auth user:', delErr);
      throw delErr;
    }

    // Log
    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'auth.users',
      record_id: targetUserId,
      operation: 'DELETE',
      old_values: null,
      new_values: { deleted_by: user.email },
      user_id: user.id,
      user_email: user.email,
    });

    return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in admin-delete-user function:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
