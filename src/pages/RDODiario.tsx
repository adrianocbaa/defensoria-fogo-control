import { useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { STEPS } from '@/components/rdo/RdoStepper';
import { RdoFormHeader } from '@/components/rdo/form/RdoFormHeader';
import { RdoFormStepper, type StepMeta } from '@/components/rdo/form/RdoFormStepper';
import { RdoFormSummary } from '@/components/rdo/form/RdoFormSummary';
import { RdoFormFooterBar, type SaveState } from '@/components/rdo/form/RdoFormFooterBar';
import { useRdoStepCounts } from '@/components/rdo/form/useRdoStepCounts';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { useRdoForm } from '@/hooks/useRdoForm';
import { AnotacoesStep } from '@/components/rdo/steps/AnotacoesStep';
import { AtividadesStep } from '@/components/rdo/steps/AtividadesStep';
import { OcorrenciasStep } from '@/components/rdo/steps/OcorrenciasStep';
import { VisitasStep } from '@/components/rdo/steps/VisitasStep';
import { EquipamentosStep } from '@/components/rdo/steps/EquipamentosStep';
import { MaoDeObraStep } from '@/components/rdo/steps/MaoDeObraStep';
import { EvidenciasStep } from '@/components/rdo/steps/EvidenciasStep';
import { AssinaturasStep } from '@/components/rdo/steps/AssinaturasStep';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanEditObra } from '@/hooks/useCanEditObra';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_MAP: Record<string, { label: string; tone: 'draft' | 'progress' | 'done' | 'warn' }> = {
  rascunho: { label: 'Rascunho', tone: 'draft' },
  preenchendo: { label: 'Preenchendo', tone: 'progress' },
  concluido: { label: 'Concluído', tone: 'done' },
  aprovado: { label: 'Aprovado', tone: 'done' },
  reprovado: { label: 'Reprovado', tone: 'warn' },
};

const CLIMA_ICON: Record<string, string> = {
  claro: '☀️',
  nublado: '☁️',
  chuvoso: '🌧️',
};

