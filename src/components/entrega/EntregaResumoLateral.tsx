import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, ImageOff } from 'lucide-react';
import { ABERTAS } from '@/lib/entrega/constants';
import { ImpactoBadge } from './EntregaBadges';
import type { EntregaAmbiente, EntregaPendencia } from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto } from '@/hooks/useEntregaPendencias';

interface Props {
  ambiente: EntregaAmbiente | null;
  pendencias: EntregaPendencia[];
  fotos: EntregaFoto[];
  somenteLeitura: boolean;
  onFotoGeral: () => void;
  onAbrirPendencias: () => void;
  onConcluirAmbiente?: () => void;
}

/** Coluna direita do desktop: foto geral, dados do ambiente e desvios detectados. */
export function EntregaResumoLateral({
  ambiente,
  pendencias,
  fotos,
  somenteLeitura,
  onFotoGeral,
  onAbrirPendencias,
  onConcluirAmbiente,
}: Props) {
  if (!ambiente) return null;

  const fotosAmbiente = fotos.filter((f) => f.ambiente_id === ambiente.id && f.tipo === 'geral');
  const capa = fotosAmbiente[fotosAmbiente.length - 1];
  const desvios = pendencias.filter(
    (p) => p.ambiente_id === ambiente.id && ABERTAS.includes(p.situacao),
  );

  return (
    <Card className="flex h-full flex-col gap-4 p-4">
      <h2 className="text-base font-bold">Resumo &amp; Fotos</h2>

      <div className="overflow-hidden rounded-xl border bg-muted/40">
        {capa?.url ? (
          <img
            src={capa.url}
            alt={`Foto geral de ${ambiente.nome}`}
            loading="lazy"
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">Nenhuma foto geral registrada</p>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="h-11"
        onClick={onFotoGeral}
        disabled={somenteLeitura}
      >
        <Camera className="mr-2 h-4 w-4" /> Adicionar Foto Geral
        {fotosAmbiente.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">({fotosAmbiente.length})</span>
        )}
      </Button>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Dados do ambiente
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Ambiente</dt>
            <dd className="text-right font-semibold">{ambiente.nome}</dd>
          </div>
          {ambiente.pavimento && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Pavimento</dt>
              <dd className="text-right font-semibold">{ambiente.pavimento}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Grupos verificados</dt>
            <dd className="text-right font-semibold">{ambiente.grupos.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Origem</dt>
            <dd className="text-right font-semibold">
              {ambiente.recebimento_ambiente_id ? 'Recebimento Definitivo' : 'Ambiente adicional'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-h-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Desvios detectados ({desvios.length})
        </p>
        <div className="mt-2 space-y-2">
          {desvios.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={onAbrirPendencias}
              className="w-full rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-left"
            >
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 text-sm font-bold text-destructive">{p.titulo}</span>
                <ImpactoBadge impacto={p.impacto} />
              </div>
              {p.descricao && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
              )}
            </button>
          ))}
          {desvios.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum desvio registrado neste ambiente.</p>
          )}
        </div>
      </div>

      {onConcluirAmbiente && !somenteLeitura && (
        <Button className="h-12 w-full text-base" onClick={onConcluirAmbiente}>
          Concluir vistoria de {ambiente.nome}
        </Button>
      )}
    </Card>
  );
}
