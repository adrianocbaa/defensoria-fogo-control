import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

interface Props {
  saveState: SaveState;
  isFirst: boolean;
  isLast: boolean;
  showPrimarySave: boolean;
  showConclude: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  onConclude?: () => void;
  disabled?: boolean;
  nextLabel?: string;
  hidden?: boolean;
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Salvando...
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Salvo
      </span>
    );
  }
  if (state === 'dirty') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Alterações não salvas
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-rose-600">
        <AlertCircle className="h-3.5 w-3.5" />
        Erro ao salvar
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground opacity-0">.</span>;
}

export function RdoFormFooterBar({
  saveState,
  isFirst,
  isLast,
  showPrimarySave,
  showConclude,
  onPrev,
  onNext,
  onSave,
  onConclude,
  disabled,
  nextLabel,
  hidden,
}: Props) {
  if (hidden) return null;
  return (
    <div className="sticky bottom-0 z-10 border-t bg-card/95 backdrop-blur">
      <div className={cn('px-4 md:px-8 py-3 flex items-center justify-between gap-2')}>
        <Button variant="outline" size="sm" onClick={onPrev} disabled={isFirst}>
          <ChevronLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>

        <div className="flex-1 flex justify-center">
          <SaveIndicator state={saveState} />
        </div>

        <div className="flex items-center gap-2">
          {showPrimarySave && (
            <Button variant="outline" size="sm" onClick={onSave} disabled={disabled || saveState === 'saving'}>
              <Save className="h-4 w-4 mr-1.5" />
              Salvar Rascunho
            </Button>
          )}
          {isLast && showConclude && onConclude ? (
            <Button size="sm" onClick={onConclude} disabled={disabled || saveState === 'saving'} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Finalizar RDO
            </Button>
          ) : (
            !isLast && (
              <Button size="sm" onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700">
                {nextLabel ?? 'Próximo'}
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
