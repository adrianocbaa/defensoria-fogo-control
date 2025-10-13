import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Save, Loader2, CheckCircle2, Send, ThumbsUp, ThumbsDown, FileText, Unlock } from 'lucide-react';
import { RdoStepper, STEPS } from '@/components/rdo/RdoStepper';
import { useRdoForm } from '@/hooks/useRdoForm';
import { AnotacoesStep } from '@/components/rdo/steps/AnotacoesStep';
import { AtividadesStep } from '@/components/rdo/steps/AtividadesStep';
import { OcorrenciasStep } from '@/components/rdo/steps/OcorrenciasStep';
import { VisitasStep } from '@/components/rdo/steps/VisitasStep';
import { EquipamentosStep } from '@/components/rdo/steps/EquipamentosStep';
import { MaoDeObraStep } from '@/components/rdo/steps/MaoDeObraStep';
import { EvidenciasStep } from '@/components/rdo/steps/EvidenciasStep';
import { ComentariosStep } from '@/components/rdo/steps/ComentariosStep';
import { AssinaturasStep } from '@/components/rdo/steps/AssinaturasStep';
import { RdoApprovalDialog } from '@/components/rdo/RdoApprovalDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAuditLog } from '@/hooks/useRdoAuditLog';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_BADGES: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  preenchendo: { label: 'Preenchendo', variant: 'default' },
  concluido: { label: 'Concluído', variant: 'default' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  reprovado: { label: 'Reprovado', variant: 'destructive' },
};

export default function RDODiario() {
  const { obraId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
  const [currentStep, setCurrentStep] = useState(0);
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; action: 'approve' | 'reject' | null }>({
    open: false,
    action: null,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const {
    formData,
    updateField,
    saveNow,
    conclude,
    sendForApproval,
    approve,
    reject,
    reopen,
    isLoading,
    isSaving,
    hasChanges,
  } = useRdoForm(obraId!, data);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const handleGeneratePdf = async () => {
    if (!formData.id) {
      toast.error('Salve o RDO antes de gerar o PDF');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      toast.info('Gerando PDF... Aguarde.');

      // Call edge function to generate PDF
      const { data: pdfData, error: functionError } = await supabase.functions.invoke('generate-rdo-pdf', {
        body: { reportId: formData.id, obraId: obraId },
      });

      if (functionError) throw functionError;

      await createAuditLog({
        obraId: obraId!,
        reportId: formData.id,
        acao: 'GERAR_PDF',
        detalhes: { url: pdfData.pdfUrl },
        actorId: user?.id,
      });

      // Download PDF automatically
      const link = document.createElement('a');
      link.href = pdfData.pdfUrl;
      link.download = `RDO-${formData.numero_seq}-${data}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
      toast.success('PDF gerado e download iniciado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Verifique os logs.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleApprovalConfirm = async (observacao?: string) => {
    try {
      if (approvalDialog.action === 'approve') {
        await approve(observacao);
        await createAuditLog({
          obraId: obraId!,
          reportId: formData.id!,
          acao: 'APROVAR',
          detalhes: { observacao },
          actorId: user?.id,
        });
      } else if (approvalDialog.action === 'reject') {
        await reject(observacao!);
        await createAuditLog({
          obraId: obraId!,
          reportId: formData.id!,
          acao: 'REPROVAR',
          detalhes: { observacao },
          actorId: user?.id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
    }
  };

  const handleSendForApproval = async () => {
    await sendForApproval();
    await createAuditLog({
      obraId: obraId!,
      reportId: formData.id!,
      acao: 'ENVIAR_APROVACAO',
      actorId: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
  };

  const handleReopen = async () => {
    await reopen();
    await createAuditLog({
      obraId: obraId!,
      reportId: formData.id!,
      acao: 'REABRIR',
      actorId: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AnotacoesStep formData={formData} updateField={updateField} />;
      case 1:
        return <AtividadesStep reportId={formData.id} obraId={obraId!} data={data} />;
      case 2:
        return <OcorrenciasStep reportId={formData.id} obraId={obraId!} />;
      case 3:
        return <VisitasStep reportId={formData.id} obraId={obraId!} />;
      case 4:
        return <EquipamentosStep reportId={formData.id} obraId={obraId!} data={data} />;
      case 5:
        return <MaoDeObraStep reportId={formData.id} obraId={obraId!} />;
      case 6:
        return <EvidenciasStep reportId={formData.id} obraId={obraId!} data={data} />;
      case 7:
        return <ComentariosStep reportId={formData.id} obraId={obraId!} />;
      case 8:
        return <AssinaturasStep reportId={formData.id} obraId={obraId!} reportData={formData} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] })} />;
      default:
        return null;
    }
  };

  const statusBadge = STATUS_BADGES[formData.status];
  const isApproved = formData.status === 'aprovado';
  const isConcluded = formData.status === 'concluido';
  const hasSignatures = formData.assinatura_fiscal_url || formData.assinatura_contratada_url;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}/rdo/resumo`)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {hasChanges && <span className="text-xs text-muted-foreground">Não salvo</span>}
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">RDO {formData.numero_seq ? `Nº ${formData.numero_seq}` : ''}</h1>
                <p className="text-sm text-muted-foreground">Data: {new Date(data).toLocaleDateString('pt-BR')}</p>
              </div>
              {/* Action buttons */}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {isConcluded && !isApproved && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleSendForApproval}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Aprovação
                      </Button>
                      <Button variant="default" size="sm" onClick={() => setApprovalDialog({ open: true, action: 'approve' })}>
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setApprovalDialog({ open: true, action: 'reject' })}>
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                    </>
                  )}
                  {(isConcluded || isApproved) && (
                    <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                      <FileText className="h-4 w-4 mr-2" />
                      {isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}
                    </Button>
                  )}
                  {canEdit && isApproved && (
                    <Button variant="outline" size="sm" onClick={handleReopen}>
                      <Unlock className="h-4 w-4 mr-2" />
                      Reabrir
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <RdoApprovalDialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog({ ...approvalDialog, open })}
        action={approvalDialog.action}
        onConfirm={handleApprovalConfirm}
      />

      {/* Stepper */}
      <RdoStepper currentStep={currentStep} onStepChange={setCurrentStep} steps={STEPS} />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {renderStep()}
      </div>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-10">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { window.dispatchEvent(new Event('rdo-save')); saveNow(); }} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button onClick={conclude} disabled={isSaving}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
