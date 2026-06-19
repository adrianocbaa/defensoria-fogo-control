import { useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Waves, CheckCircle2, Circle, Search, Sparkles, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CadastroObraStep } from '@/components/dimensionamento/calhas/CadastroObraStep';
import { ChuvaProjetoStep } from '@/components/dimensionamento/calhas/ChuvaProjetoStep';
import { PanosTelhadoStep } from '@/components/dimensionamento/calhas/PanosTelhadoStep';
import { CalhasStep } from '@/components/dimensionamento/calhas/CalhasStep';
import { CalculoStep } from '@/components/dimensionamento/calhas/CalculoStep';
import { CondutoresVerticaisStep } from '@/components/dimensionamento/calhas/CondutoresVerticaisStep';
import { ResultadosStep } from '@/components/dimensionamento/calhas/ResultadosStep';
import { RelatorioStep } from '@/components/dimensionamento/calhas/RelatorioStep';
import { ProjetosManager } from '@/components/dimensionamento/calhas/ProjetosManager';
import { BibliotecaCalhasManager } from '@/components/dimensionamento/calhas/BibliotecaCalhasManager';
import {
  ParametrosAutomaticoStep,
  type ParametrosAutomaticoForm,
} from '@/components/dimensionamento/calhas/ParametrosAutomaticoStep';
import { DimensionamentoAutomaticoStep } from '@/components/dimensionamento/calhas/DimensionamentoAutomaticoStep';
import { CadastroObra } from '@/components/dimensionamento/calhas/types';
import { ChuvaProjeto } from '@/components/dimensionamento/calhas/chuvaSchema';
import { PanosForm } from '@/components/dimensionamento/calhas/panoSchema';
import { CalhasForm } from '@/components/dimensionamento/calhas/calhaSchema';
import type { ProjetoCalhas } from '@/lib/projetoCalhasStorage';
import type { ResultadoAutomatico } from '@/lib/dimensionamentoAutomatico';
import { gerarMemorialAutomaticoPDF } from '@/lib/memorialCalhas';
import { toast } from '@/hooks/use-toast';

type Modo = 'verificacao' | 'automatico';

type StepVerif =
  | 'cadastro' | 'chuva' | 'panos' | 'calhas'
  | 'calculo' | 'condutores' | 'resultados' | 'relatorio';

type StepAuto =
  | 'cadastro' | 'chuva' | 'panos' | 'parametros'
  | 'automatico' | 'relatorio';

const STEPS_VERIF: { id: StepVerif; label: string; description: string }[] = [
  { id: 'cadastro', label: 'Cadastro da obra', description: 'Identificação do projeto' },
  { id: 'chuva', label: 'Chuva de projeto', description: 'Intensidade pluviométrica' },
  { id: 'panos', label: 'Panos de telhado', description: 'Áreas de contribuição' },
  { id: 'calhas', label: 'Calhas', description: 'Geometria e descidas' },
  { id: 'calculo', label: 'Cálculo hidráulico', description: 'Manning e capacidade' },
  { id: 'condutores', label: 'Condutores verticais', description: 'Diâmetros por ábaco' },
  { id: 'resultados', label: 'Resultados', description: 'Dashboard e status' },
  { id: 'relatorio', label: 'Memorial de cálculo', description: 'PDF para assinatura' },
];

const STEPS_AUTO: { id: StepAuto; label: string; description: string }[] = [
  { id: 'cadastro', label: 'Cadastro da obra', description: 'Identificação do projeto' },
  { id: 'chuva', label: 'Chuva de projeto', description: 'Intensidade pluviométrica' },
  { id: 'panos', label: 'Panos de telhado', description: 'Áreas de contribuição' },
  { id: 'parametros', label: 'Parâmetros', description: 'Material / declividade / descidas' },
  { id: 'automatico', label: 'Seleção automática', description: 'Solução e alternativas' },
  { id: 'relatorio', label: 'Memorial de cálculo', description: 'PDF para assinatura' },
];

