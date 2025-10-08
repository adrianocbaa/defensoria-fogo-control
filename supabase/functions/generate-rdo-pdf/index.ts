import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { jsPDF } from 'https://cdn.skypack.dev/jspdf@2.5.2';
import 'https://cdn.skypack.dev/jspdf-autotable@3.8.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RDOData {
  report: any;
  activities: any[];
  occurrences: any[];
  visits: any[];
  equipment: any[];
  labor: any[];
  comments: any[];
  obra: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reportId, obraId } = await req.json();

    console.log('Generating PDF for report:', reportId, 'obra:', obraId);

    // Fetch all RDO data
    const [reportRes, activitiesRes, occurrencesRes, visitsRes, equipmentRes, laborRes, commentsRes, obraRes] = await Promise.all([
      supabase.from('rdo_reports').select('*').eq('id', reportId).single(),
      supabase.from('rdo_activities').select('*').eq('report_id', reportId),
      supabase.from('rdo_occurrences').select('*').eq('report_id', reportId),
      supabase.from('rdo_visits').select('*').eq('report_id', reportId),
      supabase.from('rdo_equipment').select('*').eq('report_id', reportId),
      supabase.from('rdo_labor').select('*').eq('report_id', reportId),
      supabase.from('rdo_comments').select('*').eq('report_id', reportId),
      supabase.from('obras').select('*').eq('id', obraId).single(),
    ]);

    if (reportRes.error) throw reportRes.error;
    if (obraRes.error) throw obraRes.error;

    const rdoData: RDOData = {
      report: reportRes.data,
      activities: activitiesRes.data || [],
      occurrences: occurrencesRes.data || [],
      visits: visitsRes.data || [],
      equipment: equipmentRes.data || [],
      labor: laborRes.data || [],
      comments: commentsRes.data || [],
      obra: obraRes.data,
    };

    console.log('Fetched RDO data:', rdoData);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DIÁRIO DE OBRA (RDO)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`RDO Nº ${rdoData.report.numero_seq}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.text(`Data: ${new Date(rdoData.report.data).toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Obra Info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. IDENTIFICAÇÃO DA OBRA', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Obra: ${rdoData.obra.nome}`, 14, yPos);
    yPos += 5;
    doc.text(`Município: ${rdoData.obra.municipio}`, 14, yPos);
    yPos += 5;
    if (rdoData.obra.n_contrato) {
      doc.text(`Contrato: ${rdoData.obra.n_contrato}`, 14, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Weather conditions
    if (rdoData.report.clima_manha || rdoData.report.clima_tarde || rdoData.report.clima_noite) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. CONDIÇÕES CLIMÁTICAS', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (rdoData.report.clima_manha) doc.text(`Manhã: ${rdoData.report.clima_manha}`, 14, yPos); yPos += 5;
      if (rdoData.report.clima_tarde) doc.text(`Tarde: ${rdoData.report.clima_tarde}`, 14, yPos); yPos += 5;
      if (rdoData.report.clima_noite) doc.text(`Noite: ${rdoData.report.clima_noite}`, 14, yPos); yPos += 5;
      if (rdoData.report.cond_manha) doc.text(`Condição Manhã: ${rdoData.report.cond_manha}`, 14, yPos); yPos += 5;
      if (rdoData.report.cond_tarde) doc.text(`Condição Tarde: ${rdoData.report.cond_tarde}`, 14, yPos); yPos += 5;
      if (rdoData.report.cond_noite) doc.text(`Condição Noite: ${rdoData.report.cond_noite}`, 14, yPos); yPos += 5;
      yPos += 5;
    }

    // Activities
    if (rdoData.activities.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. ATIVIDADES EXECUTADAS', 14, yPos);
      yPos += 8;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Descrição', 'Qtd', 'Un.', 'Status']],
        body: rdoData.activities.map(a => [
          a.descricao,
          a.qtd || '-',
          a.unidade || '-',
          a.status || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Occurrences
    if (rdoData.occurrences.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. OCORRÊNCIAS', 14, yPos);
      yPos += 8;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Título', 'Descrição', 'Gravidade']],
        body: rdoData.occurrences.map(o => [
          o.titulo,
          o.descricao || '-',
          o.gravidade || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [231, 76, 60] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Visits
    if (rdoData.visits.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('5. VISITAS', 14, yPos);
      yPos += 8;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Visitante', 'Cargo', 'Instituição', 'Hora']],
        body: rdoData.visits.map(v => [
          v.visitante || '-',
          v.cargo || '-',
          v.instituicao || '-',
          v.hora_entrada || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [46, 204, 113] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Equipment
    if (rdoData.equipment.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('6. EQUIPAMENTOS', 14, yPos);
      yPos += 8;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Equipamento', 'Origem', 'Horas', 'Situação']],
        body: rdoData.equipment.map(e => [
          e.equipamento,
          e.proprio_ou_terceiro || '-',
          e.horas_trabalhadas || '-',
          e.situacao || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [243, 156, 18] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Labor
    if (rdoData.labor.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('7. MÃO DE OBRA', 14, yPos);
      yPos += 8;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Função', 'Origem', 'Quantidade']],
        body: rdoData.labor.map(l => [
          l.funcao,
          l.origem || '-',
          l.quantidade || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [155, 89, 182] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Signatures
    if (rdoData.report.assinatura_fiscal_nome || rdoData.report.assinatura_contratada_nome) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('8. ASSINATURAS', 14, yPos);
      yPos += 10;

      const signatureWidth = (pageWidth - 40) / 2;

      if (rdoData.report.assinatura_fiscal_nome) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Fiscal/Gestor (DPE-MT):', 14, yPos);
        yPos += 5;
        doc.text(`Nome: ${rdoData.report.assinatura_fiscal_nome}`, 14, yPos);
        yPos += 5;
        doc.text(`Cargo: ${rdoData.report.assinatura_fiscal_cargo || '-'}`, 14, yPos);
        yPos += 5;
        doc.text(`Doc: ${rdoData.report.assinatura_fiscal_documento || '-'}`, 14, yPos);
        yPos += 10;
      }

      if (rdoData.report.assinatura_contratada_nome) {
        doc.text('Responsável Técnico (Contratada):', 14, yPos);
        yPos += 5;
        doc.text(`Nome: ${rdoData.report.assinatura_contratada_nome}`, 14, yPos);
        yPos += 5;
        doc.text(`Cargo: ${rdoData.report.assinatura_contratada_cargo || '-'}`, 14, yPos);
        yPos += 5;
        doc.text(`Doc: ${rdoData.report.assinatura_contratada_documento || '-'}`, 14, yPos);
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF to storage
    const pdfBytes = doc.output('arraybuffer');
    const fileName = `${obraId}/${reportId}/RDO-${rdoData.report.numero_seq}-${rdoData.report.data}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('rdo-pdf')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('rdo-pdf')
      .getPublicUrl(fileName);

    // Update report with PDF URL
    await supabase
      .from('rdo_reports')
      .update({ pdf_url: publicUrl })
      .eq('id', reportId);

    console.log('PDF generated successfully:', publicUrl);

    return new Response(
      JSON.stringify({ pdfUrl: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});