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
    console.log('Admin create user function invoked');

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

    // Verify requesting user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabaseAdmin
      .rpc('is_admin', { user_uuid: user.id });

    const { data: isSuper } = await supabaseAdmin.rpc('is_super_admin', { _user_id: user.id });

    if (!isSuper && (adminError || !isAdminData)) {
      throw new Error('User is not an admin');
    }

    const { email, displayName, role = 'viewer', empresaId, setoresAtuantes = [], organizationId } = await req.json();

    // Instituição do novo usuário: Super Admin pode escolher; demais herdam a de quem cria
    const { data: creatorOrg } = await supabaseAdmin.rpc('user_organization_id', { _user_id: user.id });
    let targetOrgId: string | null = creatorOrg ?? null;
    if (organizationId && organizationId !== creatorOrg) {
      if (!isSuper) throw new Error('Sem permissão para criar usuários em outra instituição');
      targetOrgId = organizationId;
    }
    if (!targetOrgId) throw new Error('Instituição não identificada para o novo usuário');

    const { data: orgRow } = await supabaseAdmin.from('organizations').select('id, nome').eq('id', targetOrgId).maybeSingle();
    if (!orgRow) throw new Error('Instituição não encontrada');
    const orgNome: string = orgRow.nome;
    const memberType = role === 'contratada' ? 'external' : 'internal';

    // Checagem prévia do limite de usuários do plano (o banco também bloqueia)
    const { data: ent } = await supabaseAdmin.from('organization_entitlements')
      .select('internal_users_limit, external_users_limit').eq('organization_id', targetOrgId).maybeSingle();
    const lim = ent ? (memberType === 'external' ? ent.external_users_limit : ent.internal_users_limit) : null;
    if (lim !== null && lim !== undefined) {
      const { count } = await supabaseAdmin.from('organization_members').select('id', { count: 'exact', head: true })
        .eq('organization_id', targetOrgId).eq('member_type', memberType).in('status', ['active', 'invited']);
      if ((count ?? 0) >= lim) {
        throw new Error(`Limite de usuários ${memberType === 'external' ? 'externos' : 'internos'} do plano atingido (${lim}). Contate a equipe SiDIF para ampliar o plano.`);
      }
    }

    if (!email) {
      throw new Error('Email is required');
    }

    // Validate empresa for contratada role
    if (role === 'contratada' && !empresaId) {
      throw new Error('Empresa é obrigatória para usuários Contratada');
    }

    console.log('Creating user with email:', email);

    // Senha temporária aleatória e única por usuário (Lote 5)
    const genPassword = () => {
      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lower = 'abcdefghijkmnpqrstuvwxyz';
      const digits = '23456789';
      const all = upper + lower + digits;
      const pick = (set: string) => {
        const b = new Uint32Array(1);
        crypto.getRandomValues(b);
        return set[b[0] % set.length];
      };
      const chars = [pick(upper), pick(lower), pick(digits)];
      for (let i = 0; i < 9; i++) chars.push(pick(all));
      for (let i = chars.length - 1; i > 0; i--) {
        const b = new Uint32Array(1);
        crypto.getRandomValues(b);
        const j = b[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    };
    const defaultPassword = genPassword();

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true,
      app_metadata: { organization_id: targetOrgId, member_type: memberType },
      user_metadata: {
        display_name: displayName || email.split('@')[0]
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user.id);

    // Set force_password_change flag, empresa_id for contratada, and setores_atuantes
    const profileUpdate: Record<string, any> = { force_password_change: true };
    if (role === 'contratada' && empresaId) {
      profileUpdate.empresa_id = empresaId;
    }
    if (setoresAtuantes && setoresAtuantes.length > 0) {
      profileUpdate.setores_atuantes = setoresAtuantes;
    }
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', newUser.user.id);

    if (profileError) {
      console.error('Error setting profile data:', profileError);
    }

    // Insert user role if not viewer
    if (role !== 'viewer') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }
    }

    // Send email with credentials via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SiDIF <sidif@sidif.com.br>',
            to: [email],
            subject: 'Bem-vindo ao SiDIF - Suas Credenciais de Acesso',
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e2e5ea;border-radius:8px;overflow:hidden;">
          <!-- Cabeçalho institucional -->
          <tr>
            <td style="background-color:#0f2a4a;padding:28px 32px;text-align:center;">
              <div style="color:#ffffff;font-size:26px;font-weight:bold;letter-spacing:2px;">SiDIF</div>
              <div style="color:#c8d6e5;font-size:12px;margin-top:6px;letter-spacing:1px;">SISTEMA DE GESTÃO DE OBRAS E FISCALIZAÇÃO</div>
              <div style="color:#8fa8c0;font-size:11px;margin-top:4px;">${orgNome}</div>
            </td>
          </tr>
          <!-- Faixa dourada -->
          <tr><td style="background-color:#c9a227;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- Corpo -->
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#0f2a4a;font-size:20px;margin:0 0 16px 0;font-weight:bold;">Bem-vindo ao SiDIF</h1>
              <p style="color:#3d4756;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                Uma conta de acesso foi criada para você pelo administrador do sistema.
                Utilize as credenciais abaixo para realizar seu primeiro acesso.
              </p>
              <!-- Caixa de credenciais -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border:1px solid #d4dde6;border-left:4px solid #0f2a4a;border-radius:4px;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#0f2a4a;font-size:13px;font-weight:bold;letter-spacing:1px;margin-bottom:12px;">SUAS CREDENCIAIS DE ACESSO</div>
                    <div style="color:#3d4756;font-size:14px;line-height:1.8;">
                      <strong>E-mail:</strong> ${email}<br>
                      <strong>Senha temporária:</strong>
                      <span style="font-family:'Courier New',Courier,monospace;background-color:#ffffff;border:1px solid #d4dde6;border-radius:4px;padding:2px 8px;font-size:15px;letter-spacing:1px;">${defaultPassword}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Aviso de segurança -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf6e3;border:1px solid #ecd9a0;border-radius:4px;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:14px 18px;color:#7a5c00;font-size:13px;line-height:1.5;">
                    <strong>Importante:</strong> por segurança, você será solicitado a definir uma nova senha no primeiro acesso. Não compartilhe estas credenciais com terceiros.
                  </td>
                </tr>
              </table>
              <p style="color:#3d4756;font-size:14px;line-height:1.6;margin:0;">
                Acesse o sistema em <a href="https://sidif.com.br" style="color:#0f2a4a;font-weight:bold;text-decoration:none;">sidif.com.br</a> e faça login com as credenciais acima.
              </p>
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td style="background-color:#f0f4f8;border-top:1px solid #e2e5ea;padding:20px 32px;text-align:center;">
              <div style="color:#8a94a3;font-size:11px;line-height:1.6;">
                Este é um e-mail automático. Por favor, não responda.<br>
                SiDIF — ${orgNome}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send email:', await emailResponse.text());
        } else {
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured, email not sent');
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'auth.users',
      record_id: newUser.user.id,
      operation: 'INSERT',
      new_values: { email, role, organization_id: targetOrgId },
      user_id: user.id,
      user_email: user.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        email: email,
        temporaryPassword: defaultPassword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
