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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INBOUND_TOKEN = Deno.env.get("INBOUND_EMAIL_TOKEN")!;
const BUCKET = "documents";

type Attachment = {
  filename?: string;
  content_type?: string;
  content_url?: string;
  content?: string; // base64
  size?: number;
};

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

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "arquivo";
}

// Limite por imagem (bytes) e orçamento total de imagens por e-mail.
// Anexos que não sejam imagem são sempre descartados; imagens acima do limite
// (ou que estourem o orçamento) são ignoradas — a tarefa é criada mesmo assim.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif|tiff?)$/i;

function isImageAttachment(mime?: string, filename?: string): boolean {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  if (m && m !== "application/octet-stream") return false;
  return IMAGE_EXT_RE.test(filename || "");
}


function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // Verificação de token compartilhado (via querystring)
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!INBOUND_TOKEN || token !== INBOUND_TOKEN) {
    console.warn("inbound: token inválido");
    return json(401, { error: "unauthorized" });
  }

  let payload: any;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("message/rfc822") || contentType.includes("text/plain")) {
      // Modo bruto: e-mail MIME cru (enviado pelo Cloudflare Email Worker)
      const rawText = await req.text();
      const parsed: any = await PostalMime.parse(rawText);
      payload = {
        from: parsed.from ? { address: parsed.from.address, name: parsed.from.name } : null,
        to: (parsed.to || []).map((t: any) => ({ address: t.address })),
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        headers: { "message-id": parsed.messageId || "" },
        attachments: (() => {
          let used = 0;
          return (parsed.attachments || [])
            .map((att: any) => {
              const filename = att.filename || "arquivo";
              // Só imagens: PDFs, vídeos e demais anexos são descartados.
              if (!isImageAttachment(att.mimeType, filename)) {
                console.warn("inbound: anexo descartado (não é imagem)", filename, att.mimeType);
                return null;
              }
              const bytes = new Uint8Array(att.content);
              if (bytes.length > MAX_ATTACHMENT_BYTES) {
                console.warn("inbound: imagem ignorada por tamanho", filename, bytes.length);
                return null;
              }
              if (used + bytes.length > MAX_TOTAL_ATTACHMENT_BYTES) {
                console.warn("inbound: imagem ignorada por exceder o limite total", filename);
                return null;
              }
              used += bytes.length;
              let bin = "";
              const CHUNK = 0x8000;
              for (let i = 0; i < bytes.length; i += CHUNK) {
                bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
              }
              return {
                filename,
                content_type: att.mimeType?.startsWith("image/") ? att.mimeType : "image/jpeg",
                size: bytes.length,
                content: btoa(bin),
              };
            })
            .filter(Boolean);
        })(),


      };
    } else {
      payload = await req.json();
    }
  } catch (e) {
    console.error("inbound: falha no parse", e);
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



    // Deduplicação por Message-Id (na tabela de thread)
    if (messageId) {
      const { data: dup } = await supabase
        .from("maintenance_ticket_emails")
        .select("id, ticket_id")
        .eq("message_id", messageId)
        .maybeSingle();
      if (dup) {
        console.log("inbound: mensagem duplicada", messageId);
        return json(200, { ok: true, duplicated: true, ticket_id: dup.ticket_id });
      }
    }

    // Detecta thread: [SiDIF #NNNN] no subject ou In-Reply-To
    const inReplyTo: string | undefined =
      payload.headers?.["in-reply-to"] || payload.headers?.["In-Reply-To"];
    const threadMatch = subject.match(/\[SiDIF\s*#\s*(\d+)\]/i);
    if (threadMatch) {
      const ticketNumber = parseInt(threadMatch[1], 10);
      const { data: existing } = await supabase
        .from("maintenance_tickets")
        .select("id, ticket_number, status, confirmed_at")
        .eq("ticket_number", ticketNumber)
        .maybeSingle();

      if (existing) {
        await supabase.from("maintenance_ticket_emails").insert({
          ticket_id: existing.id,
          direction: "inbound",
          from_addr: fromAddr || null,
          to_addrs: (payload.to || []).map((t: any) => t.address).filter(Boolean),
          subject,
          body_text: textBody.slice(0, 20000),
          body_html: htmlBody,
          message_id: messageId ?? null,
          in_reply_to: inReplyTo ?? null,
        });

        // reabre se estava concluído e ainda não foi confirmado
        if (existing.status === "Concluído" && !existing.confirmed_at) {
          await supabase
            .from("maintenance_tickets")
            .update({ status: "Em andamento" })
            .eq("id", existing.id);
        }

        console.log(`inbound: resposta anexada ao chamado #${existing.ticket_number}`);
        return json(200, { ok: true, threaded: true, ticket_id: existing.id });
      }
    }

    // Solicitante e localização (extraídos do corpo)
    const solicitante = extractField(textBody, "Solicitante") || requesterEmail || fromAddr || "Não informado";
    const local = extractField(textBody, "Local") || extractField(textBody, "Localização") || "A definir";
    const nucleoNome = extractField(textBody, "Núcleo") || extractField(textBody, "Nucleo");

    // Tentar vincular núcleo por nome mencionado no corpo
    let nucleo_id: string | null = null;
    if (nucleoNome) {
      const { data: n } = await supabase
        .from("nuclei")
        .select("id")
        .ilike("name", `%${nucleoNome}%`)
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


    // Cria ticket (rascunho na coluna Pendente)
    const { data: ticket, error: insErr } = await supabase
      .from("maintenance_tickets")
      .insert({
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
      console.error("inbound: erro ao criar ticket", insErr);
      return json(500, { error: "insert_failed", details: insErr?.message });
    }

    // Grava o primeiro e-mail na thread
    await supabase.from("maintenance_ticket_emails").insert({
      ticket_id: ticket.id,
      direction: "inbound",
      from_addr: fromAddr || null,
      to_addrs: (payload.to || []).map((t: any) => t.address).filter(Boolean),
      subject,
      body_text: textBody.slice(0, 20000),
      body_html: htmlBody,
      message_id: messageId ?? null,
      in_reply_to: inReplyTo ?? null,
    });


    // Processa anexos
    const attachments: Attachment[] = Array.isArray(payload.attachments) ? payload.attachments : [];
    const photos: Array<any> = [];

    const nowIso = new Date().toISOString();
    const PHOTO_BUCKET = "service-photos";

    let usedBytes = 0;

    for (const att of attachments) {
      try {
        const rawName = att.filename || `anexo-${Date.now()}`;
        const filename = sanitizeFilename(rawName);
        const contentType = att.content_type || "application/octet-stream";

        // Só imagens são anexadas à tarefa (PDFs, vídeos e outros são ignorados)
        if (!isImageAttachment(contentType, rawName)) {
          console.warn("inbound: anexo descartado (não é imagem)", rawName, contentType);
          continue;
        }

        let bytes: Uint8Array | null = null;

        if (att.content_url) {
          const r = await fetch(att.content_url);
          if (!r.ok) {
            console.warn("inbound: falha download anexo", att.content_url, r.status);
            continue;
          }
          bytes = new Uint8Array(await r.arrayBuffer());
        } else if (att.content) {
          bytes = base64ToBytes(att.content);
        }

        if (!bytes) continue;

        if (bytes.length > MAX_ATTACHMENT_BYTES) {
          console.warn("inbound: imagem ignorada por tamanho", filename, bytes.length);
          continue;
        }
        if (usedBytes + bytes.length > MAX_TOTAL_ATTACHMENT_BYTES) {
          console.warn("inbound: imagem ignorada por exceder o limite total", filename);
          continue;
        }
        usedBytes += bytes.length;

        const uploadType = contentType.startsWith("image/") ? contentType : "image/jpeg";
        const path = `maintenance-inbound/${ticket.id}/${Date.now()}-${filename}`;
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, bytes, { contentType: uploadType, upsert: false });

        if (upErr) {
          console.warn("inbound: erro upload", upErr.message);
          continue;
        }

        const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        const publicUrl = pub?.publicUrl || path;

        photos.push({
          id: crypto.randomUUID(),
          url: publicUrl,
          path,
          description: filename,
          uploaded_at: nowIso,
          uploaded_by: null,
          uploaded_by_name: "E-mail (solicitante)",
        });
      } catch (e) {
        console.error("inbound: erro processando anexo", e);
      }
    }

    if (photos.length) {
      await supabase
        .from("maintenance_tickets")
        .update({ reference_photos: photos })
        .eq("id", ticket.id);
    }

    console.log(`inbound: ticket #${ticket.ticket_number} criado (${photos.length} fotos)`);
    return json(200, {
      ok: true,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      photos: photos.length,
    });
  } catch (e) {
    console.error("inbound: erro inesperado", e);
    return json(500, { error: "internal", details: e instanceof Error ? e.message : String(e) });
  }
});
