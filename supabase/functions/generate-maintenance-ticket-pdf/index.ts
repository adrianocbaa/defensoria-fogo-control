// Gera PDF institucional de arquivamento (para anexar ao SEI) com thread completo
// e fotos de execução, salva no bucket 'documents'
// Payload: { ticket_id: uuid }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import { encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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
const GREEN_SOFT: [number, number, number] = [232, 243, 237];
const GRAY_TEXT: [number, number, number] = [70, 70, 70];
const GRAY_LABEL: [number, number, number] = [120, 130, 125];
const GRAY_LINE: [number, number, number] = [222, 229, 225];
const BOX_BG: [number, number, number] = [248, 251, 249];

function j(s: number, b: unknown) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

function fmt(d?: string | null) {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return d; }
}

const MAX_IMG_BYTES = 2_500_000; // ignora imagens muito pesadas (estouram CPU)
const MAX_PHOTOS_PER_GRID = 6;

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
    if (bytes.length > MAX_IMG_BYTES) return null;
    const format = urlOrPath.toLowerCase().includes(".png") ? "PNG" : "JPEG";
    return { data: `data:image/${format.toLowerCase()};base64,${encodeBase64(bytes)}`, format };
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

    // Servidores da manutenção designados ao chamado
    const executorIds = new Set<string>();
    for (const id of (ticket.manager_ids || [])) if (id) executorIds.add(id);
    if (ticket.manager_id) executorIds.add(ticket.manager_id);
    for (const s of (ticket.maintenance_ticket_services || [])) {
      for (const id of (s.manager_ids || [])) if (id) executorIds.add(id);
      if (s.manager_id) executorIds.add(s.manager_id);
    }
    let executores = "-";
    if (executorIds.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", Array.from(executorIds));
      const nomes = (profs || []).map((p: any) => p.display_name).filter(Boolean);
      if (nomes.length) executores = nomes.join(", ");
    }

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
      doc.text("Diretoria de Infraestrutura Física — Coord. Manutenção Predial", margin, 46);
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
        `Gerado automaticamente pelo SiDIF em ${new Date().toLocaleString("pt-BR")}`,
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

    // Título de seção: barra verde + rótulo + régua fina (estilo do layout de referência)
    const section = (title: string) => {
      ensure(40);
      gap(14);
      doc.setFillColor(...GREEN);
      doc.rect(margin, y, 3.5, 12, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GREEN);
      doc.text(title.toUpperCase(), margin + 10, y + 10);
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.6);
      doc.line(margin, y + 19, pageW - margin, y + 19);
      doc.setTextColor(...GRAY_TEXT);
      y += 30;
    };

    // Bloco de texto dentro de caixa clara
    const boxText = (t: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(t, contentW - 28);
      const h = lines.length * 13 + 20;
      ensure(h);
      doc.setFillColor(...BOX_BG);
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.6);
      doc.rect(margin, y, contentW, h, "FD");
      doc.setTextColor(...GRAY_TEXT);
      lines.forEach((l: string, i: number) => doc.text(l, margin + 14, y + 20 + i * 13));
      y += h + 4;
    };

    // Selo/badge arredondado
    const badge = (label: string, x: number, cy: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const w = doc.getTextWidth(label.toUpperCase()) + 14;
      doc.setFillColor(...GREEN_SOFT);
      doc.roundedRect(x, cy - 8, w, 14, 7, 7, "F");
      doc.setTextColor(...GREEN);
      doc.text(label.toUpperCase(), x + 7, cy + 1.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.setFont("helvetica", "normal");
      return w;
    };

    // Cartão de identificação: grade 2 colunas com linhas divisórias
    const infoCard = (rows: [string, string, boolean?][][]) => {
      const rowH = 30;
      const h = rows.length * rowH;
      ensure(h + 8);
      const top = y;
      doc.setFillColor(...BOX_BG);
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.6);
      doc.rect(margin, top, contentW, h, "FD");
      const half = contentW / 2;
      rows.forEach((pair, ri) => {
        const ry = top + ri * rowH;
        if (ri > 0) doc.line(margin, ry, pageW - margin, ry);
        const cellW = pair.length === 1 ? contentW : half;
        pair.forEach(([k, v, isBadge], ci) => {
          const x = margin + ci * cellW + 14;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...GRAY_LABEL);
          doc.text(k, x, ry + rowH / 2 + 3);
          const vx = x + 88;
          if (isBadge) {
            badge(v, vx, ry + rowH / 2 + 1);
          } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(50, 50, 50);
            const lines = doc.splitTextToSize(v || "-", cellW - 104);
            doc.text(lines[0] ?? "-", vx, ry + rowH / 2 + 3.5);
          }
        });
        // divisória vertical central
        if (pair.length > 1) {
          doc.setDrawColor(...GRAY_LINE);
          doc.line(margin + half, ry + 7, margin + half, ry + rowH - 7);
        }
      });
      doc.setTextColor(...GRAY_TEXT);
      y = top + h + 4;
    };

    drawHeader();
    y = headerH + 30;

    // Cartão de identificação
    const origem = ticket.request_type === "email"
      ? "E-mail"
      : ticket.request_type === "processo"
        ? (ticket.process_number ? `SEI n° ${ticket.process_number}` : "SEI")
        : "Direto";

    infoCard([
      [["Local", ticket.location || "-"], ["Solicitante", ticket.assignee || "-"]],
      [["Prioridade", ticket.priority || "-", true], ["Tipo", ticket.type || "-"]],
      [["Criado em", fmt(ticket.created_at)], ["Concluído em", fmt(ticket.completed_at)]],
      [["Status", ticket.status || "-", true], ["Origem", origem]],
      [["Executado por", executores]],
    ]);
    if (ticket.requester_email || ticket.confirmed_at) {
      infoCard([
        [
          ["E-mail", ticket.requester_email || "-"],
          [
            "Confirmação",
            ticket.confirmed_at
              ? `${fmt(ticket.confirmed_at)}${ticket.confirmed_source === "auto" ? " (tácita)" : ""}`
              : "-",
          ],
        ],
      ]);
    }

    section("Descrição do chamado");
    boxText(
      `${(ticket.title || "Chamado de manutenção").toUpperCase()}${ticket.description ? ` — ${ticket.description}` : ""}`,
    );

    // Serviços — tabela
    const services = (ticket.maintenance_ticket_services || []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    if (services.length) {
      section("Serviços executados");
      const colService = contentW * 0.52;
      const colStatus = contentW * 0.2;
      const headH = 24;
      ensure(headH + 26);
      doc.setFillColor(...GREEN_SOFT);
      doc.rect(margin, y, contentW, headH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...GREEN);
      doc.text("SERVIÇO", margin + 12, y + 15);
      doc.text("STATUS", margin + 12 + colService, y + 15);
      doc.text("OBSERVAÇÃO", margin + 12 + colService + colStatus, y + 15);
      doc.setTextColor(...GRAY_TEXT);
      y += headH;

      services.forEach((s: any) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const nameLines = doc.splitTextToSize(String(s.title || "-"), colService - 20);
        const obsLines = doc.splitTextToSize(
          String(s.description || "—"),
          contentW - colService - colStatus - 24,
        );
        const rowH = Math.max(26, Math.max(nameLines.length, obsLines.length) * 12 + 14);
        ensure(rowH);
        doc.setDrawColor(...GRAY_LINE);
        doc.setLineWidth(0.6);
        doc.rect(margin, y, contentW, rowH);
        doc.setTextColor(50, 50, 50);
        nameLines.forEach((l: string, i: number) => doc.text(l, margin + 12, y + 17 + i * 12));
        if (s.status) badge(String(s.status), margin + 12 + colService, y + 17);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        obsLines.forEach((l: string, i: number) =>
          doc.text(l, margin + 12 + colService + colStatus, y + 17 + i * 12),
        );
        y += rowH;
      });
      y += 4;
    }

    if (ticket.finalization_note) {
      section("Observações da finalização");
      boxText(String(ticket.finalization_note));
    }

    if (history?.length) {
      section("Histórico de movimentação");
      for (const h of history) {
        text(
          `${fmt(h.created_at)} — ${h.from_status || "-"} > ${h.to_status}${h.changed_by_name ? ` (${h.changed_by_name})` : ""}`,
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

    // Registro fotográfico — ANTES (referência) e DEPOIS (execução)
    const collect = (key: string): string[] => {
      const out: string[] = [];
      const push = (arr: any) => {
        if (!Array.isArray(arr)) return;
        for (const p of arr) {
          const u = typeof p === "string" ? p : (p?.url || p?.path);
          if (u) out.push(u);
        }
      };
      if (key === "reference_photos") push((ticket as any).reference_photos);
      for (const s of services) push(s?.[key]);
      return out;
    };
    const refPhotos = collect("reference_photos");
    const execPhotos = collect("execution_photos");

    const photoGrid = async (urls: string[], label: string) => {
      if (!urls.length) return;
      const boxW = (contentW - 16) / 2;
      const boxH = boxW * 0.75;
      if (y + 46 + boxH > bottomLimit) newPage();
      section(`Registro fotográfico — ${label}`);
      let col = 0;
      let rowTop = y;
      for (const url of urls.slice(0, MAX_PHOTOS_PER_GRID)) {
        const img = await fetchImage(supabase, url);
        if (!img) continue;
        if (col === 0 && rowTop + boxH > bottomLimit) { newPage(); rowTop = y; }
        const x = margin + col * (boxW + 16);
        try {
          const props = doc.getImageProperties(img.data);
          const ratio = Math.min(boxW / props.width, boxH / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          const ox = x + (boxW - w) / 2;
          const oy = rowTop + (boxH - h) / 2;
          doc.setFillColor(...BOX_BG);
          doc.roundedRect(x, rowTop, boxW, boxH, 4, 4, "F");
          doc.addImage(img.data, img.format, ox, oy, w, h, undefined, "NONE");
          doc.setDrawColor(...GRAY_LINE);
          doc.setLineWidth(0.6);
          doc.roundedRect(x, rowTop, boxW, boxH, 4, 4);
          badge(label, x + 6, rowTop + 14);
        } catch (e) {
          console.warn("addImage fail", e);
        }
        col++;
        if (col === 2) { col = 0; rowTop += boxH + 16; y = rowTop; }
      }
      y = col === 0 ? rowTop : rowTop + boxH + 16;
    };

    await photoGrid(refPhotos, "Antes");
    await photoGrid(execPhotos, "Depois");

    drawFooter();

    const pdfBytes = doc.output("arraybuffer");
    // nome versionado evita servir versão em cache após regeração
    const path = `maintenance-archive/${ticket.id}/chamado-${numero}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, new Uint8Array(pdfBytes), {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: true,
    });
    if (upErr) return j(500, { error: "upload_failed", details: upErr.message });

    const previous = (ticket as any).archive_pdf_url as string | null;
    await supabase.from("maintenance_tickets").update({ archive_pdf_url: path }).eq("id", ticket.id);
    if (previous && previous !== path) {
      try { await supabase.storage.from(BUCKET).remove([previous]); } catch (_) { /* ignore */ }
    }

    return j(200, { ok: true, path });

  } catch (e) {
    console.error("pdf error", e);
    return j(500, { error: "internal", details: e instanceof Error ? e.message : String(e) });
  }
});
