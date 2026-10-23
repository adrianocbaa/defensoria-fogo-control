// H3 (multi-tenant): o órgão é resolvido SOMENTE pelo destinatário via RPC
// maintenance_inbound_resolve (alias <alias>@manutencao.sidif.com.br,
// chamados+<alias>@sidif.com.br ou endereço legado mapeado). Sem fallback.
// Segredo: header X-SIDIF-INBOUND-SECRET (querystring ?token= DEPRECATED).
// Destinatário de envelope opcional: header X-SIDIF-Envelope-To.
// Recebe e-mails encaminhados para chamados@sidif.com.br via Resend Inbound
// e cria automaticamente uma tarefa em maintenance_tickets.
//
// Configuração no Resend:
//   Endpoint: https://<project>.functions.supabase.co/inbound-maintenance-email?token=<INBOUND_EMAIL_TOKEN>
//   Método: POST (application/json)
//
// Payload esperado (Resend Inbound):
//   {
//     from: { address, name },
//     to: [{ address }],
//     subject, text, html,
//     headers: { "message-id": "..." },
//     attachments: [{ filename, content_type, size, content_url | content (base64) }]
//   }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PostalMime from "npm:postal-mime@2.2.7";

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { AttachmentError, MAX_REQUEST_BYTES, prepareAttachments, readBounded, storeAttachments, cleanupAttachments } from './attachments.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const INBOUND_TOKEN = Deno.env.get("INBOUND_EMAIL_TOKEN") || "";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractField(body: string, label: string): string | null {
  // Procura por linhas do tipo "Solicitante: fulano" (case-insensitive)
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

// Endereços internos que nunca devem ser considerados "solicitante"
// (caixa de manutenção e a própria caixa do SiDIF fazem apenas o repasse).
const INTERNAL_ADDRESSES = [
  "manutencao@dp.mt.gov.br",
  "chamados@sidif.com.br",
];

function isInternalAddress(email?: string | null): boolean {
  if (!email) return false;
  return INTERNAL_ADDRESSES.includes(email.toLowerCase().trim());
}

// Em e-mails encaminhados (Fwd/Enc), tenta extrair o remetente original
// do bloco "---------- Forwarded message ---------" / "De:" no corpo.
function extractOriginalSender(body: string): string | null {
  if (!body) return null;
  // Remove tags HTML (mantendo quebras) para achar "De:" também em corpo HTML.
  const text = body
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

  const re = /^\s*>*\s*(?:From|De|Remetente)\s*:\s*(.+)$/gim;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const email = extractEmail(m[1]);
    if (email) candidates.push(email.toLowerCase());
  }
  // Preferência: último remetente externo (encaminhamento mais interno).
  const external = candidates.filter((e) => !isInternalAddress(e));
  if (external.length > 0) return external[external.length - 1];
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}


// Extrai apenas o conteúdo real da mensagem, removendo cabeçalhos de
// encaminhamento (Forwarded message, De:, Para:, Data:, Assunto:) e
// citações. Se houver múltiplos níveis de forward, pega o mais interno.
function extractCleanBody(body: string): string {
  if (!body) return "";
  let text = body.replace(/\r\n/g, "\n");

  // Pega o bloco mais interno de forwards sucessivos
  const fwdRe = /-{2,}\s*Forwarded message\s*-{2,}|-{2,}\s*Mensagem encaminhada\s*-{2,}/gi;
  let lastIdx = -1;
  let m: RegExpExecArray | null;
  while ((m = fwdRe.exec(text)) !== null) lastIdx = m.index + m[0].length;
  if (lastIdx >= 0) text = text.slice(lastIdx);

  // Remove linhas de cabeçalho no topo (De:/From:, Para:/To:, Data:/Date:, Assunto:/Subject:, Cc:, Bcc:)
  const headerRe = /^\s*(De|From|Para|To|Data|Date|Assunto|Subject|Cc|Cco|Bcc|Remetente|Enviado em|Sent)\s*:.*$/i;
  const lines = text.split("\n");
  let i = 0;
  // pula linhas em branco iniciais
  while (i < lines.length && !lines[i].trim()) i++;
  // pula cabeçalhos consecutivos (permitindo continuações indentadas)
  while (i < lines.length) {
    if (headerRe.test(lines[i])) {
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i]) && !headerRe.test(lines[i])) i++;
    } else break;
  }
  let cleaned = lines.slice(i).join("\n");

  // Remove citações ">" no início das linhas
  cleaned = cleaned
    .split("\n")
    .map((l) => l.replace(/^\s*>+\s?/, ""))
    .join("\n");

  // Colapsa múltiplas linhas em branco e trims
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}




