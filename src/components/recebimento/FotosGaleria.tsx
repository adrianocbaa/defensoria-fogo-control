import { Card } from '@/components/ui/card';
import type { Foto } from '@/hooks/useRecebimentoPendencias';
import { formatarData } from '@/lib/recebimento/ui';

const TIPO_LABEL: Record<Foto['tipo'], string> = {
  ocorrencia: 'Ocorrência',
  correcao: 'Correção',
  geral: 'Geral',
};

export function FotosGaleria({
  fotos,
  nomeAmbiente,
}: {
  fotos: Foto[];
  nomeAmbiente: (id: string | null) => string;
}) {
  if (fotos.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma foto registrada nesta obra.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {fotos
        .filter((f) => f.url)
        .map((f) => (
          <a
            key={f.id}
            href={f.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-xl border bg-card"
          >
            <img
              src={f.url ?? ''}
              alt={f.legenda ?? `Foto — ${TIPO_LABEL[f.tipo]}`}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <div className="p-2">
              <p className="truncate text-xs font-medium">{nomeAmbiente(f.ambiente_id)}</p>
              <p className="text-[11px] text-muted-foreground">
                {TIPO_LABEL[f.tipo]} · {formatarData(f.created_at)}
              </p>
            </div>
          </a>
        ))}
    </div>
  );
}
