import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if user exists - security best practice
      return new Response(
        JSON.stringify({ message: "Se o e-mail estiver cadastrado, você receberá um código de verificação" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store code in database
    const { error: insertError } = await supabase
      .from("password_resets")
      .insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting reset code:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código de redefinição" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email with code
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #0066cc; }
            .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
            .content { padding: 30px 0; }
            .code-box { background: #f5f5f5; border: 2px dashed #0066cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 5px; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 Sistema de Redefinição de Senha</div>
            </div>
            <div class="content">
              <h2>Redefinição de Senha</h2>
              <p>Você solicitou a redefinição de senha da sua conta.</p>
              <p>Use o código abaixo para redefinir sua senha:</p>
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              <p style="text-align: center;">
                <a href="${supabaseUrl.replace('https://mmumfgxngzaivvyqfbed.supabase.co', window.location.origin)}/auth?verify=${code}" class="button">
                  Verificar Código
                </a>
              </p>
              <p><strong>Este código expira em 15 minutos.</strong></p>
              <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sistema <onboarding@resend.dev>",
        to: [email],
        subject: "Código de Redefinição de Senha",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Error sending email:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar e-mail" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit
    await supabase.rpc("log_login_attempt", {
      p_identifier: email,
      p_success: true,
      p_user_agent: "password_reset_request",
    });

    return new Response(
      JSON.stringify({ message: "Código enviado para seu e-mail" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