function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectPriority(subject: string, body: string): "Alta" | "Média" | "Baixa" {
  const txt = stripAccents(`${subject}\n${body}`).toLowerCase();
  const high = [
    "urgente", "urgencia", "emergencia", "emergencial", "critico", "critica",
    "imediato", "imediata", "prioridade alta", "alta prioridade", "asap",
    "parou de funcionar", "sem energia", "sem agua", "vazamento", "incendio",
    "curto circuito", "risco", "grave",
  ];
  const low = [
    "quando puder", "sem pressa", "baixa prioridade", "prioridade baixa",
    "nao urgente", "pode aguardar", "assim que possivel", "quando possivel",
  ];
  if (high.some((k) => txt.includes(k))) return "Alta";
  if (low.some((k) => txt.includes(k))) return "Baixa";
  return "Média";
}

// Remove NULs e surrogates soltos que o Postgres rejeita ("unsupported Unicode escape sequence")
function sanitizeText(s: string): string {
  if (!s) return "";
  return s
    .replace(/\u0000/g, "")
    .replace(/\\u0000/gi, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function addrList(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const it of arr) {
    const s = typeof it === "string" ? it : (it as any)?.address || (it as any)?.email || "";
    for (const m of String(s).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []) out.push(m.toLowerCase());
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // Segredo compartilhado: preferencialmente no header X-SIDIF-INBOUND-SECRET.
  // DEPRECATED: ?token= na querystring é aceito apenas por compatibilidade com o forwarder atual.
  const url = new URL(req.url);
  const provided = req.headers.get("x-sidif-inbound-secret") || url.searchParams.get("token") || "";
  if (!INBOUND_TOKEN || !safeEqual(provided, INBOUND_TOKEN)) {
    console.warn("inbound: segredo ausente/inválido");
    return json(401, { error: "unauthorized" });
  }
  // Destinatário de envelope informado pelo forwarder autenticado (prioritário).
  const envelopeTo = addrList(req.headers.get("x-sidif-envelope-to") || url.searchParams.get("rcpt") || "");

  let payload: any;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("message/rfc822") || contentType.includes("text/plain")) {
      // Modo bruto: e-mail MIME cru (enviado pelo Cloudflare Email Worker)
      const rawText = new TextDecoder().decode(await readBounded(req, MAX_REQUEST_BYTES));
      const parsed: any = await PostalMime.parse(rawText);
      payload = {
        from: parsed.from ? { address: parsed.from.address, name: parsed.from.name } : null,
        to: (parsed.to || []).map((t: any) => ({ address: t.address })),
        cc: (parsed.cc || []).map((t: any) => ({ address: t.address })),
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        headers: (() => {
          const h: Record<string, string> = { "message-id": parsed.messageId || "" };
          for (const it of parsed.headers || []) {
            const k = String(it.key || "").toLowerCase();
            if (["in-reply-to", "delivered-to", "x-original-to", "x-forwarded-to", "envelope-to"].includes(k)) {
              h[k] = h[k] ? `${h[k]}, ${it.value}` : String(it.value || "");
            }
          }
          return h;
        })(),
        attachments: (parsed.attachments || []).map((att: any) => ({
          filename: att.filename || "arquivo", content_type: att.mimeType,
          bytes: new Uint8Array(att.content), size: att.content.byteLength,
        })),


      };
    } else {
      payload = JSON.parse(new TextDecoder().decode(await readBounded(req, MAX_REQUEST_BYTES)));
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json(400, { error: "invalid_payload" });
    }
  } catch (e) {
    console.error("inbound: invalid_payload");
    if (e instanceof AttachmentError) return json(e.status, { error: e.category });
    return json(400, { error: "invalid_payload" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const subject: string = sanitizeText((payload.subject || "Chamado sem assunto").toString().trim());
    const textBody: string = sanitizeText((payload.text || payload.html || "").toString());
    const htmlBody: string | null = payload.html ? sanitizeText(String(payload.html)) : null;
    const fromAddr: string =
      payload.from?.address ||
      payload.from?.email ||
      (typeof payload.from === "string" ? extractEmail(payload.from) : null) ||
      "";
    const messageId: string | undefined =
      payload.headers?.["message-id"] || payload.headers?.["Message-Id"] || payload.message_id;

    // Sempre tenta usar o remetente original (primeiro e-mail do histórico),
    // mesmo quando o assunto não traz "Fwd:" (encaminhamento automático).
    let requesterEmail = fromAddr || "";
    const original =
      extractOriginalSender(textBody) ||
      extractOriginalSender((payload.html || "").toString());
    if (original) {
      requesterEmail = original;
    } else if (isInternalAddress(requesterEmail)) {
      // Encaminhamento sem cabeçalho legível: tenta qualquer e-mail externo no corpo.
      const anyExternal = (textBody.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [])
        .map((e) => e.toLowerCase())
        .find((e) => !isInternalAddress(e));
      if (anyExternal) requesterEmail = anyExternal;
    }

    // ===== Resolução do tenant (H3) =====
    // Somente pelo destinatário; organization_id do payload é ignorado; sem fallback para DPE.
    const recipients = envelopeTo.length
      ? envelopeTo
      : [
          ...addrList(payload.to),
          ...addrList(payload.cc),
          ...addrList(payload.headers?.["delivered-to"]),
          ...addrList(payload.headers?.["x-original-to"]),
          ...addrList(payload.headers?.["x-forwarded-to"]),
          ...addrList(payload.headers?.["envelope-to"]),
        ];
    const { data: res, error: resErr } = await supabase.rpc("maintenance_inbound_resolve", {
      p_recipients: [...new Set(recipients)],
      p_sender: (fromAddr || "").toLowerCase(),
    });
    if (resErr) {
      console.error("inbound: resolve_failed");
      return json(500, { error: "resolve_failed" });
    }
    const resolved = res as { ok: boolean; reason?: string; organization_id?: string };
    if (!resolved?.ok || !resolved.organization_id) {
      const reason = resolved?.reason || "rejected";
      console.warn("inbound: rejeitado", reason);
      const status = reason === "unknown_recipient" ? 404 : reason === "sender_not_allowed" ? 403 : 400;
      return json(status, { error: reason });
    }
    const orgId = resolved.organization_id;

    // Deduplicação por Message-Id (na tabela de thread, dentro do tenant)
    if (messageId) {
      const { data: dup } = await supabase
        .from("maintenance_ticket_emails")
        .select("id, ticket_id")
        .eq("organization_id", orgId)
        .eq("message_id", messageId)
        .limit(1)
        .maybeSingle();
      if (dup) {
        console.log("inbound: duplicated");
        return json(200, { ok: true, duplicated: true, ticket_id: dup.ticket_id });
      }
    }

    if (payload.attachments != null && !Array.isArray(payload.attachments)) return json(400, { error: "invalid_attachment" });
    const prepared = await prepareAttachments(payload.attachments || [], SUPABASE_URL);
    const storage = {
      upload: async (bucket: string, path: string, bytes: Uint8Array, mime: string) => {
        const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false });
        if (error) throw new AttachmentError("attachment_storage_failed", 503);
      },
      remove: async (bucket: string, paths: string[]) => {
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) throw new AttachmentError("attachment_cleanup_failed", 500);
      },
    };

    // Detecta thread: [SiDIF #NNNN] no subject ou In-Reply-To
    const inReplyTo: string | undefined =
      payload.headers?.["in-reply-to"] || payload.headers?.["In-Reply-To"];
    const threadMatch = subject.match(/\[SiDIF\s*#\s*(\d+)\]/i);
    if (threadMatch) {
      const ticketNumber = parseInt(threadMatch[1], 10);
      // Busca SOMENTE no tenant resolvido; nunca global.
      const { data: existing } = await supabase
        .from("maintenance_tickets")
        .select("id, ticket_number, status, confirmed_at")
        .eq("organization_id", orgId)
        .eq("ticket_number", ticketNumber)
        .maybeSingle();

      if (!existing) {
        console.warn("inbound: resposta para chamado inexistente neste tenant; ignorada");
        return json(404, { error: "ticket_not_found" });
      }

      const stored = await storeAttachments(prepared, orgId, existing.id, SUPABASE_URL, storage);
      const { error: emailError } = await supabase.from("maintenance_ticket_emails").insert({
        ticket_id: existing.id,
        attachments: stored,
        organization_id: orgId,
        direction: "inbound",
        from_addr: fromAddr || null,
        to_addrs: (payload.to || []).map((t: any) => t.address).filter(Boolean),
        subject,
        body_text: textBody.slice(0, 20000),
        body_html: htmlBody,
        message_id: messageId ?? null,
        in_reply_to: inReplyTo ?? null,
      });

      if (emailError) {
        await cleanupAttachments(stored, storage);
        return json(500, { error: "email_insert_failed" });
      }

      // reabre se estava concluído e ainda não foi confirmado
      if (existing.status === "Concluído" && !existing.confirmed_at) {
        await supabase
          .from("maintenance_tickets")
          .update({ status: "Em andamento" })
          .eq("id", existing.id)
          .eq("organization_id", orgId);
      }

      console.log(`inbound: resposta anexada ao chamado #${existing.ticket_number}`);
      return json(200, { ok: true, threaded: true, ticket_id: existing.id });
    }

    // Solicitante e localização (extraídos do corpo)
    const solicitante = extractField(textBody, "Solicitante") || requesterEmail || fromAddr || "Não informado";
    const local = extractField(textBody, "Local") || extractField(textBody, "Localização") || "A definir";
    const nucleoNome = extractField(textBody, "Núcleo") || extractField(textBody, "Nucleo");

    // Tentar vincular núcleo por nome mencionado no corpo (somente no tenant)
    let nucleo_id: string | null = null;
    if (nucleoNome) {
      const safeName = nucleoNome.replace(/[%_\\]/g, (c) => `\\${c}`);
      const { data: n } = await supabase
        .from("nuclei")
        .select("id")
        .eq("organization_id", orgId)
        .ilike("name", `%${safeName}%`)
        .limit(1)
        .maybeSingle();
      nucleo_id = n?.id ?? null;
    }

    // Fallback: mapear núcleo pelo e-mail do solicitante original (exato ou por domínio)
    const matchAddr = (requesterEmail || fromAddr || "").toLowerCase().trim();
    if (!nucleo_id && matchAddr) {
      const addr = matchAddr;
      const domain = addr.split("@")[1] || "";
      const { data: nuclei } = await supabase
        .from("nuclei")
        .select("id, email, contact_email")
        .eq("organization_id", orgId)
        .limit(10000);
      if (nuclei && nuclei.length) {
        // 1) match exato pelo e-mail
        const exact = nuclei.find((n: any) =>
          [n.email, n.contact_email]
            .filter(Boolean)
            .map((v: string) => v.toLowerCase().trim())
            .includes(addr),
        );
        if (exact) nucleo_id = exact.id;
        // 2) match por domínio (ignora domínios genéricos)
        if (!nucleo_id && domain && !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com"].includes(domain)) {
          const byDomain = nuclei.find((n: any) => {
            const emails = [n.email, n.contact_email].filter(Boolean).map((v: string) => v.toLowerCase().trim());
            return emails.some((e: string) => e.endsWith(`@${domain}`));
          });
          if (byDomain) nucleo_id = byDomain.id;
        }
      }
    }

    // Prioridade automática a partir de palavras-chave no assunto/corpo
    const priority = detectPriority(subject, textBody);


    const ticketId = crypto.randomUUID();
    const stored = await storeAttachments(prepared, orgId, ticketId, SUPABASE_URL, storage);
    // Cria ticket (rascunho na coluna Pendente)
    const { data: ticket, error: insErr } = await supabase
      .from("maintenance_tickets")
      .insert({
        id: ticketId,
        reference_photos: stored.filter(a => a.content_type.startsWith("image/")),
        organization_id: orgId, // explícito: nunca depender de default/trigger
        title: subject,
        priority,
        type: "Corretiva",
        location: local,
        assignee: solicitante,
        status: "Pendente",
        request_type: "email",
        requester_email: requesterEmail || null,
        nucleo_id,
        source: "email",
        is_draft: true,
        inbound_message_id: messageId ?? null,
        raw_email: {
          from: payload.from ?? null,
          to: payload.to ?? null,
          subject,
          text: textBody.slice(0, 20000),
          received_at: new Date().toISOString(),
        },
        observations: (() => {
          const clean = extractCleanBody(textBody);
          return clean ? [clean.slice(0, 2000)] : [];
        })(),

      })
      .select("id, ticket_number")
      .single();

    if (insErr || !ticket) {
      await cleanupAttachments(stored, storage);
      console.error("inbound: insert_failed");
      return json(500, { error: "insert_failed" });
    }

    // Grava o primeiro e-mail na thread
    const { error: emailError } = await supabase.from("maintenance_ticket_emails").insert({
      ticket_id: ticket.id,
      attachments: stored,
      organization_id: orgId,
      direction: "inbound",
      from_addr: fromAddr || null,
      to_addrs: (payload.to || []).map((t: any) => t.address).filter(Boolean),
      subject,
      body_text: textBody.slice(0, 20000),
      body_html: htmlBody,
      message_id: messageId ?? null,
      in_reply_to: inReplyTo ?? null,
    });


    if (emailError) {
      // The ticket already exists: report failure explicitly, do not claim success.
      console.error("inbound: email_insert_failed");
      return json(500, { error: "email_insert_failed", ticket_created: true });
    }
    const photos = stored.filter(a => a.content_type.startsWith("image/"));
    console.log("inbound: ticket_created");
    return json(200, {
      ok: true,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      photos: photos.length,
      attachments: stored.length,
    });
  } catch (e) {
    if (e instanceof AttachmentError) {
      console.warn("inbound:", e.category);
      return json(e.status, { error: e.category });
    }
    console.error("inbound: internal");
    return json(500, { error: "internal" });
  }
});
