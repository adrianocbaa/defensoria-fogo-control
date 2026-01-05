import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_FIXO = "dif@dp.mt.gov.br";
const MAX_DIAS_SEM_RDO = 7; // Dias corridos

const handler = async (req: Request): Promise<Response> => {
  console.log('=== notify-rdo-delay function started ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Buscar obras em andamento com empresa vinculada e RDO habilitado
    console.log('Buscando obras em andamento com RDO habilitado...');
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select(`
        id,
        nome,
        n_contrato,
        data_inicio,
        empresa_id,
        fiscal_id,
        rdo_habilitado,
        empresas (
          id,
          razao_social,
          email
        )
      `)
      .eq('status', 'em_andamento')
      .eq('rdo_habilitado', true)
      .not('empresa_id', 'is', null)
      .not('data_inicio', 'is', null);

    if (obrasError) {
      console.error('Erro ao buscar obras:', obrasError);
      throw obrasError;
    }

    console.log(`Encontradas ${obras?.length || 0} obras em andamento com RDO habilitado`);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const notificacoesEnviadas: string[] = [];

    for (const obra of obras || []) {
      console.log(`\nVerificando obra: ${obra.nome} (${obra.id})`);
      
      // Verificar se já foi enviada notificação para esta obra hoje
      const { data: notificacaoExistente } = await supabase
        .from('rdo_notificacoes_enviadas')
        .select('id')
        .eq('obra_id', obra.id)
        .eq('data_referencia', hoje.toISOString().split('T')[0])
        .single();

      if (notificacaoExistente) {
        console.log(`Notificação já enviada hoje para obra ${obra.id}`);
        continue;
      }

      // Buscar todos os RDOs da obra
      const { data: rdos, error: rdosError } = await supabase
        .from('rdo_reports')
        .select('data')
        .eq('obra_id', obra.id);

      if (rdosError) {
        console.error(`Erro ao buscar RDOs da obra ${obra.id}:`, rdosError);
        continue;
      }

      // Buscar dias sem expediente
      const { data: diasSemExpediente, error: diasError } = await supabase
        .from('rdo_dias_sem_expediente')
        .select('data')
        .eq('obra_id', obra.id);

      if (diasError) {
        console.error(`Erro ao buscar dias sem expediente da obra ${obra.id}:`, diasError);
        continue;
      }

      // Criar sets para busca rápida
      const rdoDates = new Set(rdos?.map(r => r.data) || []);
      const semExpedienteDates = new Set(diasSemExpediente?.map(d => d.data) || []);

      console.log(`RDOs preenchidos: ${rdoDates.size}, Dias sem expediente: ${semExpedienteDates.size}`);

      // Calcular data de início e data de hoje
      const dataInicio = new Date(obra.data_inicio);
      dataInicio.setHours(0, 0, 0, 0);

      // Encontrar a primeira lacuna (primeiro dia sem RDO e sem ser "sem expediente")
      let primeiraLacuna: Date | null = null;
      const dataIterator = new Date(dataInicio);

      while (dataIterator < hoje) {
        const dataStr = dataIterator.toISOString().split('T')[0];
        
        // Se não tem RDO e não é dia sem expediente, é uma lacuna
        if (!rdoDates.has(dataStr) && !semExpedienteDates.has(dataStr)) {
          primeiraLacuna = new Date(dataIterator);
          break;
        }
        
        dataIterator.setDate(dataIterator.getDate() + 1);
      }

      if (!primeiraLacuna) {
        console.log(`Nenhuma lacuna encontrada para obra ${obra.nome}`);
        continue;
      }

      // Calcular dias corridos desde a primeira lacuna até hoje
      const diasCorridosSemRdo = Math.floor((hoje.getTime() - primeiraLacuna.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Primeira lacuna: ${primeiraLacuna.toISOString().split('T')[0]}, Dias corridos sem RDO: ${diasCorridosSemRdo}`);

      // Se não atingiu o limite, pular
      if (diasCorridosSemRdo < MAX_DIAS_SEM_RDO) {
        console.log(`Obra ${obra.nome}: ${diasCorridosSemRdo} dias < ${MAX_DIAS_SEM_RDO} dias (limite)`);
        continue;
      }

      console.log(`Obra ${obra.nome} atingiu ${diasCorridosSemRdo} dias corridos sem RDO (desde ${primeiraLacuna.toISOString().split('T')[0]}). Preparando notificação...`);

      // Coletar emails dos destinatários
      const destinatarios: string[] = [EMAIL_FIXO];
      
      // Email da empresa
      const empresaEmail = (obra.empresas as any)?.email;
      if (empresaEmail) {
        destinatarios.push(empresaEmail);
      }

      // Buscar email do usuário contratada responsável pela empresa
      if (obra.empresa_id) {
        const { data: usuariosContratada } = await supabase
          .from('profiles')
          .select('email')
          .eq('empresa_id', obra.empresa_id)
          .eq('is_active', true);
        
        if (usuariosContratada) {
          for (const u of usuariosContratada) {
            if (u.email && !destinatarios.includes(u.email)) {
              destinatarios.push(u.email);
            }
          }
        }
      }

      // Buscar email do fiscal
      if (obra.fiscal_id) {
        const { data: fiscal } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', obra.fiscal_id)
          .single();
        
        if (fiscal?.email && !destinatarios.includes(fiscal.email)) {
          destinatarios.push(fiscal.email);
        }
      }

      console.log(`Destinatários para ${obra.nome}:`, destinatarios);

      // Montar corpo do email
      const nomeEmpresa = (obra.empresas as any)?.razao_social || 'Empresa não identificada';
      const numeroContrato = obra.n_contrato || 'Não informado';
      const dataLacunaFormatada = primeiraLacuna.toLocaleDateString('pt-BR');

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #166534; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .highlight { background-color: #f0fdf4; padding: 15px; margin: 15px 0; border-left: 4px solid #166534; }
    .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0; font-size: 20px; }
    h2 { color: #166534; }
    ul { padding-left: 20px; }
    li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</h1>
    <p>Diretoria de Infraestrutura Física</p>
  </div>
  
  <div class="content">
    <h2>ADVERTÊNCIA</h2>
    
    <p>A <strong>Diretoria de Infraestrutura Física da Defensoria Pública do Estado de Mato Grosso</strong>, no exercício de suas atribuições de fiscalização contratual, <strong>ADVERTE</strong> a empresa <strong>${nomeEmpresa}</strong> acerca do que segue:</p>
    
    <div class="highlight">
      <p>Verificou-se que, desde o dia <strong>${dataLacunaFormatada}</strong> (há <strong>${diasCorridosSemRdo} dias corridos</strong>), não constam registros atualizados da execução dos serviços referentes à obra em andamento, circunstância que prejudica o acompanhamento, o controle e a fiscalização da execução contratual.</p>
    </div>
    
    <p><strong>Obra:</strong> ${obra.nome}</p>
    <p><strong>Contrato:</strong> ${numeroContrato}</p>
    
    <p>Ressalta-se que, nos termos da Cláusula Décima do Contrato nº 187/2025, bem como do art. 117, §1º, da Lei nº 14.133/2021, a fiscalização do contrato deve manter registro formal das ocorrências relacionadas à execução, sendo dever da contratada colaborar plenamente com a fiscalização, prestando informações, esclarecimentos e dados necessários ao adequado acompanhamento da obra.</p>
    
    <p>Dessa forma, <strong>ADVERTE-SE</strong> a Contratada para que:</p>
    
    <ul>
      <li>Regularize imediatamente o fornecimento das informações necessárias ao registro diário da execução dos serviços, inclusive quanto às atividades efetivamente realizadas no período;</li>
      <li>Adote as providências necessárias para evitar a reincidência da ausência de registros, assegurando a transparência e a rastreabilidade da execução contratual.</li>
    </ul>
    
    <div class="highlight">
      <p><strong>O não atendimento à presente ADVERTÊNCIA poderá ensejar a adoção das medidas administrativas cabíveis, inclusive quanto à caracterização de descumprimento contratual, nos termos da legislação vigente e do contrato.</strong></p>
    </div>
  </div>
  
  <div class="footer">
    <p>Esta é uma mensagem automática gerada pelo Sistema de Gestão de Obras da DPE-MT.</p>
    <p>Em caso de dúvidas, entre em contato com a Diretoria de Infraestrutura Física.</p>
  </div>
</body>
</html>
      `;

      // Enviar email
      try {
        const emailResponse = await resend.emails.send({
          from: 'DIF - DPE-MT <onboarding@resend.dev>',
          to: destinatarios,
          subject: `ADVERTÊNCIA - Ausência de Registros RDO - ${obra.nome}`,
          html: htmlBody,
        });

        console.log(`Email enviado com sucesso para obra ${obra.nome}:`, emailResponse);

        // Registrar notificação enviada
        await supabase.from('rdo_notificacoes_enviadas').insert({
          obra_id: obra.id,
          data_referencia: hoje.toISOString().split('T')[0],
          destinatarios: destinatarios,
        });

        notificacoesEnviadas.push(obra.nome);
      } catch (emailError) {
        console.error(`Erro ao enviar email para obra ${obra.nome}:`, emailError);
      }
    }

    console.log('\n=== Processamento concluído ===');
    console.log(`Notificações enviadas: ${notificacoesEnviadas.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${notificacoesEnviadas.length} notificação(ões) enviada(s)`,
        obras: notificacoesEnviadas,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na função notify-rdo-delay:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
