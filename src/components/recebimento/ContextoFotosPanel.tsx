import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Foto, Pendencia } from '@/hooks/useRecebimentoPendencias';
import { SITUACAO_LABEL } from '@/lib/recebimento/constants';
import { SITUACAO_CHIP, formatarData } from '@/lib/recebimento/ui';

interface Props {
  ambienteNome: string;
  fotos: Foto[];
  pendencias: Pendencia[];
  onAbrirPendencia: (p: Pendencia) => void;
  onFoto?: () => void;
  className?: string;
}

/** Painel 3 (desktop): apoio visual à vistoria — evidências e pendências do ambiente. */
export function ContextoFotosPanel({
  ambienteNome,
  fotos,
  pendencias,
  onAbrirPendencia,
  onFoto,
  className,
}: Props) {
  const recentes = [...fotos].slice(-6).reverse();

  return (
    <aside className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Evidências</h3>
        {onFoto && (
          <Button variant="ghost" size="sm" onClick={onFoto}>
            <Camera className="mr-1.5 h-4 w-4" /> Foto
          </Button>
        )}
      </div>
      <p className="-mt-2 truncate text-xs text-muted-foreground">{ambienteNome}</p>

      <Card className="p-2">
        {recentes.length === 0 ? (
          <div className="flex aspect-video items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground">
            Nenhuma foto registrada neste ambiente
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {recentes.map((f) =>
              f.url ? (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="group block">
                  <img
                    src={f.url}
                    alt={f.legenda ?? 'Evidência da vistoria'}
                    loading="lazy"
                    className="aspect-square w-full rounded-md object-cover transition-opacity group-hover:opacity-90"
                  />
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {formatarData(f.created_at)}
                  </span>
                </a>
              ) : null,
            )}
          </div>
        )}
      </Card>

      <h3 className="text-sm font-semibold">Pendências do ambiente</h3>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {pendencias.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Sem pendências registradas
          </p>
        ) : (
          pendencias.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAbrirPendencia(p)}
              className="flex w-full items-start gap-2 rounded-lg border bg-card p-2.5 text-left hover:bg-muted/40"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{p.titulo}</span>
                <span
                  className={cn(
                    'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    SITUACAO_CHIP[p.situacao],
                  )}
                >
                  {SITUACAO_LABEL[p.situacao]}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
