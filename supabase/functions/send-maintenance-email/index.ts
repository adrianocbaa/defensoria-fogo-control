// Envia e-mail via Resend, prefixa subject com [SiDIF #NNNN] e registra em maintenance_ticket_emails.
// Payload:
//   { ticket_id: uuid, to?: string[], subject: string, html: string, text?: string, kind?: string, reply_to?: string }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "SiDIF Manutenção <chamados@sidif.com.br>";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: ticket, error: tErr } = await supabase
      .from("maintenance_tickets")
      .select("id, ticket_number, requester_email, title")
      .eq("id", body.ticket_id)
      .single();

    if (tErr || !ticket) return json(404, { error: "ticket_not_found" });

    const to: string[] = body.to?.length ? body.to : (ticket.requester_email ? [ticket.requester_email] : []);
    if (!to.length) return json(400, { error: "no_recipients" });

    const tag = `[SiDIF #${String(ticket.ticket_number).padStart(4, "0")}]`;
    const rawSubject = String(body.subject || ticket.title || "Chamado de manutenção");
    const subject = rawSubject.includes("[SiDIF #") ? rawSubject : `${tag} ${rawSubject}`;

    const html = body.html || `<p>${body.text || ""}</p>`;
    const text = body.text || html.replace(/<[^>]+>/g, "");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html,
        text,
        reply_to: body.reply_to || "chamados@sidif.com.br",
        headers: { "X-SiDIF-Ticket": String(ticket.ticket_number) },
      }),
    });

    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("resend error", resp.status, respBody);
      return json(resp.status, { error: "resend_failed", details: respBody });
    }

    await supabase.from("maintenance_ticket_emails").insert({
      ticket_id: ticket.id,
      direction: "outbound",
      from_addr: FROM,
      to_addrs: to,
      subject,
      body_html: html,
      body_text: text,
      message_id: respBody?.id ?? null,
      meta: { kind: body.kind || "custom", resend_id: respBody?.id ?? null },
    });

    return json(200, { ok: true, id: respBody?.id });
  } catch (e) {
    console.error("send-maintenance-email error", e);
    return json(500, { error: "internal", details: e instanceof Error ? e.message : String(e) });
  }
});
