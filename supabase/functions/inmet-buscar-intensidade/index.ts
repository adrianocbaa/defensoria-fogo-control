// Edge function: estima a intensidade de projeto i_5min a partir de série
// histórica de precipitação diária da reanálise ERA5 (Open-Meteo Archive API).
// Geocodifica a cidade (Open-Meteo Geocoding), busca máximas anuais dos
// últimos N anos e aplica o fator de desagregação CETESB (24h -> 5min).
// IMPORTANTE: valor retornado é ESTIMATIVA auxiliar; para projeto definitivo,
// utilizar curva IDF local oficial.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// CETESB: razão P_5min / P_24h ≈ 0.070
// i (mm/h) = P_5min / (5/60) = P_5min * 12
const CETESB_5MIN_24H = 0.070;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const cidade = String(body.cidade ?? "").trim();
    const uf = String(body.uf ?? "").trim().toUpperCase();
    const anos = Math.max(3, Math.min(30, Number(body.anos ?? 10)));

    if (!cidade || uf.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Informe cidade e UF (2 letras)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Geocodificar a cidade (Open-Meteo Geocoding) e filtrar pelo UF
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&country=BR&count=10&language=pt`;
    const geoResp = await fetch(geoUrl);
    if (!geoResp.ok) {
      return new Response(
        JSON.stringify({ error: `Falha na geocodificação (${geoResp.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const geo = await geoResp.json();
    const candidatos: any[] = geo.results ?? [];
    if (!candidatos.length) {
      return new Response(
        JSON.stringify({ error: `Cidade "${cidade}" não encontrada` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // UF brasileiro -> nome do estado (Open-Meteo retorna admin1 como nome)
    const UF_NOME: Record<string, string> = {
      AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
      CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
      MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
      PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
      RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
      RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
      SE: "Sergipe", TO: "Tocantins",
    };
    const ufNome = UF_NOME[uf]?.toLowerCase();
    const norm = (s: string) =>
      s?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    const escolhida =
      candidatos.find((c) => norm(c.admin1) === norm(UF_NOME[uf] ?? "")) ??
      candidatos.find((c) => ufNome && norm(c.admin1)?.includes(norm(UF_NOME[uf]))) ??
      candidatos[0];

    // 2) Buscar precipitação diária histórica (ERA5) dos últimos N anos
    // ERA5 normalmente tem ~5 dias de defasagem; afastar 7 dias por segurança.
    const fim = new Date();
    fim.setDate(fim.getDate() - 7);
    const inicio = new Date(fim);
    inicio.setFullYear(fim.getFullYear() - anos);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const archUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${escolhida.latitude}&longitude=${escolhida.longitude}&start_date=${fmt(inicio)}&end_date=${fmt(fim)}&daily=precipitation_sum&timezone=America%2FSao_Paulo`;
    const archResp = await fetch(archUrl);
    if (!archResp.ok) {
      return new Response(
        JSON.stringify({
          error: `Falha ao buscar série histórica (${archResp.status})`,
          fonte: "Open-Meteo Archive (ERA5)",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const arch = await archResp.json();
    const times: string[] = arch?.daily?.time ?? [];
    const vals: (number | null)[] = arch?.daily?.precipitation_sum ?? [];

    // 3) Máxima anual de precipitação diária
    const porAno = new Map<number, number>();
    for (let i = 0; i < times.length; i++) {
      const v = vals[i];
      if (v == null || !isFinite(v) || v <= 0) continue;
      const ano = Number(times[i].slice(0, 4));
      if ((porAno.get(ano) ?? 0) < v) porAno.set(ano, v);
    }

    const maximas = [...porAno.values()].sort((a, b) => b - a);
    if (maximas.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Série histórica insuficiente (mínimo 3 anos com dados).",
          anos_com_dados: maximas.length,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Estimativa simples: percentil 80 das máximas anuais ≈ TR ~5 anos
    const idx = Math.max(0, Math.floor(maximas.length * 0.2));
    const p24h_estimada = +maximas[idx].toFixed(1);

    // Desagregação CETESB
    const p5min = p24h_estimada * CETESB_5MIN_24H;
    const intensidade_mm_h = +(p5min * 12).toFixed(1);

    return new Response(
      JSON.stringify({
        success: true,
        intensidade_mm_h,
        tempo_retorno_anos: 5,
        duracao_min: 5,
        metodo: "CETESB (24h→5min, fator 0,070) sobre máximas anuais",
        estacao: {
          codigo: "ERA5",
          nome: `${escolhida.name}${escolhida.admin1 ? " / " + escolhida.admin1 : ""}`,
          uf,
          latitude: Number(escolhida.latitude),
          longitude: Number(escolhida.longitude),
        },
        serie: {
          anos_analisados: maximas.length,
          p24h_max: +maximas[0].toFixed(1),
          p24h_referencia: p24h_estimada,
        },
        fonte_dados: "Open-Meteo Archive API (reanálise ERA5)",
        aviso:
          "Estimativa auxiliar baseada em reanálise ERA5 + desagregação CETESB. Para projeto definitivo, utilize curva IDF local oficial.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
