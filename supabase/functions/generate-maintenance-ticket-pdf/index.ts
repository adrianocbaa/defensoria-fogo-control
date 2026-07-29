// Gera PDF de arquivamento com thread completo e fotos de execução, salva no bucket 'documents'
// Payload: { ticket_id: uuid }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "documents";

function j(s: number, b: unknown) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

function fmt(d?: string | null) {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
}

async function fetchImage(supabase: any, urlOrPath: string): Promise<{ data: string; format: string } | null> {
  try {
    let bytes: Uint8Array | null = null;
    if (urlOrPath.startsWith("http")) {
      const r = await fetch(urlOrPath);
      if (!r.ok) return null;
      bytes = new Uint8Array(await r.arrayBuffer());
    } else {
      // caminho relativo em um bucket — tentar em service-photos, documents
      for (const bkt of ["service-photos", "documents", "avatars"]) {
        const { data } = await supabase.storage.from(bkt).download(urlOrPath);
        if (data) {
          bytes = new Uint8Array(await data.arrayBuffer());
          break;
        }
      }
    }
    if (!bytes) return null;
    const format = urlOrPath.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { data: `data:image/${format.toLowerCase()};base64,${btoa(bin)}`, format };
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j(405, { error: "method_not_allowed" });

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) return j(400, { error: "missing_ticket_id" });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: ticket, error: te } = await supabase
      .from("maintenance_tickets")
      .select("*, maintenance_ticket_services(*)")
      .eq("id", ticket_id)
      .single();
    if (te || !ticket) return j(404, { error: "ticket_not_found" });

    const { data: emails } = await supabase
      .from("maintenance_ticket_emails")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("received_at", { ascending: true });

    const { data: history } = await supabase
      .from("maintenance_ticket_status_history")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const line = (text: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      for (const l of lines) {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(l, margin, y);
        y += size * 1.3;
      }
    };
    const gap = (v = 6) => { y += v; };
    const hr = () => { if (y > pageH - margin - 20) { doc.addPage(); y = margin; } doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 10; };

    // Cabeçalho
    line(`Chamado de Manutenção #${String(ticket.ticket_number).padStart(4,"0")}`, 16, true);
    gap(4);
    line(ticket.title || "-", 12, true);
    gap(2);
    line(`Local: ${ticket.location || "-"}`);
    line(`Solicitante: ${ticket.assignee || "-"}${ticket.requester_email ? ` <${ticket.requester_email}>` : ""}`);
    line(`Prioridade: ${ticket.priority || "-"}   |   Tipo: ${ticket.type || "-"}`);
    line(`Criado em: ${fmt(ticket.created_at)}   |   Concluído em: ${fmt(ticket.completed_at)}   |   Finalizado em: ${fmt(ticket.finalized_at)}`);
    if (ticket.confirmed_at) {
      line(`Confirmado em: ${fmt(ticket.confirmed_at)} (${ticket.confirmed_source === "auto" ? "tacitamente atendido" : "confirmado pelo solicitante"})`);
    }
    gap(6); hr();

    // Serviços
    const services = (ticket.maintenance_ticket_services || []).sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    if (services.length) {
      line("Serviços executados", 13, true); gap(2);
      for (const s of services) {
        line(`• ${s.title}${s.status ? ` [${s.status}]` : ""}`, 10, true);
        if (s.description) line(s.description);
        gap(4);
      }
      hr();
    }

    // Nota de finalização
    if (ticket.finalization_note) {
      line("Observações da finalização", 13, true); gap(2);
      line(ticket.finalization_note);
      hr();
    }

    // Histórico de status
    if (history?.length) {
      line("Histórico de status", 13, true); gap(2);
      for (const h of history) {
        line(`${fmt(h.created_at)} — ${h.from_status || "—"} → ${h.to_status}${h.changed_by_name ? ` (${h.changed_by_name})` : ""}`);
      }
      hr();
    }

    // Thread de e-mails
    if (emails?.length) {
      line("Conversa por e-mail", 13, true); gap(2);
      for (const e of emails) {
        line(`[${e.direction === "inbound" ? "Recebido" : "Enviado"}] ${fmt(e.received_at)}`, 10, true);
        if (e.from_addr) line(`De: ${e.from_addr}`);
        if (e.to_addrs?.length) line(`Para: ${e.to_addrs.join(", ")}`);
        if (e.subject) line(`Assunto: ${e.subject}`);
        gap(2);
        const bodyText = (e.body_text || (e.body_html ? String(e.body_html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "")).trim();
        if (bodyText) line(bodyText.slice(0, 4000));
        gap(6);
      }
      hr();
    }

    // Fotos de execução
    const execPhotos: string[] = [];
    for (const s of services) {
      const arr = Array.isArray(s.execution_photos) ? s.execution_photos : [];
      for (const p of arr) {
        const u = typeof p === "string" ? p : (p?.url || p?.path);
        if (u) execPhotos.push(u);
      }
    }

    if (execPhotos.length) {
      if (y > pageH - 200) { doc.addPage(); y = margin; }
      line("Fotos da execução", 13, true); gap(4);
      const imgW = (pageW - margin * 2 - 12) / 2;
      const imgH = imgW * 0.75;
      let col = 0;
      let rowY = y;
      for (const url of execPhotos) {
        const img = await fetchImage(supabase, url);
        if (!img) continue;
        if (col === 0 && rowY + imgH > pageH - margin) { doc.addPage(); rowY = margin; }
        const x = margin + col * (imgW + 12);
        try { doc.addImage(img.data, img.format, x, rowY, imgW, imgH); } catch (e) { console.warn("addImage fail", e); }
        col++;
        if (col === 2) { col = 0; rowY += imgH + 12; }
      }
      y = rowY + imgH + 12;
    }

    // Salvar
    const pdfBytes = doc.output("arraybuffer");
    const path = `maintenance-archive/${ticket.id}/chamado-${String(ticket.ticket_number).padStart(4,"0")}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, new Uint8Array(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) return j(500, { error: "upload_failed", details: upErr.message });

    await supabase.from("maintenance_tickets").update({ archive_pdf_url: path }).eq("id", ticket.id);

    return j(200, { ok: true, path });
  } catch (e) {
    console.error("pdf error", e);
    return j(500, { error: "internal", details: e instanceof Error ? e.message : String(e) });
  }
});
