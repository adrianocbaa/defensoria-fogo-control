import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';

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
  const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
  const [currentStep, setCurrentStep] = useState(0);

  const {
    formData,
    updateField,
    saveNow,
    conclude,
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AnotacoesStep formData={formData} updateField={updateField} />;
      case 1:
        return <AtividadesStep reportId={formData.id} obraId={obraId!} />;
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
      default:
        return null;
    }
  };

  const statusBadge = STATUS_BADGES[formData.status];

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
            <div className="flex items-center gap-3">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {hasChanges && <span className="text-xs text-muted-foreground">Não salvo</span>}
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="mt-2">
            <h1 className="text-2xl font-bold">RDO {formData.numero_seq ? `Nº ${formData.numero_seq}` : ''}</h1>
            <p className="text-sm text-muted-foreground">Data: {new Date(data).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

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
            <Button variant="outline" onClick={saveNow} disabled={isSaving}>
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
