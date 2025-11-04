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
    
    const prompt = `Você é uma IA integrada ao "Sistema DIF" da Defensoria Pública do Estado de Mato Grosso. Sua função é gerar o Relatório Técnico de Acompanhamento de Reforma Predial – Medição, seguindo EXATAMENTE o modelo padrão institucional.

**ESTRUTURA OBRIGATÓRIA DO RELATÓRIO** (siga fielmente):

# PÁGINA DE CAPA:
DIRETORIA DE INFRAESTRUTURA FÍSICA
DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO
RELATÓRIO TÉCNICO DE ACOMPANHAMENTO DE REFORMA PREDIAL
{NÚMERO}ª MEDIÇÃO
PERÍODO DE EXECUÇÃO DE {data_inicio} À {data_fim}
CONTRATO Nº {contrato}
{TÍTULO DA OBRA}
Relatório Técnico de Acompanhamento de Reforma Predial
{Endereço completo}
Contato: (65) 99952-1867 – Site: www.defensoriapublica.mt.gov.br E-mail: dif@dp.mt.gov.br

# 1. DO PERÍODO DA MEDIÇÃO:
O período da medição refere-se à execução de reforma predial entre os dias {data_inicio} ao dia {data_fim}.

# 2. DO OBJETO:
O objeto da medição é a reforma predial do imóvel ocupado pela {descrição do local} (contrato nº {contrato}), situado na {endereço completo}.

# 3. OBSERVAÇÕES INICIAIS:
Contratação de empresa especializada para prestação de serviços de reforma predial (serviços comuns de engenharia), os quais objetivam atender as necessidades da {local}.

TABELA COM BORDAS:
| Empresa Executora | {nome empresa} |
| Valor | R$ {valor_total} |
| Prazo | {prazo} dias |
| Data da medição | {data_medicao} |

# 4. DA MEDIÇÃO:
De acordo com o cronograma físico-financeiro, a medição prevista para o {ordinal} mês está apresentada na Tabela 2.

## PREVISÃO DO CRONOGRAMA FÍSICO-FINANCEIRO
Data início: {data_inicio}
Data Medição: {data_medicao}

TABELA COMPLETA com colunas: Item | Descrição | Valor parcial previsto | Valor acumulado previsto | Porcentagem Prevista | Valor acumulado previsto | Valor final previsto

## MEDIÇÃO ATUAL
Data início: {data_inicio}
Data Medição: {data_medicao}

TABELA COMPLETA com colunas: Item | Descrição | Valor parcial medido | Valor acumulado medido | Porcentagem Medida | Valor acumulado medido | Valor final medido

## ANÁLISE COMPARATIVA:
Parágrafo técnico comparando previsto vs medido, explicando desvios percentuais em pontos percentuais (p.p.)

# 5. DOS SERVIÇOS EXECUTADOS:
Descrição detalhada das frentes de trabalho executadas no período, com parágrafos técnicos descrevendo cada etapa.

# 6. CONCLUSÃO:
Parágrafo final com valor total medido no período e situação geral da obra.

# ANEXO 01 – RELATÓRIO FOTOGRÁFICO (se houver fotos)
Incluir fotos com legendas descritivas.

Cuiabá/MT, {data_emissao}
[Assinatura]
Nome do Responsável Técnico
Cargo/CREA

**FORMATAÇÃO HTML**:
- Use tabelas HTML com bordas (border='1' style='border-collapse: collapse; width: 100%')
- Números em formato brasileiro: R$ 1.234,56
- Percentuais com duas casas decimais
- Tom técnico e formal
- Cabeçalho e rodapé em cada página

**DADOS RECEBIDOS**:
${JSON.stringify(dados, null, 2)}

**IMPORTANTE**: Retorne SOMENTE via tool call emit_relatorio, mantendo EXATAMENTE a estrutura e sequência de tópicos acima.`;

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
