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
    // Get origin from request headers
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "http://localhost:8080";
    
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
    const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redefinição de Senha - SiDIF</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:#0f2a4a;padding:28px 32px;text-align:center;">
<div style="font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:1px;">SiDIF</div>
<div style="font-size:13px;color:#dbe4f0;margin-top:4px;">Sistema de Gestão de Obras e Fiscalização</div>
<div style="font-size:12px;color:#c9a227;margin-top:6px;">Defensoria Pública do Estado de Mato Grosso — DPE-MT</div>
</td></tr>
<tr><td style="background:#c9a227;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px;font-size:20px;color:#0f2a4a;">Redefinição de Senha</h2>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no SiDIF.</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Informe o código abaixo na tela de redefinição:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-left:4px solid #0f2a4a;margin:0 0 20px;"><tr><td style="padding:20px;text-align:center;">
<div style="font-size:12px;color:#64748b;margin-bottom:6px;">Código de verificação</div>
<div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;color:#0f2a4a;letter-spacing:6px;">${code}</div>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px;"><tr><td style="background:#0f2a4a;border-radius:4px;">
<a href="${origin}/auth?verify=${code}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">Redefinir minha senha</a>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6e3;border:1px solid #f1e0a8;border-radius:4px;"><tr><td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#7a5b00;">
<strong>Atenção:</strong> este código expira em 15 minutos. Se você não solicitou a redefinição, ignore este e-mail — sua senha atual continua válida.
</td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;font-size:12px;color:#64748b;line-height:1.5;">
SiDIF — Defensoria Pública do Estado de Mato Grosso<br>
<a href="https://sidif.com.br" style="color:#0f2a4a;">sidif.com.br</a><br>
Mensagem automática. Por favor, não responda.
</td></tr>
</table></td></tr></table></body></html>`;

    const emailText = `SiDIF - Defensoria Pública do Estado de Mato Grosso (DPE-MT)

Redefinição de Senha

Recebemos uma solicitação para redefinir a senha da sua conta no SiDIF.
Código de verificação: ${code}

Ou acesse: ${origin}/auth?verify=${code}

Este código expira em 15 minutos. Se você não solicitou a redefinição, ignore este e-mail.

sidif.com.br - Mensagem automática, não responda.`;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SiDIF - DPE-MT <sidif@sidif.com.br>",
        to: [email],
        subject: "Redefinição de Senha - SiDIF",
        html: emailHtml,
        text: emailText,
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
