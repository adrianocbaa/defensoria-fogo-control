import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, ClipboardList, Layers, MinusCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ambiente } from '@/hooks/useRecebimentoChecklist';
import type { Pendencia } from '@/hooks/useRecebimentoPendencias';
import { ABERTAS, CLASSIFICACAO_LABEL, type PendenciaClassificacao } from '@/lib/recebimento/constants';
import { progressoDeVerificacoes, resumoAmbiente } from '@/lib/recebimento/stats';
import { ACCENT_BAR } from '@/lib/recebimento/ui';

interface Props {
  ambientes: Ambiente[];
  pendencias: Pendencia[];
  pendenciasPorAmbiente: Record<string, number>;
  onContinuar: () => void;
  onAbrirAmbiente: (id: string) => void;
  onVerPendencias: () => void;
}

export function RecebimentoOverview({
  ambientes,
  pendencias,
  pendenciasPorAmbiente,
  onContinuar,
  onAbrirAmbiente,
  onVerPendencias,
}: Props) {
  const todas = ambientes.flatMap((a) => a.servicos.flatMap((s) => s.verificacoes));
  const p = progressoDeVerificacoes(todas);
  const abertas = pendencias.filter((x) => ABERTAS.includes(x.situacao));

  const porCategoria = new Map<PendenciaClassificacao, number>();
  for (const x of abertas) {
    porCategoria.set(x.classificacao, (porCategoria.get(x.classificacao) ?? 0) + 1);
  }

  const indicadores = [
    { label: 'Ambientes', value: ambientes.length, icon: Layers, tone: 'text-foreground' },
    { label: 'Itens', value: p.total, icon: ClipboardList, tone: 'text-foreground' },
    {
      label: 'Conformes',
      value: p.conformes,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    { label: 'Pendências', value: abertas.length, icon: ShieldAlert, tone: 'text-destructive' },
    {
      label: 'Não executados',
      value: p.naoExecutados,
      icon: MinusCircle,
      tone: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {indicadores.map((k) => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <k.icon className={cn('h-3.5 w-3.5', k.tone)} />
              <span className="truncate">{k.label}</span>
            </div>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', k.tone)}>{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">{Math.round(p.pct)}% vistoriado</p>
          <p className="text-xs text-muted-foreground">
            {p.feitas} de {p.total} itens vistoriados
          </p>
        </div>
        <Progress value={p.pct} className="mt-2 h-2.5" />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pendências por categoria</h3>
            <Button variant="ghost" size="sm" onClick={onVerPendencias}>
              Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {porCategoria.size === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Nenhuma pendência em aberto.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...porCategoria.entries()].map(([c, n]) => (
                <span
                  key={c}
                  className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
                >
                  {CLASSIFICACAO_LABEL[c]} · {n}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold">Status dos ambientes</h3>
          <div className="mt-3 space-y-2">
            {ambientes.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum ambiente cadastrado.</p>
            )}
            {ambientes.slice(0, 6).map((a) => {
              const r = resumoAmbiente(a, pendenciasPorAmbiente[a.id] ?? 0);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAbrirAmbiente(a.id)}
                  className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:bg-muted/40"
                >
                  <span className={cn('h-7 w-1 shrink-0 rounded-full', ACCENT_BAR[r.tom])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.rotulo}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {r.feitas}/{r.total}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Button className="h-14 w-full text-base font-semibold lg:h-12 lg:w-auto lg:px-8" onClick={onContinuar}>
        Continuar vistoria <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
