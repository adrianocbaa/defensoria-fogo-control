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

    // Buscar itens folha da obra excluindo ADMINISTRAÇÃO (evita trigger vw_planilha_hierarquia)
    // Itens folha = têm ponto no número (ex: "1.1", "2.3") e eh_administracao_local = false
    const { data: orcamentoItems, error: orcErr } = await supabase
      .from('orcamento_items')
      .select('id, item, descricao, unidade, quantidade')
      .eq('obra_id', obraId)
      .eq('eh_administracao_local', false)
      .limit(5000)

    if (orcErr) throw new Error(`orcamento query: ${orcErr.message}`)

    // Filtrar apenas itens folha (contêm ponto no número = não são grupos)
    const leafItems = (orcamentoItems || []).filter((item: any) =>
      item.item && item.item.includes('.')
    )

    // Buscar atividades já existentes neste RDO
    const { data: existingActivities, error: actErr } = await supabase
      .from('rdo_activities')
      .select('orcamento_item_id')
      .eq('report_id', reportId)
      .eq('tipo', 'planilha')
      .limit(5000)

    if (actErr) throw new Error(`activities query: ${actErr.message}`)

    const existingIds = new Set((existingActivities || []).map((a: any) => a.orcamento_item_id))

    // Filtrar itens que ainda não têm atividade
    const itemsToCreate = leafItems.filter((item: any) => !existingIds.has(item.id))

    if (itemsToCreate.length === 0) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Inserir em batches de 20 para evitar timeout do trigger rdo_block_excesso_quantidade
    // O trigger só dispara quando executado_dia > 0, mas inserimos com 0, então deve ser rápido
    const BATCH_SIZE = 50
    let totalCreated = 0

    for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
      const batch = itemsToCreate.slice(i, i + BATCH_SIZE)
      const { error: insertErr } = await supabase.from('rdo_activities').insert(
        batch.map((item: any) => ({
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
      if (insertErr) throw new Error(`insert batch ${i}: ${insertErr.message}`)
      totalCreated += batch.length
    }

    return new Response(JSON.stringify({ created: totalCreated }), {
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
