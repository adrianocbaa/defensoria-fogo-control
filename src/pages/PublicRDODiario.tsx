import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, FileText, Loader2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_BADGES: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  preenchendo: { label: 'Em Andamento', variant: 'default' },
  concluido: { label: 'Concluído', variant: 'default' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  reprovado: { label: 'Reprovado', variant: 'destructive' },
};

export default function PublicRDODiario() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const data = searchParams.get('data') || new Date().toISOString().split('T')[0];
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { formData, isLoading } = useRdoForm(id!, data);

  if (isLoading) {
    return (
      <PublicHeader>
        <div className="container mx-auto p-4 space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      </PublicHeader>
    );
  }

  const handleGeneratePdf = async () => {
    if (!formData.id) {
      toast.error('RDO não encontrado');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      toast.info('Gerando PDF... Aguarde.');

      const { data: pdfData, error: functionError } = await supabase.functions.invoke('generate-rdo-pdf', {
        body: { reportId: formData.id, obraId: id },
      });

      if (functionError) throw functionError;

      // Download PDF
      const link = document.createElement('a');
      link.href = pdfData.pdfUrl;
      link.download = `RDO-${formData.numero_seq}-${data}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('PDF gerado e download iniciado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente mais tarde.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderStep = () => {
    // Renderizar steps em modo somente leitura (sem updateField)
    const readOnlyUpdate = () => {}; // Função vazia para evitar edições
    
    switch (currentStep) {
      case 0:
        return <AnotacoesStep formData={formData} updateField={readOnlyUpdate} />;
      case 1:
        return <AtividadesStep reportId={formData.id} obraId={id!} data={formData.data || new Date().toISOString().split('T')[0]} />;
      case 2:
        return <OcorrenciasStep reportId={formData.id} obraId={id!} />;
      case 3:
        return <VisitasStep reportId={formData.id} obraId={id!} />;
      case 4:
        return <EquipamentosStep reportId={formData.id} obraId={id!} data={data} />;
      case 5:
        return <MaoDeObraStep reportId={formData.id} obraId={id!} />;
      case 6:
        return <EvidenciasStep reportId={formData.id} obraId={id!} data={data} />;
      case 7:
        return <ComentariosStep reportId={formData.id} obraId={id!} />;
      case 8:
        return <AssinaturasStep reportId={formData.id} obraId={id!} reportData={formData} onUpdate={() => {}} />;
      default:
        return null;
    }
  };

  const statusBadge = STATUS_BADGES[formData.status];

  return (
    <PublicHeader>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/public/obras/${id}/rdo`}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">RDO {formData.numero_seq ? `Nº ${formData.numero_seq}` : ''}</h1>
                  <p className="text-sm text-muted-foreground">
                    Data: {format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                {/* Botão para baixar PDF */}
                {(formData.status === 'concluido' || formData.status === 'aprovado') && (
                  <Button variant="default" size="sm" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                    <FileText className="h-4 w-4 mr-2" />
                    {isGeneratingPdf ? 'Gerando...' : 'Exportar PDF'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <RdoStepper currentStep={currentStep} onStepChange={setCurrentStep} steps={STEPS} />

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {formData.id ? (
            renderStep()
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Nenhum RDO encontrado para esta data.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer com navegação */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-10">
          <div className="container mx-auto flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} de {STEPS.length}
            </span>

            <Button
              variant="outline"
              onClick={() => currentStep < STEPS.length - 1 && setCurrentStep(currentStep + 1)}
              disabled={currentStep === STEPS.length - 1}
            >
              Próximo
              <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </PublicHeader>
  );
}
