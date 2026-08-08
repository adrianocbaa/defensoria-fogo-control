import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ABERTAS, SITUACAO_LABEL } from '@/lib/recebimento/constants';
import { SITUACAO_CHIP } from '@/lib/recebimento/ui';
import type { Foto, Pendencia, PendenciaHistorico } from '@/hooks/useRecebimentoPendencias';
import { PendenciaDetail } from './PendenciaDetail';

interface Props {
  vistoriaTitulo: string;
  ehReinspecao: boolean;
  pendencias: Pendencia[];
  fotos: Foto[];
  historico: PendenciaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  onRegistrarCorrecao: (p: Pendencia, observacao: string, fotos: File[]) => Promise<void>;
  onAvaliar: (p: Pendencia, aceita: boolean, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: Pendencia, motivo: string) => Promise<void>;
}

export function ReinspecaoView({
  vistoriaTitulo: titulo,
  ehReinspecao,
  pendencias,
  fotos,
  historico,
  nomeAmbiente,
  somenteLeitura,
  onRegistrarCorrecao,
  onAvaliar,
  onCancelar,
}: Props) {
  const abertas = pendencias.filter((p) => ABERTAS.includes(p.situacao));
  const sanadas = pendencias.filter((p) => p.situacao === 'sanada').length;
  const total = abertas.length + sanadas;
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    if (!abertas.some((p) => p.id === selId)) setSelId(abertas[0]?.id ?? null);
  }, [abertas, selId]);

  const selecionada = abertas.find((p) => p.id === selId) ?? null;

  const avancar = () => {
    const idx = abertas.findIndex((p) => p.id === selId);
    const prox = abertas[idx + 1] ?? abertas[0];
    setSelId(prox?.id ?? null);
  };

  if (abertas.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="text-sm font-medium">Nenhuma pendência em aberto</p>
        <p className="text-xs text-muted-foreground">Obra apta ao Recebimento Definitivo.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!ehReinspecao && (
        <Card className="p-3 text-xs text-muted-foreground">
          A reinspeção avalia as pendências abertas. Crie uma vistoria do tipo &quot;Reinspeção&quot;
          para registrar formalmente a avaliação — as pendências permanecem as mesmas em todas as
          etapas.
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card className="p-3">
            <p className="text-sm font-bold">{titulo}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {abertas.length} pendência(s) para verificar · {sanadas} de {total} sanadas
            </p>
            <Progress value={total ? (sanadas / total) * 100 : 0} className="mt-2 h-2" />
          </Card>

          <div className="space-y-2">
            {abertas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelId(p.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors',
                  p.id === selId
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                    : 'hover:bg-muted/40',
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {nomeAmbiente(p.ambiente_id)}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    SITUACAO_CHIP[p.situacao],
                  )}
                >
                  {SITUACAO_LABEL[p.situacao]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {selecionada && (
            <PendenciaDetail
              pendencia={selecionada}
              fotos={fotos}
              historico={historico}
              nomeAmbiente={nomeAmbiente}
              somenteLeitura={somenteLeitura}
              modoReinspecao
              onRegistrarCorrecao={onRegistrarCorrecao}
              onAvaliar={onAvaliar}
              onCancelar={onCancelar}
              onConcluido={avancar}
            />
          )}
        </div>
      </div>
    </div>
  );
}
