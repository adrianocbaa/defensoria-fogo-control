// SiDIF — Cloudflare Email Worker de referência (Lote H3.1)
// Repassa o e-mail MIME cru para a Edge Function inbound-maintenance-email.
//
// Configuração no Cloudflare (Workers & Pages → este Worker → Settings → Variables):
//   SIDIF_INBOUND_URL    = https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/inbound-maintenance-email
//   SIDIF_INBOUND_SECRET = (Secret, tipo "Encrypt") — mesmo valor de INBOUND_EMAIL_TOKEN do projeto
//
// Email Routing → Routes: chamados@sidif.com.br e (quando existir) *@manutencao.sidif.com.br
// devem ter ação "Send to a Worker" apontando para este Worker.
// Plus addressing (chamados+org-teste@) é entregue pela rota de chamados@ e o
// envelope-to (message.to) preserva o "+org-teste".
//
// NÃO usar ?token= na URL. NÃO logar o segredo.

export default {
  async email(message, env) {
    const raw = await new Response(message.raw).arrayBuffer();
    const res = await fetch(env.SIDIF_INBOUND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "message/rfc822",
        "X-SIDIF-INBOUND-SECRET": env.SIDIF_INBOUND_SECRET,
        "X-SIDIF-Envelope-To": message.to, // destinatário real do envelope SMTP
      },
      body: raw,
    });
    if (res.status === 401) {
      console.error("sidif inbound: segredo rejeitado (verifique SIDIF_INBOUND_SECRET)");
    } else if (res.status === 404 || res.status === 422) {
      message.setReject("Destinatario nao reconhecido pelo SiDIF");
    } else if (res.status === 403) {
      message.setReject("Remetente nao autorizado");
    } else if (!res.ok) {
      console.error("sidif inbound: falha", res.status);
      throw new Error(`inbound ${res.status}`); // Cloudflare devolve falha temporária
    }
  },
};
