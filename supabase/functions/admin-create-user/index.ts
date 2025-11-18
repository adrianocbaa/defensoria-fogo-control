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

    if (adminError || !isAdminData) {
      throw new Error('User is not an admin');
    }

    const { email, displayName, role = 'viewer' } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('Creating user with email:', email);

    const defaultPassword = 'Admin123';

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0]
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user.id);

    // Set force_password_change flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ force_password_change: true })
      .eq('user_id', newUser.user.id);

    if (profileError) {
      console.error('Error setting force_password_change:', profileError);
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
            from: 'Sistema <noreply@sistema.com>',
            to: [email],
            subject: 'Bem-vindo ao Sistema - Suas Credenciais de Acesso',
            html: `
              <h2>Bem-vindo ao Sistema!</h2>
              <p>Uma conta foi criada para você pelo administrador.</p>
              <p><strong>Suas credenciais de acesso:</strong></p>
              <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Senha temporária:</strong> ${defaultPassword}</li>
              </ul>
              <p><strong>IMPORTANTE:</strong> Por segurança, você será solicitado a alterar sua senha no primeiro login.</p>
              <p>Acesse o sistema e faça login com as credenciais acima.</p>
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
      new_values: { email, role },
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
