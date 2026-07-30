// Gera PDF institucional de arquivamento (para anexar ao SEI) com thread completo
// e fotos de execução, salva no bucket 'documents'
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

// Identidade visual institucional (verde DPMT)
const GREEN: [number, number, number] = [26, 95, 63];
const GREEN_LIGHT: [number, number, number] = [237, 245, 241];
const GRAY_TEXT: [number, number, number] = [70, 70, 70];
const GRAY_LINE: [number, number, number] = [205, 213, 209];

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
      for (const bkt of ["service-photos", "documents", "avatars"]) {
        const { data } = await supabase.storage.from(bkt).download(urlOrPath);
        if (data) {
          bytes = new Uint8Array(await data.arrayBuffer());
          break;
        }
      }
    }
    if (!bytes) return null;
    const format = urlOrPath.toLowerCase().includes(".png") ? "PNG" : "JPEG";
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
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
    const margin = 48;
    const contentW = pageW - margin * 2;
    const headerH = 74;
    const footerY = pageH - 34;
    const bottomLimit = footerY - 16;
    const numero = String(ticket.ticket_number ?? "").padStart(4, "0");
    let y = 0;

    const drawHeader = () => {
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO", margin, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Diretoria de Infraestrutura Física — Núcleo de Manutenção", margin, 46);
      doc.setFontSize(8.5);
      doc.text("Relatório de atendimento de chamado — SiDIF", margin, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Nº ${numero}`, pageW - margin, 40, { align: "right" });
      doc.setTextColor(...GRAY_TEXT);
      doc.setFont("helvetica", "normal");
    };

    const drawFooter = () => {
      const page = doc.getNumberOfPages();
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.6);
      doc.line(margin, footerY - 8, pageW - margin, footerY - 8);
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Documento gerado automaticamente pelo SiDIF em ${new Date().toLocaleString("pt-BR")}`,
        margin,
        footerY + 2,
      );
      doc.text(`Página ${page}`, pageW - margin, footerY + 2, { align: "right" });
      doc.setTextColor(...GRAY_TEXT);
    };

    const newPage = () => {
      drawFooter();
      doc.addPage();
      drawHeader();
      y = headerH + 26;
    };

    const ensure = (needed: number) => {
      if (y + needed > bottomLimit) newPage();
    };

    const text = (t: string, size = 9.5, bold = false, indent = 0) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(t, contentW - indent);
      for (const l of lines) {
        ensure(size * 1.35);
        doc.text(l, margin + indent, y + size * 0.9);
        y += size * 1.35;
      }
    };

    const gap = (v = 6) => { y += v; };

    const section = (title: string) => {
      ensure(46);
      gap(10);
      doc.setFillColor(...GREEN_LIGHT);
      doc.rect(margin, y, contentW, 20, "F");
      doc.setFillColor(...GREEN);
      doc.rect(margin, y, 3.5, 20, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GREEN);
      doc.text(title.toUpperCase(), margin + 10, y + 13.5);
      doc.setTextColor(...GRAY_TEXT);
      y += 30;
    };

    // Linha rótulo/valor em duas colunas
    const kvRow = (pairs: [string, string][]) => {
      const colW = contentW / pairs.length;
      let maxH = 0;
      pairs.forEach(([k, v], i) => {
        const x = margin + i * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text(k.toUpperCase(), x, y + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...GRAY_TEXT);
        const lines = doc.splitTextToSize(v || "-", colW - 12);
        lines.forEach((l: string, li: number) => doc.text(l, x, y + 22 + li * 12));
        maxH = Math.max(maxH, 22 + lines.length * 12);
      });
      y += maxH + 6;
    };

    drawHeader();
    y = headerH + 26;

    // Título do chamado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const titleLines = doc.splitTextToSize(ticket.title || "Chamado de manutenção", contentW);
    titleLines.forEach((l: string) => { doc.text(l, margin, y + 12); y += 18; });
    doc.setTextColor(...GRAY_TEXT);
    gap(4);

    section("Identificação do chamado");
    kvRow([["Local", ticket.location || "-"], ["Tipo", ticket.type || "-"]]);
    kvRow([
      ["Solicitante", `${ticket.assignee || "-"}${ticket.requester_email ? ` (${ticket.requester_email})` : ""}`],
      ["Prioridade", ticket.priority || "-"],
    ]);
    kvRow([
      ["Origem da solicitação", ticket.request_type === "email" ? "E-mail" : ticket.request_type === "processo" ? `Processo SEI ${ticket.process_number || ""}`.trim() : "Direto"],
      ["Status atual", ticket.status || "-"],
    ]);
    kvRow([["Aberto em", fmt(ticket.created_at)], ["Concluído em", fmt(ticket.completed_at)]]);
    kvRow([
      ["Finalizado em", fmt(ticket.finalized_at)],
      [
        "Confirmação do solicitante",
        ticket.confirmed_at
          ? `${fmt(ticket.confirmed_at)} — ${ticket.confirmed_source === "auto" ? "tacitamente atendido" : "confirmado pelo solicitante"}`
          : "-",
      ],
    ]);

    // Serviços
    const services = (ticket.maintenance_ticket_services || []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    if (services.length) {
      section("Serviços executados");
      services.forEach((s: any, i: number) => {
        text(`${i + 1}. ${s.title}${s.status ? `  [${s.status}]` : ""}`, 9.5, true);
        if (s.description) text(s.description, 9, false, 14);
        gap(6);
      });
    }

    if (ticket.finalization_note) {
      section("Observações da finalização");
      text(String(ticket.finalization_note), 9.5);
    }

    if (history?.length) {
      section("Histórico de movimentação");
      for (const h of history) {
        text(
          `${fmt(h.created_at)} — ${h.from_status || "—"} → ${h.to_status}${h.changed_by_name ? ` (${h.changed_by_name})` : ""}`,
          9,
        );
      }
    }

    if (emails?.length) {
      section("Registro de comunicação por e-mail");
      for (const e of emails) {
        text(`[${e.direction === "inbound" ? "Recebido" : "Enviado"}] ${fmt(e.received_at)}`, 9, true);
        if (e.from_addr) text(`De: ${e.from_addr}`, 8.5, false, 10);
        if (e.to_addrs?.length) text(`Para: ${e.to_addrs.join(", ")}`, 8.5, false, 10);
        if (e.subject) text(`Assunto: ${e.subject}`, 8.5, false, 10);
        const bodyText = (e.body_text || (e.body_html ? String(e.body_html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "")).trim();
        if (bodyText) { gap(2); text(bodyText.slice(0, 4000), 8.5, false, 10); }
        gap(8);
      }
    }

    // Fotos de execução — mantendo proporção original
    const execPhotos: string[] = [];
    for (const s of services) {
      const arr = Array.isArray(s.execution_photos) ? s.execution_photos : [];
      for (const p of arr) {
        const u = typeof p === "string" ? p : (p?.url || p?.path);
        if (u) execPhotos.push(u);
      }
    }

    if (execPhotos.length) {
      section("Registro fotográfico da execução");
      const boxW = (contentW - 16) / 2;
      const boxH = boxW * 0.75;
      let col = 0;
      let rowTop = y;
      for (const url of execPhotos) {
        const img = await fetchImage(supabase, url);
        if (!img) continue;
        if (col === 0) {
          if (rowTop + boxH > bottomLimit) { newPage(); rowTop = y; }
        }
        const x = margin + col * (boxW + 16);
        try {
          // preserva a proporção: ajusta dentro da caixa e centraliza
          const props = doc.getImageProperties(img.data);
          const ratio = Math.min(boxW / props.width, boxH / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const ox = x + (boxW - w) / 2;
          const oy = rowTop + (boxH - h) / 2;
          doc.setFillColor(246, 248, 247);
          doc.rect(x, rowTop, boxW, boxH, "F");
          doc.addImage(img.data, img.format, ox, oy, w, h);
          doc.setDrawColor(...GRAY_LINE);
          doc.setLineWidth(0.6);
          doc.rect(x, rowTop, boxW, boxH);
        } catch (e) {
          console.warn("addImage fail", e);
        }
        col++;
        if (col === 2) { col = 0; rowTop += boxH + 16; y = rowTop; }
      }
      y = col === 0 ? rowTop : rowTop + boxH + 16;
    }

    drawFooter();

    const pdfBytes = doc.output("arraybuffer");
    const path = `maintenance-archive/${ticket.id}/chamado-${numero}.pdf`;
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
