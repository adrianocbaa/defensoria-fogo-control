// Envia e-mail via Resend vinculado a um chamado, prefixa subject com [SiDIF #NNNN]
// e registra em maintenance_ticket_emails.
// Payload: { ticket_id: uuid, subject: string, html?: string, text?: string, kind?: string, to?: string[] }
//
// Lote S2 — não é relay:
//  - exige usuário autenticado que gerencie o chamado no próprio órgão, OU chamada interna
//    servidor→servidor (service_role / segredo de cron);
//  - destinatários são SEMPRE derivados do chamado (e-mail do solicitante). `to`, se enviado,
//    só é aceito quando idêntico a esse conjunto; reply_to é fixo.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, resolveCaller, loadAuthorizedTicket, guardResponse, GuardError, UUID_RE } from "../_shared/tenant-guard.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sidif-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "SiDIF Manutenção <chamados@sidif.com.br>";
const REPLY_TO = "chamados@sidif.com.br";

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
    const supabase = adminClient();
    let body: any;
    let ticketRow: any;
    try {
      const caller = await resolveCaller(req, supabase);
      body = await req.json().catch(() => ({}));
      if (typeof body?.ticket_id !== "string" || !UUID_RE.test(body.ticket_id)) throw new GuardError(400, "invalid_input");
      if (typeof body.subject !== "string" || !body.subject.trim() || body.subject.length > 300) throw new GuardError(400, "invalid_input");
      if (body.html != null && (typeof body.html !== "string" || body.html.length > 200_000)) throw new GuardError(400, "invalid_input");
      ticketRow = await loadAuthorizedTicket(supabase, caller, body.ticket_id, "manage");
    } catch (e) {
      const r = guardResponse(e, cors);
      if (r) return r;
      throw e;
    }

    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select("id, ticket_number, requester_email, title")
      .eq("id", ticketRow.id)
      .single();
    if (!ticket) return json(404, { error: "not_found" });

    const allowed = ticket.requester_email ? [String(ticket.requester_email).trim().toLowerCase()] : [];
    if (!allowed.length) return json(400, { error: "no_recipients" });
    if (Array.isArray(body.to) && body.to.length) {
      const asked = body.to.map((x: unknown) => String(x).trim().toLowerCase());
      if (!asked.every((a: string) => allowed.includes(a))) return json(403, { error: "recipient_not_allowed" });
    }
    const to = allowed;

    const tag = `[SiDIF #${String(ticket.ticket_number).padStart(4, "0")}]`;
    const rawSubject = String(body.subject);
    const subject = rawSubject.includes(tag) ? rawSubject : `${tag} ${rawSubject.replace(/\[SiDIF #\d+\]\s*/g, "")}`;

    const html = body.html || `<p>${String(body.text || "").replace(/</g, "&lt;")}</p>`;
    const text = body.text || html.replace(/<[^>]+>/g, "");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM, to, subject, html, text, reply_to: REPLY_TO,
        headers: { "X-SiDIF-Ticket": String(ticket.ticket_number) },
      }),
    });

    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("resend error", resp.status, respBody);
      return json(502, { error: "send_failed" });
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
    return json(500, { error: "internal" });
  }
});
