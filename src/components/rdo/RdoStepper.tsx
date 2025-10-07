import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  NotebookPen,
  ClipboardCheck,
  Flame,
  Stamp,
  Wrench,
  Users,
  Camera,
  MessageSquareText,
} from "lucide-react";

export interface Step {
  id: string;
  label: string;
  icon: any;
  isComplete: boolean;
}

interface RdoStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  steps: Step[];
}

export function RdoStepper({ currentStep, onStepChange, steps }: RdoStepperProps) {
  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4">
        {/* Desktop Stepper */}
        <div className="hidden md:flex items-center justify-between py-4 overflow-x-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isPast = currentStep > index;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => onStepChange(index)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && isPast && "text-muted-foreground hover:bg-muted",
                    !isActive && !isPast && "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                      isActive && "border-primary-foreground bg-primary-foreground/10",
                      isPast && "border-green-600 bg-green-600",
                      !isActive && !isPast && "border-muted-foreground/30"
                    )}
                  >
                    {isPast || step.isComplete ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 mx-2",
                      isPast ? "bg-green-600" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Stepper */}
        <div className="flex md:hidden items-center justify-between py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentStep > 0 && onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isPast = currentStep > index;
              
              if (isActive) {
                return (
                  <div key={step.id} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                );
              }
              
              return (
                <button
                  key={step.id}
                  onClick={() => onStepChange(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    isPast || step.isComplete ? "bg-green-600" : "bg-muted-foreground/30"
                  )}
                />
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentStep < steps.length - 1 && onStepChange(currentStep + 1)}
            disabled={currentStep === steps.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const STEPS: Step[] = [
  { id: 'anotacoes', label: 'Anotações', icon: NotebookPen, isComplete: false },
  { id: 'atividades', label: 'Atividades', icon: ClipboardCheck, isComplete: false },
  { id: 'ocorrencias', label: 'Ocorrências', icon: Flame, isComplete: false },
  { id: 'visitas', label: 'Visitas', icon: Stamp, isComplete: false },
  { id: 'equipamentos', label: 'Equipamentos', icon: Wrench, isComplete: false },
  { id: 'mao-de-obra', label: 'Mão de Obra', icon: Users, isComplete: false },
  { id: 'evidencias', label: 'Evidências', icon: Camera, isComplete: false },
  { id: 'comentarios', label: 'Comentários', icon: MessageSquareText, isComplete: false },
];
