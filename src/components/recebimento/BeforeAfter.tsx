import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FotoAlbumDialog } from './FotoAlbumDialog';
import type { Foto } from '@/hooks/useRecebimentoPendencias';
import { formatarData } from '@/lib/recebimento/ui';


interface Props {
  antes: Foto[];
  depois: Foto[];
  descricaoAntes?: string | null;
  descricaoDepois?: string | null;
  /** No mobile fica empilhado; a partir de sm exibe lado a lado. */
  className?: string;
}

export function BeforeAfter({ antes, depois, descricaoAntes, descricaoDepois, className }: Props) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <Bloco
        titulo="Antes"
        tom="destructive"
        fotos={antes}
        descricao={descricaoAntes}
        vazio="Sem foto da ocorrência"
      />
      <Bloco
        titulo="Correção"
        tom="emerald"
        fotos={depois}
        descricao={descricaoDepois}
        vazio="Aguardando registro de correção"
      />
    </div>
  );
}

function Bloco({
  titulo,
  tom,
  fotos,
  descricao,
  vazio,
}: {
  titulo: string;
  tom: 'destructive' | 'emerald';
  fotos: Foto[];
  descricao?: string | null;
  vazio: string;
}) {
  const [indiceAlbum, setIndiceAlbum] = useState<number | null>(null);
  const data = fotos[0]?.created_at;
  const comUrl = fotos.filter((f) => Boolean(f.url));

  const abrir = (idx: number) => setIndiceAlbum(idx);


  return (
    <Card className="overflow-hidden p-0">
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wide',
          tom === 'destructive'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        )}
      >
        <span>{titulo}</span>
        {data && <span className="font-medium normal-case">{formatarData(data)}</span>}
      </div>
      {fotos.length === 0 ? (
        <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-xs text-muted-foreground">
          {vazio}
        </div>
      ) : (
        <div className={cn('grid gap-1 p-1', comUrl.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {comUrl.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => abrir(idx)}
              className="block w-full text-left"
            >
              <img
                src={f.url ?? undefined}
                alt={f.legenda ?? titulo}
                loading="lazy"
                className={cn(
                  'w-full rounded-md object-cover',
                  comUrl.length > 1 ? 'aspect-square' : 'aspect-[4/3]',
                )}
              />
            </button>
          ))}
        </div>
      )}
      {descricao && <p className="px-3 pb-3 pt-1 text-xs text-muted-foreground">{descricao}</p>}

      <FotoAlbumDialog
        titulo={titulo}
        fotos={comUrl}
        indice={indiceAlbum}
        onIndice={setIndiceAlbum}
        sufixoTitulo={(f) => (f.created_at ? formatarData(f.created_at) : '')}
      />
    </Card>
  );
}

