import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onAnterior?: () => void;
  onProximo?: () => void;
  onFoto?: () => void;
  anteriorDisabled?: boolean;
  proximoDisabled?: boolean;
  className?: string;
}

/** Barra fixa inferior da vistoria (mobile). */
export function RecebimentoMobileFooter({
  onAnterior,
  onProximo,
  onFoto,
  anteriorDisabled,
  proximoDisabled,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onAnterior}
          disabled={anteriorDisabled}
          className="flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          type="button"
          onClick={onFoto}
          className="flex h-12 w-14 items-center justify-center rounded-xl border"
          aria-label="Tirar foto"
        >
          <Camera className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onProximo}
          disabled={proximoDisabled}
          className="flex h-12 flex-[1.6] items-center justify-center gap-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
