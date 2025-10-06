import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for teletrabalho ending today...");

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Find all teletrabalho records ending today
    const { data: endingTeletrabalhos, error: fetchError } = await supabase
      .from("nucleo_teletrabalho")
      .select(`
        id,
        data_fim,
        nucleo_id,
        nucleos_central (
          nome,
          cidade
        )
      `)
      .eq("data_fim", today);

    if (fetchError) {
      console.error("Error fetching teletrabalho records:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${endingTeletrabalhos?.length || 0} teletrabalho(s) ending today`);

    if (!endingTeletrabalhos || endingTeletrabalhos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No teletrabalho ending today",
          count: 0 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email for each ending teletrabalho
    const emailResults = [];
    for (const teletrabalho of endingTeletrabalhos) {
      const nucleoNome = teletrabalho.nucleos_central?.nome || "Núcleo não identificado";
      
      console.log(`Sending email for núcleo: ${nucleoNome}`);

      try {
        const emailResponse = await resend.emails.send({
          from: "Sistema de Gestão <noreply@dif.app.br>",
          to: ["luizfrota@dp.mt.gov.br", "adrianomelo@dp.mt.gov.br"],
          subject: "Encerramento do período de teletrabalho",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-bottom: 20px;">Encerramento do período de teletrabalho</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  O período de teletrabalho do <strong>NÚCLEO: ${nucleoNome}</strong> está se encerrando hoje.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 14px;">
                  Esta é uma mensagem automática do Sistema de Gestão.
                </p>
              </div>
            </div>
          `,
        });

        console.log(`Email sent successfully for ${nucleoNome}:`, emailResponse);
        emailResults.push({
          nucleo: nucleoNome,
          success: true,
          emailId: emailResponse.data?.id,
        });
      } catch (emailError) {
        console.error(`Error sending email for ${nucleoNome}:`, emailError);
        emailResults.push({
          nucleo: nucleoNome,
          success: false,
          error: emailError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Emails processed",
        count: endingTeletrabalhos.length,
        results: emailResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-teletrabalho-ending function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
