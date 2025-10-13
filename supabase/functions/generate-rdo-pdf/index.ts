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
  media: any[];
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
    const [reportRes, activitiesRes, occurrencesRes, visitsRes, equipmentRes, laborRes, commentsRes, obraRes, mediaRes] = await Promise.all([
      supabase.from('rdo_reports').select('*').eq('id', reportId).single(),
      supabase.from('rdo_activities')
        .select('*, orcamento_item:orcamento_items_hierarquia!orcamento_item_id(*)')
        .eq('report_id', reportId)
        .eq('tipo', 'planilha')
        .gt('executado_dia', 0),
      supabase.from('rdo_occurrences').select('*').eq('report_id', reportId),
      supabase.from('rdo_visits').select('*').eq('report_id', reportId),
      supabase.from('rdo_equipment').select('*').eq('report_id', reportId),
      supabase.from('rdo_labor').select('*').eq('report_id', reportId),
      supabase.from('rdo_comments').select('*').eq('report_id', reportId),
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('rdo_media').select('*').eq('report_id', reportId).eq('tipo', 'foto').order('created_at'),
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
      media: mediaRes.data || [],
    };

    console.log('Fetched RDO data:', rdoData);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 15;

    // Header with logo placeholder and info table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DPMT', 14, yPos);
    
    // Info table on the right
    (doc as any).autoTable({
      startY: 10,
      margin: { left: pageWidth - 70 },
      head: [],
      body: [
        ['Relatório nº', rdoData.report.numero_seq],
        ['Data do relatório', new Date(rdoData.report.data).toLocaleDateString('pt-BR')],
        ['Dia da semana', new Date(rdoData.report.data).toLocaleDateString('pt-BR', { weekday: 'long' })],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 35 }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Diário de Obra (RDO)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Obra Info Table
    (doc as any).autoTable({
      startY: yPos,
      head: [],
      body: [
        ['Obra', rdoData.obra.nome],
        ['Local', rdoData.obra.municipio],
        ['Contratada', rdoData.obra.empresa_responsavel || '-'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, fillColor: [240, 240, 240] },
        1: { cellWidth: pageWidth - 70 }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Weather conditions table
    if (rdoData.report.clima_manha || rdoData.report.clima_tarde) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Condição climática', 14, yPos);
      yPos += 5;

      const weatherData = [];
      if (rdoData.report.clima_manha) {
        weatherData.push(['Manhã', rdoData.report.clima_manha, rdoData.report.cond_manha || 'Praticável']);
      }
      if (rdoData.report.clima_tarde) {
        weatherData.push(['Tarde', rdoData.report.clima_tarde, rdoData.report.cond_tarde || 'Praticável']);
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [['', 'Tempo', 'Condição']],
        body: weatherData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 60 }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Labor (Mão de obra) - horizontal table
    if (rdoData.labor.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Mão de obra (${rdoData.labor.length})`, 14, yPos);
      yPos += 5;

      // Create horizontal layout
      const laborHead = rdoData.labor.map(l => l.funcao);
      const laborBody = [rdoData.labor.map(l => l.quantidade || '0')];

      (doc as any).autoTable({
        startY: yPos,
        head: [laborHead],
        body: laborBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Activities - Only items with executado_dia > 0, respecting hierarchy
    if (rdoData.activities.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      // Robust sort: ordem asc, fallback to natural sort of item_code (1, 1.2, 1.10, 2 ...)
      const naturalCompare = (a: string, b: string) => {
        const as = a.split('.').map(Number);
        const bs = b.split('.').map(Number);
        const len = Math.max(as.length, bs.length);
        for (let i = 0; i < len; i++) {
          const av = as[i] ?? 0;
          const bv = bs[i] ?? 0;
          if (av !== bv) return av - bv;
        }
        return 0;
      };

      const sortedActivities = [...rdoData.activities].sort((a, b) => {
        const ordemA = a.orcamento_item?.ordem;
        const ordemB = b.orcamento_item?.ordem;
        if (typeof ordemA === 'number' && typeof ordemB === 'number') {
          return ordemA - ordemB;
        }
        const codeA = a.item_code || a.orcamento_item?.item || '';
        const codeB = b.item_code || b.orcamento_item?.item || '';
        return naturalCompare(codeA, codeB);
      });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Atividades Executadas (${sortedActivities.length})`, 14, yPos);
      yPos += 5;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Item', 'Descrição', 'Executado', 'Un.', 'Progresso']],
        body: sortedActivities.map(a => {
          const isMacro = a.orcamento_item?.is_macro || false;
          const itemCode = a.item_code || a.orcamento_item?.item || '-';
          return [
            itemCode,
            a.descricao,
            isMacro ? '-' : (a.executado_dia?.toFixed(2) || '0'),
            isMacro ? '-' : (a.unidade || '-'),
            isMacro ? '-' : `${a.progresso || 0}%`
          ];
        }),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 95 },
          2: { cellWidth: 22 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 }
        },
        didParseCell: function(data: any) {
          if (data.section === 'body') {
            const activity = sortedActivities[data.row.index];
            const isMacro = activity.orcamento_item?.is_macro || false;
            if (isMacro) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [250, 250, 250];
            }
          }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Occurrences
    if (rdoData.occurrences.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Ocorrências (${rdoData.occurrences.length})`, 14, yPos);
      yPos += 5;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Título', 'Descrição', 'Gravidade', 'Impacto']],
        body: rdoData.occurrences.map(o => [
          o.titulo,
          o.descricao || '-',
          o.gravidade || '-',
          o.impacto_cronograma ? 'Sim' : 'Não'
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 80 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Visits
    if (rdoData.visits.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Visitas (${rdoData.visits.length})`, 14, yPos);
      yPos += 5;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Visitante', 'Cargo', 'Instituição', 'Entrada']],
        body: rdoData.visits.map(v => [
          v.visitante || '-',
          v.cargo || '-',
          v.instituicao || '-',
          v.hora_entrada || '-'
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Equipment
    if (rdoData.equipment.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Equipamentos (${rdoData.equipment.length})`, 14, yPos);
      yPos += 5;

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
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Photos/Media - 2 per row
    if (rdoData.media.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Evidências Fotográficas (${rdoData.media.length})`, 14, yPos);
      yPos += 8;

      const imgWidth = (pageWidth - 28 - 5) / 2; // 2 images per row with 5mm gap
      const imgHeight = 60; // Fixed height for consistency
      let currentX = 14;
      let rowMaxHeight = 0;

      for (let i = 0; i < rdoData.media.length; i++) {
        const media = rdoData.media[i];
        const isFirstInRow = i % 2 === 0;
        const isLastInRow = i % 2 === 1 || i === rdoData.media.length - 1;

        try {
          // Check if we need a new page before starting a new row
          if (isFirstInRow && yPos + imgHeight + 30 > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }

          // Fetch image
          const imgResponse = await fetch(media.file_url);
          if (imgResponse.ok) {
            const imgBlob = await imgResponse.arrayBuffer();
            const imgBase64 = btoa(
              new Uint8Array(imgBlob).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            // Determine image format from URL
            const imgFormat = media.file_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
            
            // Set X position based on column
            currentX = isFirstInRow ? 14 : 14 + imgWidth + 5;
            
            // Add image
            doc.addImage(
              `data:image/${imgFormat.toLowerCase()};base64,${imgBase64}`,
              imgFormat,
              currentX,
              yPos,
              imgWidth,
              imgHeight
            );
            
            let captionHeight = 0;
            
            // Add caption if exists
            if (media.descricao) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'italic');
              const lines = doc.splitTextToSize(media.descricao, imgWidth);
              doc.text(lines, currentX, yPos + imgHeight + 3);
              captionHeight = (lines.length * 3) + 3;
              doc.setFont('helvetica', 'normal');
            }
            
            // Track max height for this row
            const totalHeight = imgHeight + captionHeight;
            if (totalHeight > rowMaxHeight) {
              rowMaxHeight = totalHeight;
            }
            
            // Move to next row if this was the last image in the row
            if (isLastInRow) {
              yPos += rowMaxHeight + 8;
              rowMaxHeight = 0;
            }
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
          // Move to next position even on error
          if (isLastInRow) {
            yPos += imgHeight + 8;
            rowMaxHeight = 0;
          }
        }
      }
    }

    // Signatures with validation timestamps - Fiscal only
    if (rdoData.report.assinatura_fiscal_nome) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Fiscal (DPE-MT)', 14, yPos);
      yPos += 5;

      const signaturesData = [];
      
      const validadoEm = rdoData.report.assinatura_fiscal_validado_em 
        ? new Date(rdoData.report.assinatura_fiscal_validado_em).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })
        : 'Pendente';
      
      signaturesData.push([
        rdoData.report.assinatura_fiscal_nome,
        rdoData.report.assinatura_fiscal_cargo || '-',
        rdoData.report.assinatura_fiscal_documento || '-',
        validadoEm
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [['Nome', 'Cargo', 'CREA/CAU', 'Validado em']],
        body: signaturesData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 45 }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Footer with Cuiabá timezone
    const pageCount = doc.getNumberOfPages();
    const cuiabaTime = new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Cuiaba',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${cuiabaTime}`,
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