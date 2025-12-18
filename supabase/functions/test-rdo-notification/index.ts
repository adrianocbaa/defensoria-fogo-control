import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('=== test-rdo-notification function started ===');
  
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

    // Buscar obra de Rondonópolis Criminal
    console.log('Buscando obra de Rondonópolis Criminal...');
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select(`
        id,
        nome,
        n_contrato,
        data_inicio,
        empresa_id,
        empresas (
          id,
          razao_social,
          email
        )
      `)
      .eq('id', '9e5b55bc-df14-4708-838f-cef1777fc8ee')
      .single();

    if (obraError || !obra) {
      console.error('Erro ao buscar obra:', obraError);
      throw new Error('Obra não encontrada');
    }

    console.log('Obra encontrada:', obra.nome);

    // Email de teste fixo
    const destinatarios = ['adriano.eng.mt@gmail.com'];

    console.log('Destinatários de teste:', destinatarios);

    // Montar corpo do email
    const nomeEmpresa = (obra.empresas as any)?.razao_social || 'Empresa não identificada';
    const numeroContrato = obra.n_contrato || 'Não informado';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .highlight { background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #1e3a5f; }
    .footer { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0; font-size: 20px; }
    h2 { color: #1e3a5f; }
    ul { padding-left: 20px; }
    li { margin-bottom: 10px; }
    .test-banner { background-color: #ffc107; color: #000; padding: 10px; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <div class="test-banner">
    ⚠️ ESTE É UM EMAIL DE TESTE - NÃO É UMA NOTIFICAÇÃO REAL ⚠️
  </div>
  
  <div class="header">
    <h1>DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</h1>
    <p>Diretoria de Infraestrutura Física</p>
  </div>
  
  <div class="content">
    <h2>NOTIFICAÇÃO</h2>
    
    <p>A <strong>Diretoria de Infraestrutura Física da Defensoria Pública do Estado de Mato Grosso</strong>, no exercício de suas atribuições de fiscalização contratual, <strong>NOTIFICA</strong> a empresa <strong>${nomeEmpresa}</strong> acerca do que segue:</p>
    
    <div class="highlight">
      <p>Verificou-se que, há aproximadamente <strong>07 (sete) dias</strong>, não constam registros atualizados da execução dos serviços referentes à obra em andamento, circunstância que prejudica o acompanhamento, o controle e a fiscalização da execução contratual.</p>
    </div>
    
    <p><strong>Obra:</strong> ${obra.nome}</p>
    <p><strong>Contrato:</strong> ${numeroContrato}</p>
    
    <p>Ressalta-se que, nos termos da Cláusula Décima do Contrato nº 187/2025, bem como do art. 117, §1º, da Lei nº 14.133/2021, a fiscalização do contrato deve manter registro formal das ocorrências relacionadas à execução, sendo dever da contratada colaborar plenamente com a fiscalização, prestando informações, esclarecimentos e dados necessários ao adequado acompanhamento da obra.</p>
    
    <p>Dessa forma, <strong>NOTIFICA-SE</strong> a Contratada para que:</p>
    
    <ul>
      <li>Regularize imediatamente o fornecimento das informações necessárias ao registro diário da execução dos serviços, inclusive quanto às atividades efetivamente realizadas no período;</li>
      <li>Adote as providências necessárias para evitar a reincidência da ausência de registros, assegurando a transparência e a rastreabilidade da execução contratual.</li>
    </ul>
    
    <div class="highlight">
      <p><strong>O não atendimento à presente notificação poderá ensejar a adoção das medidas administrativas cabíveis, inclusive quanto à caracterização de descumprimento contratual, nos termos da legislação vigente e do contrato.</strong></p>
    </div>
  </div>
  
  <div class="footer">
    <p>Esta é uma mensagem automática gerada pelo Sistema de Gestão de Obras da DPE-MT.</p>
    <p>Em caso de dúvidas, entre em contato com a Diretoria de Infraestrutura Física.</p>
  </div>
  
  <div class="test-banner">
    ⚠️ EMAIL DE TESTE ENVIADO EM: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })} ⚠️
  </div>
</body>
</html>
    `;

    // Enviar email de teste
    console.log('Enviando email de teste...');
    const emailResponse = await resend.emails.send({
      from: 'DIF - DPE-MT <onboarding@resend.dev>',
      to: destinatarios,
      subject: `[TESTE] NOTIFICAÇÃO - Ausência de Registros RDO - ${obra.nome}`,
      html: htmlBody,
    });

    console.log('Email de teste enviado com sucesso:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de teste enviado com sucesso!',
        destinatario: destinatarios[0],
        obra: obra.nome,
        emailResponse,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na função test-rdo-notification:', error);
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
