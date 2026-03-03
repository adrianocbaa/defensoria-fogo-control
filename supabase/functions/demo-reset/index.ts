import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All demo fixed UUIDs (prefix de00000...)
const DEMO_EMPRESA_ID = 'de000001-de00-4000-8000-de0000000001';
const DEMO_OBRA_ID    = 'de000002-de00-4000-8000-de0000000002';
const DEMO_ORCAMENTO_ITEMS_OBRA_ID = DEMO_OBRA_ID;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow cron (no auth) or admin calls
  const authHeader = req.headers.get('Authorization');
  const isCronCall = !authHeader || authHeader === `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // If called with Bearer token, verify admin
  if (!isCronCall) {
    const token = authHeader!.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403
      });
    }
  }

  console.log('[demo-reset] Starting demo data reset...');

  try {
    // ── 1. Delete all demo-related data (cascade order) ──────────────────────
    // RDO activities, reports
    await supabaseAdmin.from('rdo_activities').delete().eq('obra_id', DEMO_OBRA_ID);
    await supabaseAdmin.from('rdo_reports').delete().eq('obra_id', DEMO_OBRA_ID);

    // Medicao items & sessions
    const { data: medSessions } = await supabaseAdmin
      .from('medicao_sessions').select('id').eq('obra_id', DEMO_OBRA_ID);
    if (medSessions && medSessions.length > 0) {
      const ids = medSessions.map((s: any) => s.id);
      await supabaseAdmin.from('medicao_items').delete().in('medicao_id', ids);
      await supabaseAdmin.from('medicao_rdo_imports').delete().in('medicao_id', ids);
    }
    await supabaseAdmin.from('medicao_sessions').delete().eq('obra_id', DEMO_OBRA_ID);

    // Aditivo items & sessions
    const { data: adSessions } = await supabaseAdmin
      .from('aditivo_sessions').select('id').eq('obra_id', DEMO_OBRA_ID);
    if (adSessions && adSessions.length > 0) {
      const ids = adSessions.map((s: any) => s.id);
      await supabaseAdmin.from('aditivo_items').delete().in('aditivo_id', ids);
    }
    await supabaseAdmin.from('aditivo_sessions').delete().eq('obra_id', DEMO_OBRA_ID);

    // Orcamento items
    await supabaseAdmin.from('orcamento_items').delete().eq('obra_id', DEMO_OBRA_ID);

    // Cronograma
    const { data: cronSessions } = await supabaseAdmin
      .from('cronograma_financeiro').select('id').eq('obra_id', DEMO_OBRA_ID);
    if (cronSessions && cronSessions.length > 0) {
      const ids = cronSessions.map((s: any) => s.id);
      const { data: cronItems } = await supabaseAdmin
        .from('cronograma_items').select('id').in('cronograma_id', ids);
      if (cronItems && cronItems.length > 0) {
        const itemIds = cronItems.map((i: any) => i.id);
        await supabaseAdmin.from('cronograma_periodos').delete().in('item_id', itemIds);
      }
      await supabaseAdmin.from('cronograma_items').delete().in('cronograma_id', ids);
    }
    await supabaseAdmin.from('cronograma_financeiro').delete().eq('obra_id', DEMO_OBRA_ID);

    // Obra action logs & checklist
    await supabaseAdmin.from('obra_action_logs').delete().eq('obra_id', DEMO_OBRA_ID);
    await supabaseAdmin.from('obra_checklist_items').delete().eq('obra_id', DEMO_OBRA_ID);

    // Obra itself
    await supabaseAdmin.from('obras').delete().eq('id', DEMO_OBRA_ID);

    // Empresa
    await supabaseAdmin.from('empresas').delete().eq('id', DEMO_EMPRESA_ID);

    console.log('[demo-reset] Old demo data deleted.');

    // ── 2. Re-create empresa ──────────────────────────────────────────────────
    await supabaseAdmin.from('empresas').insert({
      id: DEMO_EMPRESA_ID,
      razao_social: 'Construtora Demo Ltda',
      nome_fantasia: 'Demo Construtora',
      cnpj: '00.000.000/0001-00',
      cidade: 'Cuiabá',
      uf: 'MT',
      is_active: true,
    });

    // ── 3. Re-create obra ─────────────────────────────────────────────────────
    await supabaseAdmin.from('obras').insert({
      id: DEMO_OBRA_ID,
      nome: 'Construção UPA - Demo',
      municipio: 'Cuiabá',
      tipo: 'construção',
      status: 'em_andamento',
      valor_total: 1250000.00,
      data_inicio: '2024-01-15',
      previsao_termino: '2025-01-15',
      empresa_id: DEMO_EMPRESA_ID,
      empresa_responsavel: 'Construtora Demo Ltda',
      rdo_habilitado: true,
      is_demo: true,
      is_public: true,
      porcentagem_execucao: 42.5,
      regiao: 'Capital',
      n_contrato: '001/2024',
    });

    // ── 4. Re-create orcamento_items (condensed - 10 groups, 46 items) ────────
    const orcItems = [
      // Group 1 - Serviços Preliminares
      { id:'de000003-de00-4000-8000-de0000000001', obra_id:DEMO_OBRA_ID, item:'1', nivel:1, codigo:'00.000', descricao:'SERVIÇOS PRELIMINARES', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000002', obra_id:DEMO_OBRA_ID, item:'1.1', nivel:2, codigo:'72887', descricao:'Limpeza manual do terreno', unidade:'m²', quantidade:320, valor_unitario:4.82, valor_total:1542.40, total_contrato:1542.40, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000003', obra_id:DEMO_OBRA_ID, item:'1.2', nivel:2, codigo:'73951', descricao:'Locação da obra', unidade:'m²', quantidade:320, valor_unitario:3.50, valor_total:1120.00, total_contrato:1120.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 2 - Fundações
      { id:'de000003-de00-4000-8000-de0000000004', obra_id:DEMO_OBRA_ID, item:'2', nivel:1, codigo:'00.001', descricao:'FUNDAÇÕES', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000005', obra_id:DEMO_OBRA_ID, item:'2.1', nivel:2, codigo:'74209/1', descricao:'Escavação manual de valas', unidade:'m³', quantidade:180, valor_unitario:52.80, valor_total:9504.00, total_contrato:9504.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000006', obra_id:DEMO_OBRA_ID, item:'2.2', nivel:2, codigo:'74136/2', descricao:'Concreto magro para lastro, fck=15MPa', unidade:'m³', quantidade:12, valor_unitario:380.50, valor_total:4566.00, total_contrato:4566.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000007', obra_id:DEMO_OBRA_ID, item:'2.3', nivel:2, codigo:'83332', descricao:'Sapata em concreto armado fck=25MPa', unidade:'m³', quantidade:45, valor_unitario:1250.00, valor_total:56250.00, total_contrato:56250.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 3 - Estrutura
      { id:'de000003-de00-4000-8000-de0000000008', obra_id:DEMO_OBRA_ID, item:'3', nivel:1, codigo:'00.002', descricao:'ESTRUTURA', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000009', obra_id:DEMO_OBRA_ID, item:'3.1', nivel:2, codigo:'83332', descricao:'Pilar em concreto armado fck=25MPa', unidade:'m³', quantidade:68, valor_unitario:1450.00, valor_total:98600.00, total_contrato:98600.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000010', obra_id:DEMO_OBRA_ID, item:'3.2', nivel:2, codigo:'83332', descricao:'Viga em concreto armado fck=25MPa', unidade:'m³', quantidade:52, valor_unitario:1380.00, valor_total:71760.00, total_contrato:71760.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000011', obra_id:DEMO_OBRA_ID, item:'3.3', nivel:2, codigo:'83334', descricao:'Laje em concreto armado fck=25MPa', unidade:'m²', quantidade:320, valor_unitario:185.00, valor_total:59200.00, total_contrato:59200.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 4 - Alvenaria
      { id:'de000003-de00-4000-8000-de0000000012', obra_id:DEMO_OBRA_ID, item:'4', nivel:1, codigo:'00.003', descricao:'ALVENARIA', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000013', obra_id:DEMO_OBRA_ID, item:'4.1', nivel:2, codigo:'87519', descricao:'Alvenaria de blocos cerâmicos 9x19x19cm', unidade:'m²', quantidade:580, valor_unitario:72.50, valor_total:42050.00, total_contrato:42050.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000014', obra_id:DEMO_OBRA_ID, item:'4.2', nivel:2, codigo:'87430', descricao:'Cinta de amarração em concreto armado', unidade:'m', quantidade:420, valor_unitario:45.00, valor_total:18900.00, total_contrato:18900.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 5 - Cobertura
      { id:'de000003-de00-4000-8000-de0000000015', obra_id:DEMO_OBRA_ID, item:'5', nivel:1, codigo:'00.004', descricao:'COBERTURA', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000016', obra_id:DEMO_OBRA_ID, item:'5.1', nivel:2, codigo:'91603', descricao:'Estrutura metálica para cobertura', unidade:'kg', quantidade:8500, valor_unitario:18.50, valor_total:157250.00, total_contrato:157250.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000017', obra_id:DEMO_OBRA_ID, item:'5.2', nivel:2, codigo:'88484', descricao:'Telha metálica trapezoidal', unidade:'m²', quantidade:380, valor_unitario:95.00, valor_total:36100.00, total_contrato:36100.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 6 - Revestimentos
      { id:'de000003-de00-4000-8000-de0000000018', obra_id:DEMO_OBRA_ID, item:'6', nivel:1, codigo:'00.005', descricao:'REVESTIMENTOS', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000019', obra_id:DEMO_OBRA_ID, item:'6.1', nivel:2, codigo:'87251', descricao:'Chapisco externo com argamassa de cimento', unidade:'m²', quantidade:620, valor_unitario:8.50, valor_total:5270.00, total_contrato:5270.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000020', obra_id:DEMO_OBRA_ID, item:'6.2', nivel:2, codigo:'87295', descricao:'Reboco com argamassa de cimento e areia', unidade:'m²', quantidade:620, valor_unitario:24.50, valor_total:15190.00, total_contrato:15190.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000021', obra_id:DEMO_OBRA_ID, item:'6.3', nivel:2, codigo:'87879', descricao:'Revestimento cerâmico para parede interna', unidade:'m²', quantidade:480, valor_unitario:72.00, valor_total:34560.00, total_contrato:34560.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 7 - Pisos
      { id:'de000003-de00-4000-8000-de0000000022', obra_id:DEMO_OBRA_ID, item:'7', nivel:1, codigo:'00.006', descricao:'PISOS E CONTRAPISO', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000023', obra_id:DEMO_OBRA_ID, item:'7.1', nivel:2, codigo:'96543', descricao:'Contrapiso de concreto e=6cm', unidade:'m²', quantidade:320, valor_unitario:45.00, valor_total:14400.00, total_contrato:14400.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000024', obra_id:DEMO_OBRA_ID, item:'7.2', nivel:2, codigo:'87887', descricao:'Revestimento em porcelanato 60x60cm', unidade:'m²', quantidade:300, valor_unitario:145.00, valor_total:43500.00, total_contrato:43500.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 8 - Esquadrias
      { id:'de000003-de00-4000-8000-de0000000025', obra_id:DEMO_OBRA_ID, item:'8', nivel:1, codigo:'00.007', descricao:'ESQUADRIAS', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000026', obra_id:DEMO_OBRA_ID, item:'8.1', nivel:2, codigo:'74114/2', descricao:'Porta de aço galvanizado 0,90x2,10m', unidade:'un', quantidade:24, valor_unitario:850.00, valor_total:20400.00, total_contrato:20400.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000027', obra_id:DEMO_OBRA_ID, item:'8.2', nivel:2, codigo:'74094/2', descricao:'Janela de alumínio 1,20x1,20m', unidade:'un', quantidade:32, valor_unitario:650.00, valor_total:20800.00, total_contrato:20800.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 9 - Instalações
      { id:'de000003-de00-4000-8000-de0000000028', obra_id:DEMO_OBRA_ID, item:'9', nivel:1, codigo:'00.008', descricao:'INSTALAÇÕES HIDRÁULICAS', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000029', obra_id:DEMO_OBRA_ID, item:'9.1', nivel:2, codigo:'89694', descricao:'Tubulação PVC soldável para água fria', unidade:'m', quantidade:280, valor_unitario:32.50, valor_total:9100.00, total_contrato:9100.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000030', obra_id:DEMO_OBRA_ID, item:'9.2', nivel:2, codigo:'89832', descricao:'Tubulação PVC esgoto 100mm', unidade:'m', quantidade:180, valor_unitario:28.00, valor_total:5040.00, total_contrato:5040.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      // Group 10 - Elétrica
      { id:'de000003-de00-4000-8000-de0000000031', obra_id:DEMO_OBRA_ID, item:'10', nivel:1, codigo:'00.009', descricao:'INSTALAÇÕES ELÉTRICAS', unidade:'vb', quantidade:1, valor_unitario:0, valor_total:0, total_contrato:0, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000032', obra_id:DEMO_OBRA_ID, item:'10.1', nivel:2, codigo:'91922', descricao:'Eletroduto corrugado PVC flexível 25mm', unidade:'m', quantidade:650, valor_unitario:12.50, valor_total:8125.00, total_contrato:8125.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
      { id:'de000003-de00-4000-8000-de0000000033', obra_id:DEMO_OBRA_ID, item:'10.2', nivel:2, codigo:'91930', descricao:'Cabo elétrico 2,5mm² flexível', unidade:'m', quantidade:1800, valor_unitario:4.80, valor_total:8640.00, total_contrato:8640.00, banco:'SINAPI', origem:'contratual', eh_administracao_local:false },
    ];

    await supabaseAdmin.from('orcamento_items').insert(orcItems);

    // ── 5. Re-create 30 RDO reports (Aug 5 – Sep 13, 2024) ───────────────────
    const weatherOptions = ['claro', 'nublado', 'chuvoso'];
    const condOptions = ['praticavel', 'impraticavel'];
    const rdoReports = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date('2024-08-05');
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const seq = i + 1;
      const padded = String(seq).padStart(2, '0');
      const id = `de000002-de00-4001-8000-de00000000${padded}`;
      const chuva = i % 5 === 0;
      rdoReports.push({
        id,
        obra_id: DEMO_OBRA_ID,
        data: dateStr,
        sequencia: seq,
        status: 'aprovado',
        clima_manha: chuva ? 'chuvoso' : (i % 3 === 0 ? 'nublado' : 'claro'),
        clima_tarde: chuva ? 'nublado' : 'claro',
        cond_manha: chuva ? 'impraticavel' : 'praticavel',
        cond_tarde: 'praticavel',
        anotacoes: seq === 1 ? 'Início dos serviços preliminares. Equipe mobilizada.' : (seq === 10 ? 'Conclusão das fundações. Início da estrutura.' : (seq === 20 ? 'Início da alvenaria.' : null)),
      });
    }

    await supabaseAdmin.from('rdo_reports').insert(rdoReports);

    // ── 6. Re-create rdo_activities ───────────────────────────────────────────
    const activities = [
      // Serviços preliminares (RDOs 1-3)
      { id:'de000002-de00-4002-8000-de0000000001', report_id:'de000002-de00-4001-8000-de000000000' + '01', obra_id:DEMO_OBRA_ID, descricao:'Limpeza manual do terreno', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000002', executado_dia:120, qtd:120, unidade:'m²' },
      { id:'de000002-de00-4002-8000-de0000000002', report_id:'de000002-de00-4001-8000-de000000000' + '02', obra_id:DEMO_OBRA_ID, descricao:'Limpeza manual do terreno', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000002', executado_dia:120, qtd:120, unidade:'m²' },
      { id:'de000002-de00-4002-8000-de0000000003', report_id:'de000002-de00-4001-8000-de000000000' + '02', obra_id:DEMO_OBRA_ID, descricao:'Locação da obra', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000003', executado_dia:320, qtd:320, unidade:'m²' },
      // Fundações (RDOs 4-10)
      { id:'de000002-de00-4002-8000-de0000000004', report_id:'de000002-de00-4001-8000-de000000000' + '04', obra_id:DEMO_OBRA_ID, descricao:'Escavação manual de valas', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000005', executado_dia:60, qtd:60, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000005', report_id:'de000002-de00-4001-8000-de000000000' + '05', obra_id:DEMO_OBRA_ID, descricao:'Escavação manual de valas', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000005', executado_dia:60, qtd:60, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000006', report_id:'de000002-de00-4001-8000-de000000000' + '06', obra_id:DEMO_OBRA_ID, descricao:'Escavação manual de valas', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000005', executado_dia:60, qtd:60, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000007', report_id:'de000002-de00-4001-8000-de000000000' + '07', obra_id:DEMO_OBRA_ID, descricao:'Concreto magro para lastro', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000006', executado_dia:6, qtd:6, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000008', report_id:'de000002-de00-4001-8000-de000000000' + '08', obra_id:DEMO_OBRA_ID, descricao:'Concreto magro para lastro', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000006', executado_dia:6, qtd:6, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000009', report_id:'de000002-de00-4001-8000-de000000000' + '09', obra_id:DEMO_OBRA_ID, descricao:'Sapata em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000007', executado_dia:22, qtd:22, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000010', report_id:'de000002-de00-4001-8000-de000000000' + '10', obra_id:DEMO_OBRA_ID, descricao:'Sapata em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000007', executado_dia:23, qtd:23, unidade:'m³' },
      // Estrutura (RDOs 11-18)
      { id:'de000002-de00-4002-8000-de0000000011', report_id:'de000002-de00-4001-8000-de000000000' + '11', obra_id:DEMO_OBRA_ID, descricao:'Pilar em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000009', executado_dia:20, qtd:20, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000012', report_id:'de000002-de00-4001-8000-de000000000' + '12', obra_id:DEMO_OBRA_ID, descricao:'Pilar em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000009', executado_dia:20, qtd:20, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000013', report_id:'de000002-de00-4001-8000-de000000000' + '13', obra_id:DEMO_OBRA_ID, descricao:'Pilar em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000009', executado_dia:20, qtd:20, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000014', report_id:'de000002-de00-4001-8000-de000000000' + '13', obra_id:DEMO_OBRA_ID, descricao:'Viga em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000010', executado_dia:26, qtd:26, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000015', report_id:'de000002-de00-4001-8000-de000000000' + '14', obra_id:DEMO_OBRA_ID, descricao:'Viga em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000010', executado_dia:26, qtd:26, unidade:'m³' },
      { id:'de000002-de00-4002-8000-de0000000016', report_id:'de000002-de00-4001-8000-de000000000' + '15', obra_id:DEMO_OBRA_ID, descricao:'Laje em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000011', executado_dia:160, qtd:160, unidade:'m²' },
      { id:'de000002-de00-4002-8000-de0000000017', report_id:'de000002-de00-4001-8000-de000000000' + '16', obra_id:DEMO_OBRA_ID, descricao:'Laje em concreto armado', tipo:'planilha', orcamento_item_id:'de000003-de00-4000-8000-de0000000011', executado_dia:160, qtd:160, unidade:'m²' },
    ];

    await supabaseAdmin.from('rdo_activities').insert(activities);

    // ── 7. Re-create medicao_sessions ─────────────────────────────────────────
    const MED1_ID = 'de000004-de00-4000-8000-de0000000001';
    const MED2_ID = 'de000004-de00-4000-8000-de0000000002';

    await supabaseAdmin.from('medicao_sessions').insert([
      { id: MED1_ID, obra_id: DEMO_OBRA_ID, sequencia: 1, status: 'bloqueada' },
      { id: MED2_ID, obra_id: DEMO_OBRA_ID, sequencia: 2, status: 'aberta' },
    ]);

    // Medicao 1 items (groups 1-3, 100% executed)
    await supabaseAdmin.from('medicao_items').insert([
      { id:'de000005-de00-4000-8000-de000000000' + '01', medicao_id:MED1_ID, item_code:'1.1', qtd:320, pct:100, total:1542.40 },
      { id:'de000005-de00-4000-8000-de000000000' + '02', medicao_id:MED1_ID, item_code:'1.2', qtd:320, pct:100, total:1120.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '03', medicao_id:MED1_ID, item_code:'2.1', qtd:180, pct:100, total:9504.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '04', medicao_id:MED1_ID, item_code:'2.2', qtd:12,  pct:100, total:4566.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '05', medicao_id:MED1_ID, item_code:'2.3', qtd:45,  pct:100, total:56250.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '06', medicao_id:MED1_ID, item_code:'3.1', qtd:68,  pct:100, total:98600.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '07', medicao_id:MED1_ID, item_code:'3.2', qtd:52,  pct:100, total:71760.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '08', medicao_id:MED1_ID, item_code:'3.3', qtd:320, pct:100, total:59200.00 },
    ]);

    // Medicao 2 items (groups 4-6, partial)
    await supabaseAdmin.from('medicao_items').insert([
      { id:'de000005-de00-4000-8000-de000000000' + '09', medicao_id:MED2_ID, item_code:'4.1', qtd:290, pct:50, total:21025.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '10', medicao_id:MED2_ID, item_code:'4.2', qtd:210, pct:50, total:9450.00 },
      { id:'de000005-de00-4000-8000-de000000000' + '11', medicao_id:MED2_ID, item_code:'5.1', qtd:4250, pct:50, total:78625.00 },
    ]);

    console.log('[demo-reset] Demo data restored successfully.');

    return new Response(
      JSON.stringify({ success: true, message: 'Demo data reset completed successfully.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[demo-reset] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
