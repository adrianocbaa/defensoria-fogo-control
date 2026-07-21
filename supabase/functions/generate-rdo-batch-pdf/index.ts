import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { obraId, dataInicio, dataFim } = await req.json();

    console.log('Batch PDF generation for obra:', obraId, 'from:', dataInicio, 'to:', dataFim);

    // Fetch all RDOs in the date range that are concluded or approved
    const { data: rdos, error: rdosError } = await supabase
      .from('rdo_reports')
      .select('id, data, numero_seq, status, pdf_url')
      .eq('obra_id', obraId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .in('status', ['concluido', 'aprovado'])
      .order('data', { ascending: true });

    if (rdosError) throw rdosError;

    if (!rdos || rdos.length === 0) {
      return new Response(
        JSON.stringify({ count: 0, message: 'Nenhum RDO encontrado no período' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${rdos.length} RDOs to process`);

    // Create ZIP file
    const zip = new JSZip();
    const errors: string[] = [];

    // Process each RDO
    for (const rdo of rdos) {
      try {
        let pdfUrl = rdo.pdf_url;

        // If no PDF exists, generate it
        if (!pdfUrl) {
          console.log(`Generating PDF for RDO ${rdo.numero_seq} (${rdo.data})`);
          
          // Call the existing generate-rdo-pdf function internally
          const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-rdo-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ reportId: rdo.id, obraId }),
          });

          if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            console.error(`Error generating PDF for RDO ${rdo.numero_seq}:`, errorText);
            errors.push(`RDO #${rdo.numero_seq} (${rdo.data}): Erro ao gerar PDF`);
            continue;
          }

          const generateData = await generateResponse.json();
          pdfUrl = generateData.pdfUrl;
        }

        if (pdfUrl) {
          // Extract storage path from public URL (bucket is private, so fetch(url) 400s)
          const marker = '/rdo-pdf/';
          const idx = pdfUrl.indexOf(marker);
          const storagePath = idx >= 0 ? pdfUrl.substring(idx + marker.length) : pdfUrl;
          console.log(`Downloading PDF for RDO ${rdo.numero_seq} from storage:`, storagePath);

          const { data: fileData, error: dlError } = await supabase.storage
            .from('rdo-pdf')
            .download(storagePath);

          if (dlError || !fileData) {
            console.error(`Error downloading PDF for RDO ${rdo.numero_seq}:`, dlError?.message);
            errors.push(`RDO #${rdo.numero_seq} (${rdo.data}): Erro ao baixar PDF`);
            continue;
          }

          const pdfBlob = await fileData.arrayBuffer();
          const fileName = `RDO-${String(rdo.numero_seq).padStart(3, '0')}-${rdo.data}.pdf`;
          zip.file(fileName, pdfBlob);
          console.log(`Added ${fileName} to ZIP`);
        }
      } catch (err) {
        console.error(`Error processing RDO ${rdo.numero_seq}:`, err);
        errors.push(`RDO #${rdo.numero_seq} (${rdo.data}): ${err.message || 'Erro desconhecido'}`);
      }
    }

    // Check if we have any files in the ZIP
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return new Response(
        JSON.stringify({ 
          count: 0, 
          message: 'Nenhum PDF pôde ser gerado',
          errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate ZIP file
    console.log(`Generating ZIP with ${fileCount} files`);
    const zipContent = await zip.generateAsync({ type: 'uint8array' });

    // Upload ZIP to storage
    const zipFileName = `batch-${obraId}-${dataInicio}-${dataFim}-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('rdo-pdf')
      .upload(zipFileName, zipContent, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get signed URL (bucket is private)
    const { data: urlData, error: signError } = await supabase.storage
      .from('rdo-pdf')
      .createSignedUrl(zipFileName, 60 * 60);

    if (signError || !urlData) throw signError ?? new Error('Falha ao assinar URL do ZIP');

    console.log('ZIP uploaded successfully:', urlData.signedUrl);

    return new Response(
      JSON.stringify({
        zipUrl: urlData.publicUrl,
        count: fileCount,
        total: rdos.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in batch PDF generation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar PDFs em lote' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
