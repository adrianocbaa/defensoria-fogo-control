import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LightboxPhoto {
  id: string;
  file_url: string;
  thumb_url?: string | null;
  numero_seq?: number | null;
  data?: string | null;
}

interface Props {
  photos: LightboxPhoto[];
  index: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onIndexChange: (i: number) => void;
}

export function RdoPhotoLightbox({ photos, index, open, onOpenChange, onIndexChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'ArrowLeft') onIndexChange(Math.max(0, index - 1));
      if (e.key === 'ArrowRight') onIndexChange(Math.min(photos.length - 1, index + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, photos.length, onIndexChange, onOpenChange]);

  if (!open || photos.length === 0) return null;
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="rounded-md bg-white/10 px-3 py-1 text-sm">
          {index + 1} de {photos.length} foto{photos.length > 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={photo.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Baixar foto"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center px-14">
          <img
            src={photo.file_url}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
        {index > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {index < photos.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Próxima foto"
            onClick={() => onIndexChange(index + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {(photo.numero_seq || photo.data) && (
        <div className="pb-4 text-center text-sm text-white/80">
          {photo.numero_seq && <span>RDO #{photo.numero_seq}</span>}
          {photo.numero_seq && photo.data && <span> — </span>}
          {photo.data && <span>{formatDate(photo.data)}</span>}
        </div>
      )}
    </div>
  );
}

function formatDate(v: string) {
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
