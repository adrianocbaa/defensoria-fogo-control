import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  arquivos: File[];
  onChange: (files: File[]) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/** Seletor de fotos com acesso direto à câmera no celular. */
export function FotoPicker({ arquivos, onChange, label = 'Adicionar foto', className, disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          const novos = Array.from(e.target.files ?? []);
          if (novos.length) onChange([...arquivos, ...novos]);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={disabled}
        onClick={() => ref.current?.click()}
      >
        <Camera className="mr-2 h-4 w-4" /> {label}
      </Button>

      {arquivos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {arquivos.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative overflow-hidden rounded-lg border">
              <img
                src={URL.createObjectURL(f)}
                alt={`Foto ${i + 1}`}
                loading="lazy"
                className="h-20 w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => onChange(arquivos.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
