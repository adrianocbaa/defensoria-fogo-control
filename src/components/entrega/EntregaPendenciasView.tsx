import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ABERTAS } from '@/lib/entrega/constants';
import { ImpactoBadge, SituacaoBadge } from './EntregaBadges';
import { EntregaPendenciaDetail } from './EntregaPendenciaDetail';
import type { EntregaPendencia } from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto, EntregaHistorico } from '@/hooks/useEntregaPendencias';

type Filtro =
  | 'todas'
  | 'impeditivas'
  | 'nao_impeditivas'
  | 'contratada'
  | 'dif_engenharia'
  | 'administracao'
  | 'terceiro'
  | 'sanadas';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'impeditivas', label: 'Impeditivas' },
  { key: 'nao_impeditivas', label: 'Não Impeditivas' },
  { key: 'contratada', label: 'Contratada' },
  { key: 'dif_engenharia', label: 'DIF / Engenharia' },
  { key: 'administracao', label: 'Administração' },
  { key: 'terceiro', label: 'Terceiro' },
  { key: 'sanadas', label: 'Sanadas' },
];

interface Props {
  pendencias: EntregaPendencia[];
  fotos: EntregaFoto[];
  historico: EntregaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  nomeGrupo: (id: string | null) => string;
  somenteLeitura: boolean;
  progresso: number;
  selecionadaId?: string | null;
  onRegistrarCorrecao: (p: EntregaPendencia, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: EntregaPendencia, motivo: string) => Promise<void>;
}

export function EntregaPendenciasView({
  pendencias,
  fotos,
  historico,
  nomeAmbiente,
  nomeGrupo,
  somenteLeitura,
  progresso,
  selecionadaId,
  onRegistrarCorrecao,
  onCancelar,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [selId, setSelId] = useState<string | null>(selecionadaId ?? null);

  const lista = useMemo(() => {
    const validas = pendencias.filter((p) => p.situacao !== 'cancelada');
    switch (filtro) {
      case 'impeditivas':
        return validas.filter((p) => p.impacto === 'impeditiva' && ABERTAS.includes(p.situacao));
      case 'nao_impeditivas':
        return validas.filter((p) => p.impacto === 'nao_impeditiva' && ABERTAS.includes(p.situacao));
      case 'sanadas':
        return validas.filter((p) => p.situacao === 'sanada');
      case 'todas':
        return validas;
      default:
        return validas.filter((p) => p.responsabilidade === filtro);
    }
  }, [pendencias, filtro]);

  useEffect(() => {
    if (selecionadaId) setSelId(selecionadaId);
  }, [selecionadaId]);

  useEffect(() => {
    if (!lista.some((p) => p.id === selId)) setSelId(lista[0]?.id ?? null);
  }, [lista, selId]);

  const selecionada = lista.find((p) => p.id === selId) ?? null;

  if (pendencias.filter((p) => p.situacao !== 'cancelada').length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-bold">Nenhuma pendência registrada</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Todos os itens verificados até o momento estão conformes. As pendências aparecem aqui assim
          que forem registradas durante a vistoria.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
      <Card className="flex flex-col gap-3 self-start p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">Pendências da Entrega ({lista.length})</h2>
          <span className="text-xs text-muted-foreground">
            Vistoria em {Math.round(progresso)}%
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                filtro === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {lista.map((p) => {
            const qtdFotos = fotos.filter((f) => f.pendencia_id === p.id).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelId(p.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  p.id === selId
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                    : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-bold">{p.titulo}</span>
                  <ImpactoBadge impacto={p.impacto} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {nomeAmbiente(p.ambiente_id)} › {nomeGrupo(p.ambiente_grupo_id)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                  <SituacaoBadge situacao={p.situacao} />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Camera className="h-3.5 w-3.5" />
                    {qtdFotos > 0 ? `${qtdFotos} foto${qtdFotos > 1 ? 's' : ''}` : 'Sem foto'}
                  </span>
                </div>
              </button>
            );
          })}
          {lista.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma pendência neste filtro.
            </p>
          )}
        </div>
      </Card>

      <div className="min-w-0">
        {selecionada && (
          <EntregaPendenciaDetail
            pendencia={selecionada}
            fotos={fotos}
            historico={historico}
            nomeAmbiente={nomeAmbiente}
            nomeGrupo={nomeGrupo}
            somenteLeitura={somenteLeitura}
            onRegistrarCorrecao={onRegistrarCorrecao}
            onCancelar={onCancelar}
          />
        )}
      </div>
    </div>
  );
}
