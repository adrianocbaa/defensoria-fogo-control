import { Card } from '@/components/ui/card';
import { EVENTO_LABEL } from '@/lib/recebimento/constants';
import type { Pendencia, PendenciaHistorico } from '@/hooks/useRecebimentoPendencias';

export function HistoricoTimeline({
  historico,
  pendencias,
  nomeAmbiente,
}: {
  historico: PendenciaHistorico[];
  pendencias: Pendencia[];
  nomeAmbiente: (id: string | null) => string;
}) {
  const eventos = [...historico].sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (eventos.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhum evento registrado ainda.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ol className="space-y-4 border-l pl-4">
        {eventos.map((e) => {
          const p = pendencias.find((x) => x.id === e.pendencia_id);
          return (
            <li key={e.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <p className="font-medium">{EVENTO_LABEL[e.evento] ?? e.evento}</p>
              {p && (
                <p className="text-xs text-muted-foreground">
                  {p.titulo} · {nomeAmbiente(p.ambiente_id)}
                </p>
              )}
              {e.observacao && <p className="mt-0.5 text-xs">{e.observacao}</p>}
              <p className="text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString('pt-BR')}
              </p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
