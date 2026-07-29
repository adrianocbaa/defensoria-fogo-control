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
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <tr><td style="background:#1a5f3f;padding:20px 28px">
            <div style="font-size:12px;letter-spacing:2px;color:#86efac;font-weight:600;text-transform:uppercase">SiDIF</div>
            <div style="font-size:18px;color:#ffffff;font-weight:600;margin-top:4px">Defensoria Pública do Estado de Mato Grosso</div>
            <div style="font-size:13px;color:#d1fae5;margin-top:2px">Diretoria de Infraestrutura Física - Manutenção</div>
          </td></tr>
          <tr><td style="padding:28px">${inner}</td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;font-size:11px;color:#6b7280;line-height:1.5">
            Esta é uma mensagem automática do Sistema SiDIF. Em caso de dúvidas, responda este e-mail — sua resposta será vinculada automaticamente ao chamado.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function renderServicesBlock(services: Array<any>) {
  if (!services || !services.length) return "";
  const items = services.map((s, i) => {
    const photos = Array.isArray(s.execution_photos) ? s.execution_photos.length : 0;
    const desc = s.description ? `<div style="font-size:13px;color:#4b5563;margin-top:4px;line-height:1.5">${String(s.description).replace(/</g,"&lt;")}</div>` : "";
    const photoLine = photos ? `<div style="font-size:12px;color:#0f2c5c;margin-top:6px">${photos} foto(s) de execução anexada(s)</div>` : "";
    return `<tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:14px;color:#0f2c5c;font-weight:600">${i+1}. ${String(s.title || "Serviço").replace(/</g,"&lt;")}</div>
      ${desc}${photoLine}
    </td></tr>`;
  }).join("");
  return `<div style="margin:20px 0 8px;font-size:12px;letter-spacing:1px;color:#0f2c5c;font-weight:700;text-transform:uppercase">Serviços executados</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">${items}</table>`;
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
          const { data: services } = await supabase
            .from("maintenance_ticket_services")
            .select("title, description, execution_photos, order_index")
            .eq("ticket_id", ticket.id)
            .order("order_index");
          const btn = `<a href="${link}" style="background:#0f2c5c;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px">Confirmar execução do serviço</a>`;
          const html = baseHtml(`
            <div style="font-size:12px;letter-spacing:1px;color:#0f2c5c;font-weight:700;text-transform:uppercase">Comunicado de execução</div>
            <h2 style="margin:6px 0 16px;font-size:20px;color:#0f172a;font-weight:600">Chamado #${String(ticket.ticket_number).padStart(4,"0")} — Serviço executado</h2>
            <p style="font-size:14px;line-height:1.6;margin:0 0 12px">Prezado(a) solicitante,</p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 12px">Informamos que a solicitação <strong>#${String(ticket.ticket_number).padStart(4,"0")} — ${ticket.title}</strong>${ticket.location ? ` (<em>${ticket.location}</em>)` : ""} foi atendida pela equipe do Núcleo de Manutenção.</p>
            ${ticket.finalization_note ? `<div style="margin:16px 0;padding:12px 14px;border-left:3px solid #0f2c5c;background:#f1f5f9;font-size:13px;line-height:1.5"><strong style="color:#0f2c5c">Observações da equipe:</strong><br/>${String(ticket.finalization_note).replace(/</g,"&lt;")}</div>` : ""}
            ${renderServicesBlock(services || [])}
            <p style="font-size:14px;line-height:1.6;margin:20px 0 8px">Para conferir os detalhes e fotos da execução, e formalizar o aceite ou reabertura do chamado, utilize o botão abaixo:</p>
            <p style="margin:20px 0 8px">${btn}</p>
            <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-top:16px">Caso não haja manifestação em até <strong>7 (sete) dias corridos</strong>, a solicitação será considerada tacitamente atendida e o chamado arquivado.</p>
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
        const btn = `<a href="${link}" style="background:#0f2c5c;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px">Confirmar execução do serviço</a>`;
        const html = baseHtml(`
          <div style="font-size:12px;letter-spacing:1px;color:#b45309;font-weight:700;text-transform:uppercase">Lembrete de confirmação</div>
          <h2 style="margin:6px 0 16px;font-size:20px;color:#0f172a;font-weight:600">Chamado #${String(t.ticket_number).padStart(4,"0")} — aguardando aceite</h2>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">Prezado(a) solicitante,</p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">Consta em nosso sistema que a solicitação <strong>#${String(t.ticket_number).padStart(4,"0")} — ${t.title}</strong> foi executada pela equipe do Núcleo de Manutenção, porém ainda não recebemos sua manifestação de aceite.</p>
          <p style="margin:24px 0">${btn}</p>
          <p style="font-size:12px;color:#6b7280;line-height:1.6"><strong>Aviso:</strong> não havendo manifestação em até <strong>4 (quatro) dias corridos</strong>, a solicitação será considerada tacitamente atendida e o chamado arquivado.</p>
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
