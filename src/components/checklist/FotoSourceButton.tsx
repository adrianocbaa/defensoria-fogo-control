import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, ImagePlus } from 'lucide-react';

export type FotoSource = 'camera' | 'galeria';

/** Abre um seletor de arquivo de imagem — câmera (capture) ou galeria. */
export function abrirSeletorFoto(
  source: FotoSource,
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void,
) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (source === 'camera') input.setAttribute('capture', 'environment');
  input.style.display = 'none';
  input.onchange = (ev) => {
    onFile(ev as unknown as React.ChangeEvent<HTMLInputElement>);
    input.remove();
  };
  document.body.appendChild(input);
  input.click();
}

const isTouchDevice = () =>
  typeof navigator !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

interface Props extends Omit<ButtonProps, 'onClick'> {
  onPick: (source: FotoSource) => void;
}

/**
 * Botão de adicionar foto: em dispositivos com toque (celular/tablet) oferece
 * escolher entre câmera e galeria; no desktop abre direto a galeria.
 */
export function FotoSourceButton({ onPick, children, ...props }: Props) {
  if (!isTouchDevice()) {
    return (
      <Button {...props} onClick={() => onPick('galeria')}>
        {children}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button {...props}>{children}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[60]">
        <DropdownMenuItem onClick={() => onPick('camera')}>
          <Camera className="mr-2 h-4 w-4" /> Tirar foto com a câmera
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick('galeria')}>
          <ImagePlus className="mr-2 h-4 w-4" /> Escolher da galeria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
