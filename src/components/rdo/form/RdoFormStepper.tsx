import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { STEPS, type Step } from '@/components/rdo/RdoStepper';
import { useState } from 'react';

export type StepStatus = 'done' | 'active' | 'pending' | 'warn' | 'idle';

export interface StepMeta {
  status: StepStatus;
  detail?: string; // "12 registradas", "Pendente", "Preenchido"
}

interface Props {
  currentStep: number;
  onStepChange: (i: number) => void;
  meta: StepMeta[];
}

function stepClass(status: StepStatus, active: boolean) {
  if (active) return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300';
  return 'bg-transparent border-transparent hover:bg-muted/50';
}

function badgeClass(status: StepStatus, active: boolean) {
  if (active) return 'bg-emerald-600 text-white';
  if (status === 'done') return 'bg-emerald-600 text-white';
  if (status === 'warn') return 'bg-rose-500 text-white';
  return 'bg-muted text-muted-foreground';
}

function detailClass(status: StepStatus, active: boolean) {
  if (active) return 'text-emerald-700 dark:text-emerald-300';
  if (status === 'done') return 'text-emerald-600';
  if (status === 'warn') return 'text-rose-600';
  return 'text-muted-foreground';
}

export function RdoFormStepper({ currentStep, onStepChange, meta }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const active = STEPS[currentStep];
  const activeMeta = meta[currentStep];

  return (
    <>
      {/* Desktop / Tablet — horizontal */}
      <nav className="hidden md:block border-b bg-card">
        <div className="px-4 md:px-8 py-3 overflow-x-auto">
          <ol className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, index) => {
              const m = meta[index] ?? { status: 'idle' as StepStatus };
              const isActive = index === currentStep;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => onStepChange(index)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                      stepClass(m.status, isActive),
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                        badgeClass(m.status, isActive),
                      )}
                    >
                      {m.status === 'done' && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-sm font-medium text-foreground">{step.label}</span>
                      <span className={cn('text-[11px]', detailClass(m.status, isActive))}>
                        {m.detail ?? (isActive ? 'Em progresso' : 'Pendente')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      {/* Mobile — pill + drawer trigger */}
      <nav className="md:hidden border-b bg-card">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentStep > 0 && onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
            aria-label="Etapa anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              >
                <span className="text-xs opacity-80">{currentStep + 1} de {STEPS.length}</span>
                <span className="h-3 w-px bg-primary-foreground/40" />
                <span>{active.label}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>Navegação por Etapas</SheetTitle>
                <SheetDescription>Selecione uma etapa para visualizar ou editar</SheetDescription>
              </SheetHeader>
              <ul className="mt-4 space-y-2">
                {STEPS.map((step, index) => {
                  const m = meta[index] ?? { status: 'idle' as StepStatus };
                  const isActive = index === currentStep;
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onStepChange(index);
                          setDrawerOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left',
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300'
                            : 'border-transparent hover:bg-muted/50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                            badgeClass(m.status, isActive),
                          )}
                        >
                          {m.status === 'done' && !isActive ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-foreground">{step.label}</span>
                          <span className={cn('text-xs', detailClass(m.status, isActive))}>
                            {m.detail ?? (isActive ? 'Editando' : 'Pendente')}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentStep < STEPS.length - 1 && onStepChange(currentStep + 1)}
            disabled={currentStep === STEPS.length - 1}
            aria-label="Próxima etapa"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </>
  );
}

export { STEPS };
export type { Step };
