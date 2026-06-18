import { useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Waves, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CadastroObraStep } from '@/components/dimensionamento/calhas/CadastroObraStep';
import { CadastroObra } from '@/components/dimensionamento/calhas/types';
import { toast } from '@/hooks/use-toast';

type StepId = 'cadastro' | 'dados-projeto' | 'calculo' | 'relatorio';

const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: 'cadastro', label: 'Cadastro da obra', description: 'Identificação do projeto' },
  { id: 'dados-projeto', label: 'Dados do projeto', description: 'Em breve' },
  { id: 'calculo', label: 'Cálculo', description: 'Em breve' },
  { id: 'relatorio', label: 'Relatório', description: 'Em breve' },
];

export default function DimensionamentoCalhas() {
  const [currentStep, setCurrentStep] = useState<StepId>('cadastro');
  const [cadastro, setCadastro] = useState<CadastroObra | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleCadastroSubmit = (values: CadastroObra) => {
    setCadastro(values);
    toast({
      title: 'Cadastro salvo',
      description: 'Pronto para a próxima etapa.',
    });
    // Próxima etapa será habilitada quando definida
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <PageHeader
          title="Dimensionamento de Calhas"
          subtitle="Cálculo conforme ABNT NBR 10844:1989"
        />

        {/* Stepper */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isDone = idx < currentIndex;
            const Icon = isDone ? CheckCircle2 : Circle;
            return (
              <div
                key={step.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isActive && 'border-primary bg-primary/5',
                  isDone && 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive && 'text-primary',
                      isDone && 'text-emerald-600',
                      !isActive && !isDone && 'text-muted-foreground',
                    )}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Etapa {idx + 1}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-rose-600" />
              {STEPS[currentIndex].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 'cadastro' && (
              <CadastroObraStep
                defaultValues={cadastro ?? undefined}
                onSubmit={handleCadastroSubmit}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
