// Cron diário: processa outbox de manutenção
// - envia e-mails de confirmação pendentes
// - envia lembretes 3 dias após envio
// - auto-finaliza tarefas sem resposta em 7 dias
// - dispara geração de PDF de arquivamento

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://sidif.com.br";

function baseHtml(inner: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:24px">
    ${inner}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#6b7280">Sistema SiDIF — Defensoria Pública do Estado de Mato Grosso</p>
  </body></html>`;
}

async function invokeSender(payload: any) {
  const url = `${SUPABASE_URL}/functions/v1/send-maintenance-email`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`sender ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

async function invokePdf(ticket_id: string) {
  const url = `${SUPABASE_URL}/functions/v1/generate-maintenance-ticket-pdf`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ ticket_id }),
    });
  } catch (e) {
    console.error("pdf invoke failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const summary = { processed_outbox: 0, reminders_sent: 0, auto_finalized: 0, errors: [] as string[] };

  try {
    // 1) Processa outbox pendente
    const { data: pending } = await supabase
      .from("maintenance_ticket_email_outbox")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString())
      .limit(50);

    for (const job of pending || []) {
      try {
        const { data: ticket } = await supabase
          .from("maintenance_tickets")
          .select("id, ticket_number, title, location, requester_email, finalization_note, confirmation_token")
          .eq("id", job.ticket_id)
          .single();

        if (!ticket) throw new Error("ticket_not_found");

        if (job.kind === "confirmation" && ticket.requester_email) {
          const link = `${APP_URL}/manutencao/confirmar/${ticket.confirmation_token}`;
          const html = baseHtml(`
            <h2 style="color:#0f172a">Serviço de manutenção executado</h2>
            <p>Prezado(a) solicitante,</p>
            <p>Informamos que o chamado <strong>#${String(ticket.ticket_number).padStart(4,"0")}</strong> — <em>${ticket.title}</em> — foi executado pela equipe de manutenção.</p>
            ${ticket.finalization_note ? `<p><strong>Observações:</strong> ${ticket.finalization_note}</p>` : ""}
            <p>Solicitamos gentileza confirmar a conclusão do serviço através do link abaixo:</p>
            <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Confirmar execução do serviço</a></p>
            <p style="font-size:13px;color:#6b7280">Caso não haja manifestação em até 7 (sete) dias corridos, a solicitação será considerada tacitamente atendida.</p>
          `);
          await invokeSender({ ticket_id: ticket.id, subject: `Serviço executado — ${ticket.title}`, html, kind: "confirmation" });
          await supabase.from("maintenance_tickets").update({ confirmation_sent_at: now.toISOString() }).eq("id", ticket.id);
        } else if (job.kind === "auto_finalize") {
          await invokePdf(ticket.id);
        }

        await supabase.from("maintenance_ticket_email_outbox").update({
          status: "sent", sent_at: now.toISOString(), attempts: (job.attempts || 0) + 1,
        }).eq("id", job.id);
        summary.processed_outbox++;
      } catch (e) {
        summary.errors.push(`outbox ${job.id}: ${e instanceof Error ? e.message : String(e)}`);
        await supabase.from("maintenance_ticket_email_outbox").update({
          status: (job.attempts || 0) >= 3 ? "failed" : "pending",
          attempts: (job.attempts || 0) + 1,
          last_error: e instanceof Error ? e.message : String(e),
        }).eq("id", job.id);
      }
    }

    // 2) Lembretes: enviados há mais de 3 dias, sem lembrete anterior, sem confirmação
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: needsReminder } = await supabase
      .from("maintenance_tickets")
      .select("id, ticket_number, title, requester_email, confirmation_token, confirmation_sent_at")
      .lte("confirmation_sent_at", threeDaysAgo)
      .is("confirmation_reminder_sent_at", null)
      .is("confirmed_at", null)
      .not("requester_email", "is", null);

    for (const t of needsReminder || []) {
      try {
        const link = `${APP_URL}/manutencao/confirmar/${t.confirmation_token}`;
        const html = baseHtml(`
          <h2 style="color:#b45309">Lembrete: confirmação pendente</h2>
          <p>Prezado(a) solicitante,</p>
          <p>Consta em nosso sistema que o chamado <strong>#${String(t.ticket_number).padStart(4,"0")}</strong> — <em>${t.title}</em> — foi executado pela equipe de manutenção, porém ainda não recebemos sua confirmação.</p>
          <p>Solicitamos gentileza confirmar a execução através do link abaixo:</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Confirmar execução do serviço</a></p>
          <p style="font-size:13px;color:#6b7280"><strong>Aviso:</strong> caso não haja manifestação em até 4 (quatro) dias corridos a partir desta comunicação, a solicitação será considerada tacitamente atendida e arquivada.</p>
        `);
        await invokeSender({ ticket_id: t.id, subject: `Lembrete: confirmação pendente — ${t.title}`, html, kind: "reminder" });
        await supabase.from("maintenance_tickets").update({ confirmation_reminder_sent_at: now.toISOString() }).eq("id", t.id);
        summary.reminders_sent++;
      } catch (e) {
        summary.errors.push(`reminder ${t.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 3) Auto-finaliza: confirmação enviada há mais de 7 dias sem resposta
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: toAutoFinalize } = await supabase
      .from("maintenance_tickets")
      .select("id, ticket_number")
      .lte("confirmation_sent_at", sevenDaysAgo)
      .is("confirmed_at", null)
      .is("finalized_at", null);

    for (const t of toAutoFinalize || []) {
      try {
        await supabase.from("maintenance_tickets").update({
          confirmed_at: now.toISOString(),
          confirmed_source: "auto",
          finalized_at: now.toISOString(),
          finalization_note: "Considerado tacitamente atendido: solicitante não confirmou em 7 dias.",
        }).eq("id", t.id);
        await invokePdf(t.id);
        summary.auto_finalized++;
      } catch (e) {
        summary.errors.push(`auto ${t.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
