import { createClient } from 'npm:@supabase/supabase-js@2'

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

    if (!reportId || !obraId) {
      return new Response(JSON.stringify({ error: 'reportId and obraId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Buscar todos os itens não-macro da planilha da obra
    const { data: orcamentoItems, error: orcErr } = await supabase
      .from('orcamento_items')
      .select('id, item, descricao, unidade, quantidade')
      .eq('obra_id', obraId)
      .neq('nivel', 1) // nivel 1 = grupos/macro

    if (orcErr) throw new Error(`orcamento query: ${orcErr.message}`)

    // Filtrar apenas itens folha (sem filhos) usando calculated_level da view seria ideal,
    // mas para evitar timeout, filtramos itens que têm código não vazio (não são grupos)
    const leafItems = (orcamentoItems || []).filter((item: any) => item.item && item.item.includes('.'))

    // Buscar atividades já existentes neste RDO
    const { data: existingActivities, error: actErr } = await supabase
      .from('rdo_activities')
      .select('orcamento_item_id')
      .eq('report_id', reportId)
      .eq('tipo', 'planilha')

    if (actErr) throw new Error(`activities query: ${actErr.message}`)

    const existingIds = new Set((existingActivities || []).map((a: any) => a.orcamento_item_id))

    // Filtrar itens que ainda não têm atividade
    const itemsToCreate = leafItems.filter((item: any) => !existingIds.has(item.id))

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

    if (insertErr) throw new Error(`insert error: ${insertErr.message}`)

    return new Response(JSON.stringify({ created: itemsToCreate.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('rdo-sync-activities error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
