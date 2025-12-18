import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';
import 'https://esm.sh/jspdf-autotable@3.8.4';

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

    // Fetch RDO report
    const reportRes = await supabase.from('rdo_reports').select('*').eq('id', reportId).single();
    
    if (reportRes.error) throw reportRes.error;
    
    // Fetch obra config to determine the correct mode
    const { data: obraConfig } = await supabase
      .from('rdo_config')
      .select('modo_atividades')
      .eq('obra_id', obraId)
      .maybeSingle();

    // Use config mode if available, otherwise fall back to report mode
    const modoAtividades = obraConfig?.modo_atividades || reportRes.data.modo_atividades || 'manual';
    
    console.log('Modo de atividades (from config):', modoAtividades);
    
    // Fetch accumulated data for progress calculation
    const { data: acumuladoData } = await supabase
      .from('rdo_activities_acumulado')
      .select('*')
      .eq('obra_id', obraId)
      .lt('data', reportRes.data.data);
    
    const acumuladoMap = new Map<string, number>();
    (acumuladoData || []).forEach((item: any) => {
      if (item.orcamento_item_id) {
        acumuladoMap.set(item.orcamento_item_id, Number(item.executado_acumulado || 0));
      }
    });
    
    // Fetch activities based on obra config mode
    let activitiesQuery = supabase
      .from('rdo_activities')
      .select('*, orcamento_item:orcamento_items_hierarquia!orcamento_item_id(*)')
      .eq('report_id', reportId)
      .eq('tipo', modoAtividades);
    
    // Fetch all other RDO data
    const [activitiesRes, occurrencesRes, visitsRes, equipmentRes, laborRes, commentsRes, obraRes, mediaRes] = await Promise.all([
      activitiesQuery,
      supabase.from('rdo_occurrences').select('*').eq('report_id', reportId),
      supabase.from('rdo_visits').select('*').eq('report_id', reportId),
      supabase.from('rdo_equipment').select('*').eq('report_id', reportId),
      supabase.from('rdo_workforce').select('*').eq('report_id', reportId),
      supabase.from('rdo_comments').select('*').eq('report_id', reportId),
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('rdo_media').select('*').eq('report_id', reportId).eq('tipo', 'foto').order('created_at'),
    ]);

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

    console.log('Fetched RDO data - Modo:', modoAtividades, 'Activities:', rdoData.activities.length);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 35;

    // Fetch logo image from Supabase Storage
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/rdo-pdf/logo-dif-dpmt.jpg`;
    console.log('Attempting to load logo from:', logoUrl);
    
    let logoImageAdded = false;
    
    try {
      const logoResponse = await fetch(logoUrl);
      console.log('Logo fetch response status:', logoResponse.status, logoResponse.statusText);
      
      if (logoResponse.ok) {
        const logoArrayBuffer = await logoResponse.arrayBuffer();
        console.log('Logo ArrayBuffer size:', logoArrayBuffer.byteLength);
        
        if (logoArrayBuffer.byteLength > 0) {
          const logoUint8Array = new Uint8Array(logoArrayBuffer);
          
          // Convert to base64 using chunks to avoid stack overflow
          const chunkSize = 0x8000;
          const chunks: string[] = [];
          for (let i = 0; i < logoUint8Array.length; i += chunkSize) {
            const chunk = logoUint8Array.subarray(i, i + chunkSize);
            chunks.push(String.fromCharCode.apply(null, [...chunk]));
          }
          const logoBase64 = btoa(chunks.join(''));
          
          console.log('Logo base64 created, length:', logoBase64.length);
          
          // Try adding image with explicit data URI
          try {
            doc.addImage(
              'data:image/jpeg;base64,' + logoBase64,
              'JPEG',
              14,
              8,
              40,
              25
            );
            logoImageAdded = true;
            console.log('Logo image added successfully');
          } catch (imgError) {
            console.error('Failed to add image:', imgError);
          }
        }
      }
    } catch (fetchError) {
      console.error('Error fetching logo:', fetchError);
    }

    // Always show header text (logo issue unresolved in jsPDF + Deno)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    if (!logoImageAdded) {
      doc.text('DIF-DPMT', 14, 20);
    }
    
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

    yPos = Math.max((doc as any).lastAutoTable.finalY, 35) + 10;

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

    // Activities - Filtered and formatted by modo_atividades
    if (rdoData.activities.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      // Helper for natural sort
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

      let filteredActivities: any[] = [];
      let tableHead: string[] = [];
      let columnStyles: any = {};
      let rowIsHeader: boolean[] = [];

      // Apply filters based on modo_atividades
      switch (modoAtividades) {
        case 'manual':
          // Manual: progresso > 0 ou status = 'Concluído'
          filteredActivities = rdoData.activities.filter((a: any) => {
            const progresso = Number(a.progresso || 0);
            const status = (a.status || '').toLowerCase();
            return progresso > 0 || status === 'concluído' || status === 'concluido';
          });
          tableHead = ['Descrição', '% Executado', 'Status', 'Observação'];
          columnStyles = {
            0: { cellWidth: 85 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 35 }
          };
          break;

        case 'planilha': {
          // Somente MICROS com execução > 0; MACROs entram apenas como cabeçalhos (sem duplicar)
          const macros = rdoData.activities.filter((a: any) => a.orcamento_item?.is_macro);
          const macrosByCode = new Map<string, any>();
          for (const m of macros) {
            const code = m.item_code || m.orcamento_item?.item || '';
            if (code && !macrosByCode.has(code)) macrosByCode.set(code, m);
          }
          const micros = rdoData.activities.filter((a: any) => {
            const isMacro = a.orcamento_item?.is_macro || false;
            const executed = Number(a.executado_dia || 0) > 0;
            return !isMacro && executed;
          });

          const sortedMicros = [...micros].sort((a, b) => {
            const ordemA = a.orcamento_item?.ordem;
            const ordemB = b.orcamento_item?.ordem;
            if (typeof ordemA === 'number' && typeof ordemB === 'number') {
              return ordemA - ordemB;
            }
            const codeA = a.item_code || a.orcamento_item?.item || '';
            const codeB = b.item_code || b.orcamento_item?.item || '';
            return naturalCompare(codeA, codeB);
          });

          const combined: any[] = [];
          rowIsHeader = [];
          const shownHeaders = new Set<string>();

          const ensureHeader = (code: string) => {
            if (!code || shownHeaders.has(code)) return;
            const macro = macrosByCode.get(code);
            const desc = macro?.descricao || macro?.orcamento_item?.descricao || '-';
            combined.push({
              item_code: code,
              descricao: desc,
              unidade: null,
              executado_dia: null,
              progresso: null,
              _is_header: true,
            });
            rowIsHeader.push(true);
            shownHeaders.add(code);
          };

          for (const a of sortedMicros) {
            const rawCode = a.item_code || a.orcamento_item?.item || '';
            if (rawCode) {
              const parts = rawCode.split('.');
              // level 1
              ensureHeader(parts[0]);
              // level 2 (opcional)
              if (parts.length >= 2) ensureHeader(`${parts[0]}.${parts[1]}`);
            }
            combined.push(a);
            rowIsHeader.push(false);
          }

          filteredActivities = combined;

          tableHead = ['Item', 'Descrição', 'Executado', 'Un.', 'Progresso'];
          columnStyles = {
            0: { cellWidth: 18 },
            1: { cellWidth: 95 },
            2: { cellWidth: 22 },
            3: { cellWidth: 15 },
            4: { cellWidth: 25 }
          };
          break;
        }

        case 'template':
          // Template: progresso > 0
          filteredActivities = rdoData.activities.filter((a: any) => {
            const progresso = Number(a.progresso || 0);
            return progresso > 0;
          });
          tableHead = ['Descrição', '% Executado', 'Status', 'Observação'];
          columnStyles = {
            0: { cellWidth: 85 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 35 }
          };
          break;

        default:
          console.warn('Modo de atividades desconhecido:', modoAtividades);
          filteredActivities = [];
      }

      if (filteredActivities.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Sem registros executados neste modo', 14, yPos);
        yPos += 8;
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const modoLabel = modoAtividades === 'manual' ? 'Manual' : 
                         modoAtividades === 'planilha' ? 'Planilha' : 'Template';
        doc.text(`Atividades Executadas (${modoLabel}) - ${filteredActivities.length}`, 14, yPos);
        yPos += 5;

        // Build table body based on mode
        let tableBody: any[] = [];
        
        if (modoAtividades === 'planilha') {
          tableBody = filteredActivities
            .filter((a) => {
              // Filtrar apenas MICROs (não headers) com executado_dia > 0
              const isHeader = a._is_header === true;
              const executadoDia = Number(a.executado_dia || 0);
              return !isHeader && executadoDia > 0;
            })
            .map((a) => {
              const itemCode = a.item_code || a.orcamento_item?.item || '-';
              
              // Calculate real progress dynamically
              let progressoReal = 0;
              if (a.orcamento_item_id) {
                const executadoDia = Number(a.executado_dia || 0);
                const executadoAcumulado = acumuladoMap.get(a.orcamento_item_id) || 0;
                const quantidadeTotal = Number(a.quantidade_total || a.orcamento_item?.quantidade || 0);
                
                if (quantidadeTotal > 0) {
                  const totalExecutado = executadoAcumulado + executadoDia;
                  progressoReal = Math.min(100, Math.round((totalExecutado / quantidadeTotal) * 100));
                }
              }
              
              return [
                itemCode,
                a.descricao,
                a.executado_dia?.toFixed(2) || '0',
                a.unidade || '-',
                `${progressoReal}%`
              ];
            });
        } else {
          // manual ou template
          tableBody = filteredActivities.map(a => [
            a.descricao,
            `${a.progresso || 0}%`,
            a.status || '-',
            a.observacao || '-'
          ]);
        }

        (doc as any).autoTable({
          startY: yPos,
          head: [tableHead],
          body: tableBody,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: columnStyles,
          didParseCell: function(data: any) {
            if (data.section === 'body' && modoAtividades === 'planilha') {
              const isHeader = rowIsHeader[data.row.index] === true;
              if (isHeader) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [250, 250, 250];
              }
            }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
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

    // Signatures with validation timestamps - Fiscal and Contratada
    const hasFiscalSignature = rdoData.report.assinatura_fiscal_nome;
    const hasContratadaSignature = rdoData.report.assinatura_contratada_nome;
    
    if (hasFiscalSignature || hasContratadaSignature) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      // Fiscal signature
      if (hasFiscalSignature) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Fiscal (DPE-MT)', 14, yPos);
        yPos += 5;

        const fiscalValidadoEm = rdoData.report.assinatura_fiscal_validado_em 
          ? new Date(rdoData.report.assinatura_fiscal_validado_em).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })
          : 'Pendente';

        (doc as any).autoTable({
          startY: yPos,
          head: [['Nome', 'Cargo', 'CREA/CAU', 'Validado em']],
          body: [[
            rdoData.report.assinatura_fiscal_nome,
            rdoData.report.assinatura_fiscal_cargo || '-',
            rdoData.report.assinatura_fiscal_documento || '-',
            fiscalValidadoEm
          ]],
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

      // Contratada signature
      if (hasContratadaSignature) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Contratada', 14, yPos);
        yPos += 5;

        const contratadaValidadoEm = rdoData.report.assinatura_contratada_validado_em 
          ? new Date(rdoData.report.assinatura_contratada_validado_em).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })
          : 'Pendente';

        (doc as any).autoTable({
          startY: yPos,
          head: [['Nome', 'Cargo', 'CREA/CAU', 'Validado em']],
          body: [[
            rdoData.report.assinatura_contratada_nome,
            rdoData.report.assinatura_contratada_cargo || '-',
            rdoData.report.assinatura_contratada_documento || '-',
            contratadaValidadoEm
          ]],
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
    }

    // Footer with Cuiabá timezone - formato corrigido
    const pageCount = doc.getNumberOfPages();
    const now = new Date();
    
    // Horário com timezone de Cuiabá usando Intl
    const formatterDate = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Cuiaba',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formatterTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Cuiaba',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const formattedDate = formatterDate.format(now);
    const formattedTime = formatterTime.format(now);
    const cuiabaDateTime = `${formattedDate}, ${formattedTime}`;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${cuiabaDateTime}`,
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

    console.log('PDF generated successfully:', publicUrl, '- Modo:', modoAtividades);

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