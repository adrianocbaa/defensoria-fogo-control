import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { streamText } from "npm:ai";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { SISTEMA_PROMPT } from "./prompt.ts";

const MAX_HISTORICO = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return new Response(JSON.stringify({ error: "Corpo inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!text || text.length > 4000) {
    return new Response(JSON.stringify({ error: "Mensagem inválida ou muito longa" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Histórico da conversa (RLS garante que só o próprio usuário acessa)
  const { data: historico, error: histError } = await supabase
    .from("suporte_mensagens")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORICO);

  if (histError) {
    return new Response(JSON.stringify({ error: "Falha ao carregar histórico" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Persiste a mensagem do usuário
  const { error: insertUserError } = await supabase
    .from("suporte_mensagens")
    .insert({ user_id: user.id, role: "user", content: text });
  if (insertUserError) {
    console.error("Erro ao salvar mensagem do usuário:", insertUserError);
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "Configuração de IA ausente" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const gateway = createLovableAiGatewayProvider(lovableApiKey);

  // Consulta unificada enviada ao modelo: histórico + pergunta atual
  const historicoTexto = (historico ?? [])
    .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
    .join("\n\n");

  const pergunta = historicoTexto
    ? `Histórico da conversa até agora:\n\n${historicoTexto}\n\nNova pergunta do usuário: ${text}`
    : text;

  const result = streamText({
    model: gateway("google/gemini-3.1-flash-lite"),
    system: SISTEMA_PROMPT,
    prompt: pergunta,
    onFinish: async ({ text: resposta }) => {
      if (resposta?.trim()) {
        const { error: insertAssistError } = await supabase
          .from("suporte_mensagens")
          .insert({ user_id: user.id, role: "assistant", content: resposta });
        if (insertAssistError) {
          console.error("Erro ao salvar resposta do assistente:", insertAssistError);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse({ headers: corsHeaders });
});