export default function DimensionamentoCalhas() {
  const [modo, setModo] = useState<Modo>('verificacao');
  const [projetoId, setProjetoId] = useState<string>(() => crypto.randomUUID());
  const [projetoNome, setProjetoNome] = useState<string>('Novo projeto');
  const [currentStep, setCurrentStep] = useState<string>('cadastro');
  const [cadastro, setCadastro] = useState<CadastroObra | null>(null);
  const [chuva, setChuva] = useState<ChuvaProjeto | null>(null);
  const [panos, setPanos] = useState<PanosForm | null>(null);
  const [calhas, setCalhas] = useState<CalhasForm | null>(null);
  const [parametros, setParametros] = useState<ParametrosAutomaticoForm | null>(null);
  const [resultadoAuto, setResultadoAuto] = useState<ResultadoAutomatico | null>(null);

  const STEPS = modo === 'verificacao' ? STEPS_VERIF : STEPS_AUTO;
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.id === currentStep),
  );

  const goTo = (id: string) => setCurrentStep(id);

  const handleAbrir = (p: ProjetoCalhas) => {
    setProjetoId(p.id);
    setProjetoNome(p.nome);
    setCadastro(p.cadastro);
    setChuva(p.chuva);
    setPanos(p.panos);
    setCalhas(p.calhas);
    setCurrentStep('cadastro');
  };

  const handleNovo = () => {
    setProjetoId(crypto.randomUUID());
    setProjetoNome('Novo projeto');
    setCadastro(null);
    setChuva(null);
    setPanos(null);
    setCalhas(null);
    setParametros(null);
    setResultadoAuto(null);
    setCurrentStep('cadastro');
    toast({ title: 'Novo projeto iniciado' });
  };

  const handleTrocarModo = (novo: Modo) => {
    if (novo === modo) return;
    setModo(novo);
    setCurrentStep('cadastro');
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <PageHeader
          title="Dimensionamento de Calhas"
          subtitle="Cálculo conforme ABNT NBR 10844:1989"
        />

        {/* Toggle de modo + biblioteca */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <div className="text-sm font-medium mr-2">Modo de cálculo:</div>
          <Button
            variant={modo === 'verificacao' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => handleTrocarModo('verificacao')}
          >
            <Search className="h-4 w-4" />
            Verificação
          </Button>
          <Button
            variant={modo === 'automatico' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => handleTrocarModo('automatico')}
          >
            <Sparkles className="h-4 w-4" />
            Dimensionamento automático
          </Button>
          <div className="ml-auto">
            <BibliotecaCalhasManager />
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card p-3">
          <ProjetosManager
            projetoAtual={{
              id: projetoId,
              nome: projetoNome,
              cadastro,
              chuva,
              panos,
              calhas,
            }}
            onAbrir={handleAbrir}
            onNovo={handleNovo}
          />
        </div>

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
                key={`cadastro-${projetoId}`}
                defaultValues={cadastro ?? undefined}
                onSubmit={(values) => {
                  setCadastro(values);
                  toast({ title: 'Cadastro salvo' });
                  goTo('chuva');
                }}
              />
            )}

            {currentStep === 'chuva' && (
              <ChuvaProjetoStep
                key={`chuva-${projetoId}`}
                cidade={cadastro?.cidade ?? ''}
                uf={cadastro?.uf ?? ''}
                defaultValues={chuva ?? undefined}
                onSubmit={(values) => {
                  setChuva(values);
                  toast({
                    title: 'Chuva de projeto definida',
                    description: `${values.intensidade_mm_h} mm/h • TR ${values.tempo_retorno_anos} anos`,
                  });
                  goTo('panos');
                }}
                onBack={() => goTo('cadastro')}
              />
            )}

            {currentStep === 'panos' && (
              <PanosTelhadoStep
                key={`panos-${projetoId}`}
                defaultValues={panos ?? undefined}
                onSubmit={(values) => {
                  setPanos(values);
                  toast({
                    title: 'Panos de telhado cadastrados',
                    description: `${values.panos.length} pano(s)`,
                  });
                  goTo(modo === 'verificacao' ? 'calhas' : 'parametros');
                }}
                onBack={() => goTo('chuva')}
              />
            )}

            {/* === MODO VERIFICAÇÃO === */}
            {modo === 'verificacao' && currentStep === 'calhas' && (
              <CalhasStep
                key={`calhas-${projetoId}`}
                defaultValues={calhas ?? undefined}
                onSubmit={(values) => {
                  setCalhas(values);
                  toast({
                    title: 'Calhas cadastradas',
                    description: `${values.calhas.length} calha(s)`,
                  });
                  goTo('calculo');
                }}
                onBack={() => goTo('panos')}
              />
            )}
            {modo === 'verificacao' && currentStep === 'calculo' && calhas && panos && chuva && (
              <CalculoStep
                calhas={calhas.calhas}
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                onBack={() => goTo('calhas')}
                onConfirm={() => goTo('condutores')}
              />
            )}
            {modo === 'verificacao' && currentStep === 'condutores' && calhas && panos && chuva && (
              <CondutoresVerticaisStep
                calhas={calhas.calhas}
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                onBack={() => goTo('calculo')}
                onConfirm={() => goTo('resultados')}
              />
            )}
            {modo === 'verificacao' && currentStep === 'resultados' && calhas && panos && chuva && (
              <ResultadosStep
                calhas={calhas.calhas}
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                onBack={() => goTo('condutores')}
                onConfirm={() => goTo('relatorio')}
              />
            )}
            {modo === 'verificacao' && currentStep === 'relatorio' &&
              cadastro && chuva && panos && calhas && (
              <RelatorioStep
                cadastro={cadastro}
                chuva={chuva}
                panos={panos.panos}
                calhas={calhas.calhas}
                onBack={() => goTo('resultados')}
              />
            )}

            {/* === MODO AUTOMÁTICO === */}
            {modo === 'automatico' && currentStep === 'parametros' && (
              <ParametrosAutomaticoStep
                defaultValues={parametros ?? undefined}
                onSubmit={(v) => {
                  setParametros(v);
                  goTo('automatico');
                }}
                onBack={() => goTo('panos')}
              />
            )}
            {modo === 'automatico' && currentStep === 'automatico' &&
              panos && chuva && parametros && (
              <DimensionamentoAutomaticoStep
                panos={panos.panos}
                intensidade_mm_h={chuva.intensidade_mm_h}
                parametros={parametros}
                onBack={() => goTo('parametros')}
                onConfirm={(r) => {
                  setResultadoAuto(r);
                  goTo('relatorio');
                }}
              />
            )}
            {modo === 'automatico' && currentStep === 'relatorio' &&
              cadastro && chuva && panos && parametros && resultadoAuto && (
              <div className="space-y-6">
                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    Memorial do <strong>dimensionamento automático</strong> com a solução
                    adotada, parâmetros de entrada, tabela completa de alternativas
                    analisadas e campo para assinatura do responsável técnico.
                  </div>
                </div>
                <div className="rounded-lg border p-6 space-y-3">
                  <div className="text-base font-semibold">{cadastro.nome_obra}</div>
                  {resultadoAuto.recomendada && (
                    <div className="text-sm text-muted-foreground">
                      Solução: <strong>{resultadoAuto.recomendada.item.nome}</strong> ({resultadoAuto.recomendada.dimensaoLabel}) •
                      FS {resultadoAuto.recomendada.fs?.toFixed(2)} •
                      {parametros.num_descidas} descida(s) •
                      Cond. Ø {resultadoAuto.condutor.diametro_adotado_mm ?? '—'} mm
                    </div>
                  )}
                  <Button
                    className="gap-2"
                    onClick={() => {
                      try {
                        gerarMemorialAutomaticoPDF({
                          cadastro,
                          chuva,
                          panos: panos.panos,
                          parametros,
                          resultado: resultadoAuto,
                        });
                        toast({ title: 'Memorial gerado', description: 'O PDF foi baixado.' });
                      } catch (e) {
                        toast({
                          title: 'Erro ao gerar PDF',
                          description: e instanceof Error ? e.message : 'Falha desconhecida',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Gerar memorial em PDF
                  </Button>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => goTo('automatico')}>Voltar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
