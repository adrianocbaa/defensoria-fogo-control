import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reportId, obraId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Buscar todos os itens da planilha da obra
    const { data: orcamentoItems, error: orcErr } = await supabase
      .from('orcamento_items_hierarquia')
      .select('id, item, descricao, unidade, quantidade')
      .eq('obra_id', obraId)
      .eq('is_macro', false)

    if (orcErr) throw orcErr

    // Buscar atividades já existentes neste RDO
    const { data: existingActivities, error: actErr } = await supabase
      .from('rdo_activities')
      .select('orcamento_item_id')
      .eq('report_id', reportId)
      .eq('tipo', 'planilha')

    if (actErr) throw actErr

    const existingIds = new Set((existingActivities || []).map((a: any) => a.orcamento_item_id))

    // Filtrar itens que ainda não têm atividade
    const itemsToCreate = (orcamentoItems || []).filter((item: any) => !existingIds.has(item.id))

    if (itemsToCreate.length === 0) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Inserir em batch
    const { error: insertErr } = await supabase.from('rdo_activities').insert(
      itemsToCreate.map((item: any) => ({
        obra_id: obraId,
        report_id: reportId,
        tipo: 'planilha',
        orcamento_item_id: item.id,
        item_code: item.item,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade_total: item.quantidade,
        executado_dia: 0,
        progresso: 0,
        status: 'em_andamento',
      }))
    )

    if (insertErr) throw insertErr

    return new Response(JSON.stringify({ created: itemsToCreate.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
