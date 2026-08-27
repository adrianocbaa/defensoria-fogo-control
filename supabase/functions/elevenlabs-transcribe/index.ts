import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size < 1024) {
      return new Response(
        JSON.stringify({ error: "Áudio vazio ou muito curto. Grave novamente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const useElevenLabs = !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.startsWith("sk_");

    if (useElevenLabs) {
      const apiFormData = new FormData();
      apiFormData.append("file", audioFile);
      apiFormData.append("model_id", "scribe_v2");
      apiFormData.append("language_code", "por");

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY! },
        body: apiFormData,
      });

      if (response.ok) {
        const transcription = await response.json();
        return new Response(JSON.stringify({ text: transcription.text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("ElevenLabs error, caindo para Lovable AI:", response.status, await response.text());
    }

    // Fallback / padrão: Lovable AI Gateway (speech-to-text)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Transcrição indisponível: nenhuma chave de IA configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mime = (audioFile.type || "audio/webm").split(";")[0];
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/ogg": "ogg",
    };
    const ext = extMap[mime] ?? "webm";

    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("file", audioFile, `recording.${ext}`);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Lovable AI STT error:", aiResp.status, errText);
      const msg =
        aiResp.status === 429
          ? "Muitas requisições. Aguarde alguns segundos e tente novamente."
          : aiResp.status === 402
          ? "Créditos de IA esgotados. Adicione créditos no Lovable."
          : `Erro na transcrição (${aiResp.status}).`;
      return new Response(JSON.stringify({ error: msg }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno na transcrição" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
