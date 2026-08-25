import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlbumFoto {
  id: string;
  url?: string | null;
  legenda?: string | null;
  created_at?: string | null;
}

interface Props {
  titulo: string;
  fotos: AlbumFoto[];
  /** índice ativo; null = fechado */
  indice: number | null;
  onIndice: (i: number | null) => void;
  /** rótulo opcional exibido ao lado do título (ex.: data) */
  sufixoTitulo?: (foto: AlbumFoto) => string;
}

/** Álbum padrão do módulo Recebimento (lightbox com setas e miniaturas). */
export function FotoAlbumDialog({ titulo, fotos, indice, onIndice, sufixoTitulo }: Props) {
  const album = fotos.filter((f) => Boolean(f.url));
  const aberto = indice !== null && album.length > 0;
  const atual = indice !== null ? album[indice] : null;

  const irPara = (delta: number) => {
    if (indice === null || album.length === 0) return;
    onIndice((indice + delta + album.length) % album.length);
  };

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') irPara(1);
      if (e.key === 'ArrowLeft') irPara(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, indice, album.length]);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onIndice(null)}>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="text-sm">
          {titulo}
          {atual && sufixoTitulo ? ` — ${sufixoTitulo(atual)}` : ''}
        </DialogTitle>
        <div className="relative flex items-center justify-center">
          {atual?.url && (
            <img
              src={atual.url}
              alt={atual.legenda ?? titulo}
              className="max-h-[70vh] w-auto max-w-full rounded-md object-contain"
            />
          )}
          {album.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Foto anterior"
                onClick={() => irPara(-1)}
                className="absolute left-2 rounded-full opacity-90"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Próxima foto"
                onClick={() => irPara(1)}
                className="absolute right-2 rounded-full opacity-90"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
        {atual?.legenda && <p className="text-xs text-muted-foreground">{atual.legenda}</p>}
        {album.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {album.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onIndice(i)}
                className={cn(
                  'h-14 w-14 shrink-0 overflow-hidden rounded-md border-2',
                  i === indice ? 'border-primary' : 'border-transparent opacity-70',
                )}
              >
                <img src={f.url ?? undefined} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
