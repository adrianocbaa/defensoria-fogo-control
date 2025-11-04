import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { dados } = await req.json();
    
    const prompt = `Você é uma IA integrada ao "Sistema DIF" da Defensoria Pública do Estado de Mato Grosso. Sua função é gerar o Relatório Técnico de Acompanhamento de Reforma Predial – Medição (Relatório de Medição), seguindo o padrão institucional.

**IMPORTANTE**: Retorne APENAS um objeto JSON válido, sem markdown, sem \`\`\`json, sem explicações adicionais. O JSON deve seguir exatamente esta estrutura:

{
  "render_html": "<HTML com o relatório completo>",
  "plaintext": "Texto do relatório sem HTML",
  "resumo_json": {
    "obra_id": "string",
    "contrato_numero": "string",
    "periodo_inicio": "YYYY-MM-DD",
    "periodo_fim": "YYYY-MM-DD",
    "data_vistoria": "YYYY-MM-DD",
    "data_emissao": "YYYY-MM-DD",
    "empresa_executora": "string",
    "valor_total_obra": 0,
    "valor_medido_periodo": 0,
    "perc_previsto_acumulado": 0.00,
    "perc_medido_acumulado": 0.00,
    "desvio_pp": 0.00,
    "recomendacoes": "string opcional",
    "qtd_fotos": 0
  }
}

**ESTRUTURA DO RELATÓRIO**:

1. **RELATÓRIO TÉCNICO DE ACOMPANHAMENTO DE REFORMA PREDIAL – MEDIÇÃO Nº {numero_medicao}**
2. **DO PERÍODO DA MEDIÇÃO** - cite datas de inicio/fim
3. **DO OBJETO** - obra, contrato, endereço
4. **OBSERVAÇÕES INICIAIS** - quadro com Objeto, Empresa, Valor, Prazo, Data
5. **DA MEDIÇÃO** - duas tabelas (Previsão e Medição Atual) + análise textual
6. **DOS SERVIÇOS EXECUTADOS** - síntese das principais frentes
7. **CONCLUSÃO** - valor devido e status
8. **ANEXO 01 – RELATÓRIO FOTOGRÁFICO** (se houver fotos)
9. **Local/Data/Assinatura**

**FORMATAÇÃO**:
- Números em formato brasileiro: R$ 1.234,56
- Percentuais com duas casas decimais
- Tom técnico e formal
- Tabelas HTML com bordas e alinhamento adequado
- Desvios em pontos percentuais (ex.: "–11,53 p.p.")

**DADOS RECEBIDOS**:
${JSON.stringify(dados, null, 2)}

**IMPORTANTE**: Retorne SOMENTE o objeto JSON, sem nenhum texto adicional antes ou depois.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente técnico especializado em gerar relatórios de medição de obras públicas. Sempre retorne JSON válido, sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'emit_relatorio',
              description: 'Emite o relatório final no formato exigido pelo Sistema DIF',
              parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  render_html: { type: 'string' },
                  plaintext: { type: 'string' },
                  resumo_json: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      obra_id: { type: 'string' },
                      contrato_numero: { type: 'string' },
                      periodo_inicio: { type: 'string' },
                      periodo_fim: { type: 'string' },
                      data_vistoria: { type: 'string' },
                      data_emissao: { type: 'string' },
                      empresa_executora: { type: 'string' },
                      valor_total_obra: { type: 'number' },
                      valor_medido_periodo: { type: 'number' },
                      perc_previsto_acumulado: { type: 'number' },
                      perc_medido_acumulado: { type: 'number' },
                      desvio_pp: { type: 'number' },
                      recomendacoes: { type: 'string' },
                      qtd_fotos: { type: 'integer' }
                    },
                    required: [
                      'obra_id','contrato_numero','periodo_inicio','periodo_fim','data_vistoria','data_emissao','empresa_executora','valor_total_obra','valor_medido_periodo','perc_previsto_acumulado','perc_medido_acumulado','desvio_pp','qtd_fotos'
                    ]
                  }
                },
                required: ['render_html','plaintext','resumo_json']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'emit_relatorio' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de Lovable AI insuficientes (402).' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const txt = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, txt);
      throw new Error(`AI Gateway error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    let resultado: any;
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const argsRaw = toolCalls[0]?.function?.arguments ?? '{}';
      resultado = JSON.parse(argsRaw);
    } else {
      let content = choice?.message?.content ?? '';

      // Limpar markdown se presente
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Limpar caracteres de controle que podem quebrar o JSON
      content = content.replace(/[\x00-\x1F\x7F]/g, '');

      // Tentar extrair apenas o JSON válido
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('Nenhum JSON válido encontrado na resposta da IA');
      }

      const jsonContent = content.substring(jsonStart, jsonEnd);
      resultado = JSON.parse(jsonContent);
    }


    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
