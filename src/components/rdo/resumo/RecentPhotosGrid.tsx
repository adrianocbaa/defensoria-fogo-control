import { Skeleton } from '@/components/ui/skeleton';
import { Camera } from 'lucide-react';
import type { FotoRecente } from '@/hooks/useRdoData';

interface Props {
  data?: FotoRecente[];
  isLoading: boolean;
  onOpen: (index: number) => void;
  onSeeAll?: () => void;
}

function parseYmd(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function shortDate(v?: string | null) {
  if (!v) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseYmd(v) : new Date(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function RecentPhotosGrid({ data, isLoading, onOpen, onSeeAll }: Props) {
  return (
    <section className="rounded-xl border border-home-border bg-home-surface">
      <header className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Fotos Recentes</h2>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver galeria
          </button>
        )}
      </header>

      <div className="border-t border-home-border p-5">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-home-muted">
            <Camera className="h-6 w-6" />
            <span>Nenhuma foto recente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {data.slice(0, 9).map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpen(i)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <img
                  src={photo.thumb_url || photo.file_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {(photo as any).numero_seq != null && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    RDO #{(photo as any).numero_seq}
                  </span>
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {shortDate((photo as any).data || photo.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
