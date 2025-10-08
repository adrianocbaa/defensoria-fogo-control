import { SignatureCanvas } from '../SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createAuditLog } from '@/hooks/useRdoAuditLog';

interface AssinaturasStepProps {
  reportId: string;
  obraId: string;
  reportData: any;
  onUpdate: () => void;
}

export function AssinaturasStep({ reportId, obraId, reportData, onUpdate }: AssinaturasStepProps) {
  const { user } = useAuth();

  const handleSaveFiscalSignature = async (signatureData: {
    dataUrl: string;
    nome: string;
    cargo: string;
    documento: string;
  }) => {
    try {
      // Convert dataURL to blob
      const response = await fetch(signatureData.dataUrl);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${obraId}/${reportId}/fiscal.png`;
      const { error: uploadError, data } = await supabase.storage
        .from('rdo-signatures')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rdo-signatures')
        .getPublicUrl(fileName);

      // Update report with signature data
      const { error: updateError } = await supabase
        .from('rdo_reports')
        .update({
          assinatura_fiscal_url: publicUrl,
          assinatura_fiscal_nome: signatureData.nome,
          assinatura_fiscal_cargo: signatureData.cargo,
          assinatura_fiscal_documento: signatureData.documento,
          assinatura_fiscal_datetime: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Create audit log
      await createAuditLog({
        obraId,
        reportId,
        acao: 'ASSINAR_FISCAL',
        detalhes: {
          nome: signatureData.nome,
          cargo: signatureData.cargo,
          documento: signatureData.documento,
        },
        actorId: user?.id,
        actorNome: signatureData.nome,
      });

      toast.success('Assinatura do fiscal salva com sucesso');
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar assinatura do fiscal:', error);
      toast.error('Erro ao salvar assinatura');
      throw error;
    }
  };

  const handleSaveContratadaSignature = async (signatureData: {
    dataUrl: string;
    nome: string;
    cargo: string;
    documento: string;
  }) => {
    try {
      // Convert dataURL to blob
      const response = await fetch(signatureData.dataUrl);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${obraId}/${reportId}/contratada.png`;
      const { error: uploadError } = await supabase.storage
        .from('rdo-signatures')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rdo-signatures')
        .getPublicUrl(fileName);

      // Update report with signature data
      const { error: updateError } = await supabase
        .from('rdo_reports')
        .update({
          assinatura_contratada_url: publicUrl,
          assinatura_contratada_nome: signatureData.nome,
          assinatura_contratada_cargo: signatureData.cargo,
          assinatura_contratada_documento: signatureData.documento,
          assinatura_contratada_datetime: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Create audit log
      await createAuditLog({
        obraId,
        reportId,
        acao: 'ASSINAR_CONTRATADA',
        detalhes: {
          nome: signatureData.nome,
          cargo: signatureData.cargo,
          documento: signatureData.documento,
        },
        actorId: user?.id,
        actorNome: signatureData.nome,
      });

      toast.success('Assinatura da contratada salva com sucesso');
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar assinatura da contratada:', error);
      toast.error('Erro ao salvar assinatura');
      throw error;
    }
  };

  const fiscalSignature = reportData?.assinatura_fiscal_url ? {
    url: reportData.assinatura_fiscal_url,
    nome: reportData.assinatura_fiscal_nome,
    cargo: reportData.assinatura_fiscal_cargo,
    documento: reportData.assinatura_fiscal_documento,
    datetime: reportData.assinatura_fiscal_datetime,
  } : null;

  const contratadaSignature = reportData?.assinatura_contratada_url ? {
    url: reportData.assinatura_contratada_url,
    nome: reportData.assinatura_contratada_nome,
    cargo: reportData.assinatura_contratada_cargo,
    documento: reportData.assinatura_contratada_documento,
    datetime: reportData.assinatura_contratada_datetime,
  } : null;

  const isApproved = reportData?.status === 'aprovado';

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold mb-2">Assinaturas</h2>
        <p className="text-sm text-muted-foreground">
          Colete as assinaturas digitais do fiscal/gestor e do responsável da contratada
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SignatureCanvas
          title="Assinatura do Fiscal/Gestor (DPE-MT)"
          onSave={handleSaveFiscalSignature}
          existingSignature={fiscalSignature}
          disabled={isApproved}
        />

        <SignatureCanvas
          title="Assinatura do Responsável Técnico (Contratada)"
          onSave={handleSaveContratadaSignature}
          existingSignature={contratadaSignature}
          disabled={isApproved}
        />
      </div>

      {isApproved && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ RDO aprovado. As assinaturas não podem mais ser alteradas.
          </p>
        </div>
      )}
    </div>
  );
}
