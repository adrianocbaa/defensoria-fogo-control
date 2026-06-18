// Edge function: busca dados pluviométricos no INMET (BDMEP) e estima a
// intensidade de projeto i_5min via fator de desagregação CETESB (24h -> 5min).
// IMPORTANTE: o valor retornado é uma ESTIMATIVA auxiliar; para projeto
// definitivo deve-se usar curva IDF local da cidade.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface InmetEstacao {
  CD_ESTACAO: string;
  DC_NOME: string;
  SG_ESTADO: string;
  VL_LATITUDE: string;
  VL_LONGITUDE: string;
  DT_FIM_OPERACAO: string | null;
}

interface InmetDiario {
  DT_MEDICAO: string;
  CHUVA: string | null;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// CETESB: razão entre precipitação de 5 min e de 24 h ≈ 0.070
// Intensidade (mm/h) = P_5min / (5/60) = P_5min * 12
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
    const anos = Math.max(3, Math.min(15, Number(body.anos ?? 10)));

    if (!cidade || uf.length !== 2) {
      return new Response(
        JSON.stringify({ error: "Informe cidade e UF (2 letras)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Listar estações automáticas e filtrar por UF e nome
    const estListResp = await fetch("https://apitempo.inmet.gov.br/estacoes/T");
    if (!estListResp.ok) {
      return new Response(
        JSON.stringify({ error: `INMET indisponível (${estListResp.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const estacoes: InmetEstacao[] = await estListResp.json();
    const estadoEstacoes = estacoes.filter(
      (e) => e.SG_ESTADO === uf && !e.DT_FIM_OPERACAO,
    );

    if (!estadoEstacoes.length) {
      return new Response(
        JSON.stringify({ error: `Nenhuma estação ativa do INMET em ${uf}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const alvo = normalize(cidade);
    // Match exato > contém > primeira da UF
    const exata = estadoEstacoes.find((e) => normalize(e.DC_NOME) === alvo);
    const contem = estadoEstacoes.find((e) => normalize(e.DC_NOME).includes(alvo));
    const escolhida = exata ?? contem ?? estadoEstacoes[0];

    // 2) Buscar precipitação diária dos últimos N anos
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear() - anos, 0, 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const dadosResp = await fetch(
      `https://apitempo.inmet.gov.br/estacao/diaria/${fmt(inicio)}/${fmt(hoje)}/${escolhida.CD_ESTACAO}`,
    );
    if (!dadosResp.ok) {
      return new Response(
        JSON.stringify({
          error: `Falha ao buscar série histórica (${dadosResp.status})`,
          estacao: escolhida,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const dados: InmetDiario[] = await dadosResp.json();

    // 3) Máxima anual de precipitação diária
    const porAno = new Map<number, number>();
    for (const d of dados) {
      const chuva = d.CHUVA == null ? NaN : Number(d.CHUVA);
      if (!isFinite(chuva) || chuva <= 0) continue;
      const ano = Number(d.DT_MEDICAO.slice(0, 4));
      const atual = porAno.get(ano) ?? 0;
      if (chuva > atual) porAno.set(ano, chuva);
    }

    const maximas = [...porAno.values()].sort((a, b) => b - a);
    if (maximas.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Série histórica insuficiente nesta estação (mínimo 3 anos com dados).",
          estacao: escolhida,
          anos_com_dados: maximas.length,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Estimativa simples: percentil 80 das máximas anuais ≈ TR ~5 anos
    const idx = Math.max(0, Math.floor(maximas.length * 0.2));
    const p24h_estimada = maximas[idx];

    // Desagregação CETESB
    const p5min = p24h_estimada * CETESB_5MIN_24H;
    const intensidade_mm_h = +(p5min * 12).toFixed(1);

    return new Response(
      JSON.stringify({
        success: true,
        intensidade_mm_h,
        tempo_retorno_anos: 5,
        duracao_min: 5,
        metodo: "CETESB (24h→5min, fator 0,070)",
        estacao: {
          codigo: escolhida.CD_ESTACAO,
          nome: escolhida.DC_NOME,
          uf: escolhida.SG_ESTADO,
          latitude: Number(escolhida.VL_LATITUDE),
          longitude: Number(escolhida.VL_LONGITUDE),
        },
        serie: {
          anos_analisados: maximas.length,
          p24h_max: maximas[0],
          p24h_referencia: p24h_estimada,
        },
        aviso:
          "Estimativa auxiliar baseada em desagregação CETESB. Para projeto definitivo, utilize curva IDF local oficial.",
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