function formatDatePtBr(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

export default function RDODiario() {
  const { obraId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEditRDO, isAdmin, isContratada } = useUserRole();
  const { canEditObra, loading: permissionLoading } = useCanEditObra(obraId);
  const queryClient = useQueryClient();

  const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
  const initialStep = parseInt(searchParams.get('step') || '0', 10);
  const [currentStep, setCurrentStep] = useState(Math.max(0, Math.min(initialStep, 7)));
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [reopenDialog, setReopenDialog] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Buscar obra: status, nome, município, fiscal
  const { data: obraData, isLoading: obraLoading } = useQuery({
    queryKey: ['obra-rdo-context', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, municipio, status, fiscal_id')
        .eq('id', obraId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!obraId,
  });

  const { data: fiscalProfile } = useQuery({
    queryKey: ['profile-min', obraData?.fiscal_id],
    enabled: !!obraData?.fiscal_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', obraData!.fiscal_id!)
        .maybeSingle();
      return data;
    },
  });

  const obraConcluida = obraData?.status === 'concluida';

  const canEdit = obraConcluida ? false : (isAdmin || isContratada ? canEditRDO : canEditObra);
  const readOnly = !canEdit;

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

  const { data: counts } = useRdoStepCounts(formData.id);

  const handleStepChange = useCallback(async (step: number) => {
    if ((window as any).rdoSavePending) {
      try { await (window as any).rdoSavePending(); } catch {}
    }
    setCurrentStep(step);
  }, []);

  const handleGeneratePdf = async () => {
    if (!formData.id) {
      toast.error('Salve o RDO antes de gerar o PDF');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      toast.info('Gerando PDF... Aguarde.');
      await queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
      await queryClient.invalidateQueries({ queryKey: ['rdo-activities-planilha', formData.id] });
      await queryClient.invalidateQueries({ queryKey: ['rdo-activities-acumulado', obraId] });
      await new Promise((r) => setTimeout(r, 500));
      const { data: pdfData, error } = await supabase.functions.invoke('generate-rdo-pdf', {
        body: { reportId: formData.id, obraId: obraId },
      });
      if (error) throw error;
      await createAuditLog({
        obraId: obraId!,
        reportId: formData.id,
        acao: 'GERAR_PDF',
        detalhes: { url: pdfData.pdfUrl },
        actorId: user?.id,
      });
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
      } catch {
        window.open(pdfData.pdfUrl, '_blank');
        toast.success('PDF gerado! Abrindo em nova aba...');
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
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

  const loadingShell = isLoading || permissionLoading || obraLoading;


  // Estados derivados de status (preservam lógica atual)
  const isApproved = formData.status === 'aprovado';
  const isConcluded = formData.status === 'concluido';
  const fiscalSigned = !!formData.assinatura_fiscal_validado_em;
  const hasValidatedSignature = !!(formData.assinatura_fiscal_validado_em || formData.assinatura_contratada_validado_em);
  const bothSignaturesValidated = !!(formData.assinatura_fiscal_validado_em && formData.assinatura_contratada_validado_em);
  const isLocked = isApproved || isConcluded;
  const userHasConcluded = isContratada ? !!formData.contratada_concluido_em : !!formData.fiscal_concluido_em;
  const otherPartyConcluded = isContratada ? !!formData.fiscal_concluido_em : !!formData.contratada_concluido_em;
  const readyForApproval = (bothSignaturesValidated || isConcluded) && !isApproved;

  // Navegação entre RDOs (dias)
  const [year, month, day] = data.split('-').map(Number);
  const currentDate = new Date(year, month - 1, day);
  const previousDate = new Date(year, month - 1, day - 1);
  const nextDate = new Date(year, month - 1, day + 1);
  const navigateToDate = (newDate: Date) => {
    const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    navigate(`/obras/${obraId}/rdo/diario?data=${dateStr}`);
  };

  const climaResumido = useMemo(() => {
    const parts = [
      formData.clima_manha ? `Manhã ${CLIMA_ICON[formData.clima_manha] ?? ''}` : null,
      formData.clima_tarde ? `Tarde ${CLIMA_ICON[formData.clima_tarde] ?? ''}` : null,
      formData.clima_noite ? `Noite ${CLIMA_ICON[formData.clima_noite] ?? ''}` : null,
    ].filter(Boolean) as string[];
    return parts.length ? parts.join(' · ') : undefined;
  }, [formData.clima_manha, formData.clima_tarde, formData.clima_noite]);

  // Meta dos steps: derivada só das validações reais
  const stepMeta: StepMeta[] = useMemo(() => {
    const anotacoesOk = !!(formData.clima_manha && formData.cond_manha);
    const c = counts ?? {
      atividades: 0,
      ocorrencias: 0,
      visitas: 0,
      equipamentos: 0,
      maoDeObra: 0,
      fotos: 0,
      fotosSemDescricao: 0,
    };
    const evidStatus: StepMeta['status'] = c.fotosSemDescricao > 0 ? 'warn' : c.fotos > 0 ? 'done' : 'idle';
    const evidDetail =
      c.fotosSemDescricao > 0
        ? `${c.fotosSemDescricao} sem descrição`
        : c.fotos > 0
        ? `${c.fotos} fotos`
        : 'Sem fotos';
    const assinStatus: StepMeta['status'] = bothSignaturesValidated
      ? 'done'
      : hasValidatedSignature
      ? 'active'
      : 'warn';
    const assinDetail = bothSignaturesValidated
      ? 'Validadas'
      : hasValidatedSignature
      ? '1 pendente'
      : 'Pendentes';

    return [
      { status: anotacoesOk ? 'done' : 'warn', detail: anotacoesOk ? 'Preenchido' : 'Pendente' },
      { status: c.atividades > 0 ? 'done' : 'idle', detail: c.atividades > 0 ? `${c.atividades} registradas` : 'Nenhuma' },
      { status: c.ocorrencias > 0 ? 'active' : 'idle', detail: c.ocorrencias > 0 ? `${c.ocorrencias} registrada${c.ocorrencias > 1 ? 's' : ''}` : 'Nenhuma' },
      { status: c.visitas > 0 ? 'done' : 'idle', detail: c.visitas > 0 ? `${c.visitas} registrada${c.visitas > 1 ? 's' : ''}` : 'Nenhuma' },
      { status: c.equipamentos > 0 ? 'done' : 'idle', detail: c.equipamentos > 0 ? `${c.equipamentos} registrado${c.equipamentos > 1 ? 's' : ''}` : 'Nenhum' },
      { status: c.maoDeObra > 0 ? 'done' : 'idle', detail: c.maoDeObra > 0 ? `${c.maoDeObra} pessoa${c.maoDeObra > 1 ? 's' : ''}` : 'Nenhuma' },
      { status: evidStatus, detail: evidDetail },
      { status: assinStatus, detail: assinDetail },
    ].map((m, i) => ({
      ...m,
      status: i === currentStep && m.status !== 'warn' && m.status !== 'done' ? 'active' : m.status,
    })) as StepMeta[];
  }, [counts, formData.clima_manha, formData.cond_manha, hasValidatedSignature, bothSignaturesValidated, currentStep]);

  // Pendências derivadas
  const pendencias = useMemo(() => {
    const list: string[] = [];
    if (!formData.clima_manha || !formData.cond_manha) list.push('Preencher clima e condição da manhã');
    if (counts && counts.fotosSemDescricao > 0) {
      list.push(`${counts.fotosSemDescricao} foto(s) sem descrição em Evidências`);
    }
    if (!hasValidatedSignature) list.push('Assinatura pendente');
    return list;
  }, [formData.clima_manha, formData.cond_manha, counts, hasValidatedSignature]);

  // Progresso geral: média ponderada simples do statusMeta done
  const progressPct = useMemo(() => {
    const done = stepMeta.filter((m) => m.status === 'done').length;
    return (done / stepMeta.length) * 100;
  }, [stepMeta]);

  // Estado de salvamento
  const saveState: SaveState = isSaving ? 'saving' : hasChanges ? 'dirty' : formData.id ? 'saved' : 'idle';

  const statusInfo = STATUS_MAP[formData.status] ?? STATUS_MAP.rascunho;

  // Ações do kebab de acordo com as permissões atuais
  const showPdfAction =
    !!formData.id &&
    (readyForApproval || isApproved || (canEdit && userHasConcluded) || (isContratada && (bothSignaturesValidated || isApproved)));
  const showReopenAction =
    !!formData.id && (isApproved || isConcluded) && (isAdmin || (canEditObra && !obraConcluida));
  const showDeleteAction =
    !!formData.id && !obraConcluida && (!isApproved || isAdmin) && !hasValidatedSignature && (canEdit || isAdmin);

  const ensureOrWarn = readOnly
    ? async () => {
        toast.error('Acesso somente de visualização: não é possível criar/editar RDO.');
        return null;
      }
    : ensureRdoExists;

  const disabled = isLocked || readOnly;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AnotacoesStep formData={formData} updateField={updateField} disabled={disabled} />;
      case 1:
        return <AtividadesStep reportId={formData.id} obraId={obraId!} data={data} disabled={disabled} ensureRdoExists={ensureOrWarn} />;
      case 2:
        return <OcorrenciasStep reportId={formData.id} obraId={obraId!} disabled={disabled} />;
      case 3:
        return <VisitasStep reportId={formData.id} obraId={obraId!} disabled={disabled} />;
      case 4:
        return <EquipamentosStep reportId={formData.id} obraId={obraId!} data={data} disabled={disabled} />;
      case 5:
        return <MaoDeObraStep reportId={formData.id} obraId={obraId!} disabled={disabled} />;
      case 6:
        return <EvidenciasStep reportId={formData.id} obraId={obraId!} data={data} disabled={disabled} />;
      case 7:
        return (
          <AssinaturasStep
            reportId={formData.id}
            obraId={obraId!}
            reportData={formData}
            readOnly={readOnly}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] })}
          />
        );
      default:
        return null;
    }
  };

  const nextLabel =
    currentStep < STEPS.length - 1 ? `Próximo: ${STEPS[currentStep + 1].label}` : undefined;

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <>
          <RdoFormHeader
            obraId={obraId!}
            obraNome={obraData?.nome}
            obraMunicipio={obraData?.municipio}
            numeroSeq={formData.numero_seq}
            dataFormatada={formatDatePtBr(data)}
            statusLabel={statusInfo.label}
            statusTone={statusInfo.tone}
            onOpenMobileMenu={openMenu}
            onBack={() => navigate(`/obras/${obraId}/rdo/resumo`)}
            onPrev={() => navigateToDate(previousDate)}
            onNext={() => navigateToDate(nextDate)}
            onGeneratePdf={showPdfAction ? handleGeneratePdf : undefined}
            onReopen={showReopenAction ? () => setReopenDialog(true) : undefined}
            onDelete={showDeleteAction ? () => setDeleteDialog(true) : undefined}
            isGeneratingPdf={isGeneratingPdf}
          />
          <RdoFormStepper currentStep={currentStep} onStepChange={handleStepChange} meta={stepMeta} />
        </>
      )}
    >
      {/* Diálogos */}
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

      <AlertDialog open={reopenDialog} onOpenChange={setReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir RDO</AlertDialogTitle>
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

      {/* Layout central + painel lateral */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          {readOnly && (
            <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 p-3 text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <span>ℹ️</span>
              <span>Modo somente leitura. Para editar, solicite permissão.</span>
            </div>
          )}
          {obraConcluida && (
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 p-3 flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Obra concluída — RDO disponível apenas para consulta.</span>
            </div>
          )}

          {!isLocked && userHasConcluded && (
            <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 border-blue-200 p-3 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {otherPartyConcluded ? (
                <span>Ambas as partes concluíram. Aguardando aprovação final.</span>
              ) : (
                <span>Você concluiu. Aguardando conclusão {isContratada ? 'do Fiscal' : 'da Contratada'}.</span>
              )}
            </div>
          )}

          <div>{renderStep()}</div>
        </div>

        <RdoFormSummary
          progressPct={progressPct}
          dataFormatada={formatDatePtBr(data)}
          fiscalNome={fiscalProfile?.display_name ?? undefined}
          climaResumido={climaResumido}
          meta={stepMeta}
          pendencias={pendencias}
        />
      </div>

      {/* Footer com estado de salvamento e navegação */}
      <RdoFormFooterBar
        saveState={saveState}
        isFirst={currentStep === 0}
        isLast={currentStep === STEPS.length - 1}
        showPrimarySave={!isContratada && !isLocked && !readOnly && !userHasConcluded}
        showConclude={!isContratada && !isLocked && !readOnly && !userHasConcluded}
        onPrev={() => currentStep > 0 && handleStepChange(currentStep - 1)}
        onNext={() => currentStep < STEPS.length - 1 && handleStepChange(currentStep + 1)}
        onSave={async () => {
          (document.activeElement as HTMLElement | null)?.blur();
          if ((window as any).rdoSavePending) {
            try { await (window as any).rdoSavePending(); } catch {}
          }
          await saveNow();
        }}
        onConclude={async () => {
          (document.activeElement as HTMLElement | null)?.blur();
          if ((window as any).rdoSavePending) {
            try { await (window as any).rdoSavePending(); } catch {}
          }
          await conclude();
        }}
        nextLabel={nextLabel}
        hidden={isLocked && !readOnly ? false : undefined}
      />
    </ObrasLayout>
  );
}
