import { useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Waves, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CadastroObraStep } from '@/components/dimensionamento/calhas/CadastroObraStep';
import { ChuvaProjetoStep } from '@/components/dimensionamento/calhas/ChuvaProjetoStep';
import { PanosTelhadoStep } from '@/components/dimensionamento/calhas/PanosTelhadoStep';
import { CalhasStep } from '@/components/dimensionamento/calhas/CalhasStep';
import { CalculoStep } from '@/components/dimensionamento/calhas/CalculoStep';
import { CondutoresVerticaisStep } from '@/components/dimensionamento/calhas/CondutoresVerticaisStep';
import { CadastroObra } from '@/components/dimensionamento/calhas/types';
import { ChuvaProjeto } from '@/components/dimensionamento/calhas/chuvaSchema';
import { PanosForm } from '@/components/dimensionamento/calhas/panoSchema';
import { CalhasForm } from '@/components/dimensionamento/calhas/calhaSchema';
import { toast } from '@/hooks/use-toast';

type StepId = 'cadastro' | 'chuva' | 'panos' | 'calhas' | 'calculo' | 'condutores' | 'relatorio';

const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: 'cadastro', label: 'Cadastro da obra', description: 'Identificação do projeto' },
  { id: 'chuva', label: 'Chuva de projeto', description: 'Intensidade pluviométrica' },
  { id: 'panos', label: 'Panos de telhado', description: 'Áreas de contribuição' },
  { id: 'calhas', label: 'Calhas', description: 'Geometria e descidas' },
  { id: 'calculo', label: 'Cálculo hidráulico', description: 'Manning e capacidade' },
  { id: 'condutores', label: 'Condutores verticais', description: 'Diâmetros por ábaco' },
  { id: 'relatorio', label: 'Relatório', description: 'Em breve' },
];


export default function DimensionamentoCalhas() {
  const [currentStep, setCurrentStep] = useState<StepId>('cadastro');
  const [cadastro, setCadastro] = useState<CadastroObra | null>(null);
  const [chuva, setChuva] = useState<ChuvaProjeto | null>(null);
  const [panos, setPanos] = useState<PanosForm | null>(null);
  const [calhas, setCalhas] = useState<CalhasForm | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goTo = (id: StepId) => setCurrentStep(id);

  const handleCadastroSubmit = (values: CadastroObra) => {
    setCadastro(values);
    toast({ title: 'Cadastro salvo' });
    goTo('chuva');
  };

  const handleChuvaSubmit = (values: ChuvaProjeto) => {
    setChuva(values);
    toast({
      title: 'Chuva de projeto definida',
      description: `${values.intensidade_mm_h} mm/h • TR ${values.tempo_retorno_anos} anos`,
    });
    goTo('panos');
  };

  const handlePanosSubmit = (values: PanosForm) => {
    setPanos(values);
    toast({
      title: 'Panos de telhado cadastrados',
      description: `${values.panos.length} pano(s)`,
    });
    goTo('calhas');
  };

  const handleCalhasSubmit = (values: CalhasForm) => {
    setCalhas(values);
    const totalDescidas = values.calhas.reduce((s, c) => s + c.pontos_descida.length, 0);
    toast({
      title: 'Calhas cadastradas',
      description: `${values.calhas.length} calha(s) • ${totalDescidas} descida(s)`,
    });
    goTo('calculo');
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
            const clickable = idx <= currentIndex || (idx === 1 && cadastro);
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => clickable && goTo(step.id)}
                disabled={!clickable}
                className={cn(
                  'text-left rounded-lg border p-3 transition-colors',
                  isActive && 'border-primary bg-primary/5',
                  isDone && 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20',
                  !clickable && 'opacity-60 cursor-not-allowed',
                  clickable && !isActive && 'hover:bg-accent',
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
              </button>
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
            {currentStep === 'chuva' && (
              <ChuvaProjetoStep
                cidade={cadastro?.cidade ?? ''}
                uf={cadastro?.uf ?? ''}
                defaultValues={chuva ?? undefined}
                onSubmit={handleChuvaSubmit}
                onBack={() => goTo('cadastro')}
              />
            )}
            {currentStep === 'panos' && (
              <PanosTelhadoStep
                defaultValues={panos ?? undefined}
                onSubmit={handlePanosSubmit}
                onBack={() => goTo('chuva')}
              />
            )}
            {currentStep === 'calhas' && (
              <CalhasStep
                defaultValues={calhas ?? undefined}
                onSubmit={handleCalhasSubmit}
                onBack={() => goTo('panos')}
              />
            )}
            {currentStep === 'calculo' && calhas && panos && chuva && (
              <CalculoStep
                calhas={calhas.calhas}
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                onBack={() => goTo('calhas')}
                onConfirm={() => goTo('condutores')}
              />
            )}
            {currentStep === 'condutores' && calhas && panos && chuva && (
              <CondutoresVerticaisStep
                calhas={calhas.calhas}
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                onBack={() => goTo('calculo')}
              />
            )}
          </CardContent>

        </Card>
      </div>
    </SimpleHeader>
  );
}
