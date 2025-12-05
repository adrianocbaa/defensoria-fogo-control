import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, Loader2, CheckCircle2, FileText, Trash2, RotateCcw } from 'lucide-react';
import { RdoStepper, STEPS } from '@/components/rdo/RdoStepper';
import { useRdoForm } from '@/hooks/useRdoForm';
import { AnotacoesStep } from '@/components/rdo/steps/AnotacoesStep';
import { AtividadesStep } from '@/components/rdo/steps/AtividadesStep';
import { OcorrenciasStep } from '@/components/rdo/steps/OcorrenciasStep';
import { VisitasStep } from '@/components/rdo/steps/VisitasStep';
import { EquipamentosStep } from '@/components/rdo/steps/EquipamentosStep';
import { MaoDeObraStep } from '@/components/rdo/steps/MaoDeObraStep';
import { EvidenciasStep } from '@/components/rdo/steps/EvidenciasStep';
import { AssinaturasStep } from '@/components/rdo/steps/AssinaturasStep';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAuditLog } from '@/hooks/useRdoAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

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
  const { canEdit, isAdmin, isContratada } = useUserRole();
  const queryClient = useQueryClient();
  const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
  const initialStep = parseInt(searchParams.get('step') || '0', 10);
  const [currentStep, setCurrentStep] = useState(Math.max(0, Math.min(initialStep, 7)));
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [reopenDialog, setReopenDialog] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const {
    formData,
    updateField,
    saveNow,
    conclude,
    reopen,
    deleteRdo,
    ensureRdoExists,
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

      // Invalidar todas as queries relacionadas para garantir dados frescos
      await queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
      await queryClient.invalidateQueries({ queryKey: ['rdo-activities-planilha', formData.id] });
      await queryClient.invalidateQueries({ queryKey: ['rdo-activities-acumulado', obraId] });
      
      // Aguardar um momento para garantir que o Supabase tenha os dados atualizados
      await new Promise(resolve => setTimeout(resolve, 500));

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

      // Usar fetch para baixar o PDF e evitar bloqueios de navegador
      try {
        const response = await fetch(pdfData.pdfUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RDO-${formData.numero_seq}-${data}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
        toast.success('PDF gerado e download iniciado!');
      } catch (downloadError) {
        console.error('Erro ao baixar PDF, tentando abrir em nova aba:', downloadError);
        // Fallback: abrir em nova aba
        window.open(pdfData.pdfUrl, '_blank');
        toast.success('PDF gerado! Abrindo em nova aba...');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Verifique os logs.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDeleteRdo = async () => {
    const success = await deleteRdo();
    if (success) {
      setDeleteDialog(false);
      navigate(`/obras/${obraId}/rdo/resumo`);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AnotacoesStep formData={formData} updateField={updateField} disabled={isLocked} />;
      case 1:
        return <AtividadesStep reportId={formData.id} obraId={obraId!} data={data} disabled={isLocked} ensureRdoExists={ensureRdoExists} />;
      case 2:
        return <OcorrenciasStep reportId={formData.id} obraId={obraId!} disabled={isLocked} />;
      case 3:
        return <VisitasStep reportId={formData.id} obraId={obraId!} disabled={isLocked} />;
      case 4:
        return <EquipamentosStep reportId={formData.id} obraId={obraId!} data={data} disabled={isLocked} />;
      case 5:
        return <MaoDeObraStep reportId={formData.id} obraId={obraId!} disabled={isLocked} />;
      case 6:
        return <EvidenciasStep reportId={formData.id} obraId={obraId!} data={data} disabled={isLocked} />;
      case 7:
        return <AssinaturasStep reportId={formData.id} obraId={obraId!} reportData={formData} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] })} />;
      default:
        return null;
    }
  };

  const statusBadge = STATUS_BADGES[formData.status];
  const isApproved = formData.status === 'aprovado';
  const isConcluded = formData.status === 'concluido';
  const hasSignatures = formData.assinatura_fiscal_url || formData.assinatura_contratada_url;
  
  // Bloquear RDO se qualquer assinatura foi validada, aprovado ou concluído
  const hasValidatedSignature = !!(formData.assinatura_fiscal_validado_em || formData.assinatura_contratada_validado_em);
  const bothSignaturesValidated = !!(formData.assinatura_fiscal_validado_em && formData.assinatura_contratada_validado_em);
  const isLocked = hasValidatedSignature || isApproved || isConcluded;
  
  // Verificar se usuário atual já concluiu
  const userHasConcluded = isContratada 
    ? !!formData.contratada_concluido_em 
    : !!formData.fiscal_concluido_em;
  const otherPartyConcluded = isContratada
    ? !!formData.fiscal_concluido_em
    : !!formData.contratada_concluido_em;
  const bothConcluded = !!formData.fiscal_concluido_em && !!formData.contratada_concluido_em;
  
  // Pronto para aprovação: ambas assinaturas validadas OU status concluído
  const readyForApproval = (bothSignaturesValidated || isConcluded) && !isApproved;

  // Navegação entre dias - usar parseISO para evitar problemas de timezone
  const [year, month, day] = data.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);
  const previousDate = new Date(year, month - 1, day - 1);
  const nextDate = new Date(year, month - 1, day + 1);

  const navigateToDate = (newDate: Date) => {
    const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}`);
  };

  return (
    <SimpleHeader>
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
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">RDO {formData.numero_seq ? `Nº ${formData.numero_seq}` : ''}</h1>
                  <p className="text-sm text-muted-foreground">Data: {currentDate.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateToDate(previousDate)}
                    title="Dia anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateToDate(nextDate)}
                    title="Próximo dia"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {((readyForApproval || isApproved) || (canEdit && userHasConcluded) || (isContratada && userHasConcluded)) && (
                  <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                    <FileText className="h-4 w-4 mr-2" />
                    {isGeneratingPdf ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
                )}
                {/* Botão Reabrir - apenas para admin quando RDO aprovado */}
                {isAdmin && isApproved && formData.id && (
                  <Button variant="outline" size="sm" onClick={() => setReopenDialog(true)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reabrir RDO
                  </Button>
                )}
                {/* RDOs aprovados só podem ser excluídos por admin */}
                {formData.id && (!isApproved || isAdmin) && !hasValidatedSignature && (canEdit || isAdmin) && (
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir RDO
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este RDO? Esta ação não pode ser desfeita e todas as informações cadastradas no RDO (atividades, fotos, comentários, etc.) serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRdo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Dialog */}
      <AlertDialog open={reopenDialog} onOpenChange={setReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir RDO Aprovado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reabrir este RDO? As assinaturas de ambas as partes serão invalidadas e novas assinaturas serão necessárias após a correção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await reopen();
                setReopenDialog(false);
                queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
              }}
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stepper */}
      <RdoStepper currentStep={currentStep} onStepChange={setCurrentStep} steps={STEPS} />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {renderStep()}
      </div>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-10">
        <div className="container mx-auto flex items-center justify-between gap-2">
          {isLocked && hasValidatedSignature && (
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              🔒 RDO bloqueado: Assinatura validada
            </div>
          )}
          
          {/* Mostrar status de conclusão quando usuário já concluiu */}
          {!isLocked && userHasConcluded && (
            <div className="flex-1 text-center">
              <div className="inline-flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                {otherPartyConcluded ? (
                  <span>Ambas as partes concluíram. Aguardando aprovação final.</span>
                ) : (
                  <span>✓ Você concluiu. Aguardando conclusão {isContratada ? 'do Fiscal' : 'da Contratada'}.</span>
                )}
              </div>
            </div>
          )}
          
          {!isLocked && !userHasConcluded && (
            <>
              <Button
                variant="outline"
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <div className="flex gap-2">
                {/* Salvar e Concluir apenas para Fiscal - Contratada tem autosave e conclui via assinatura */}
                {!isContratada && (
                  <>
                    <Button variant="outline" onClick={async () => {
                      (document.activeElement as HTMLElement | null)?.blur();
                      if ((window as any).rdoSavePending) {
                        try { await (window as any).rdoSavePending(); } catch {}
                      }
                      await saveNow();
                    }} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>

                    {currentStep === STEPS.length - 1 && (
                      <Button onClick={conclude} disabled={isSaving}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Concluir
                      </Button>
                    )}
                  </>
                )}

                {currentStep < STEPS.length - 1 && (
                  <Button onClick={() => setCurrentStep(currentStep + 1)}>
                    Próximo
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </SimpleHeader>
  );
}
