import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ambiente } from '@/hooks/useRecebimentoChecklist';
import { resumoAmbiente } from '@/lib/recebimento/stats';
import { ACCENT_BAR } from '@/lib/recebimento/ui';

interface Props {
  ambientes: Ambiente[];
  ativoId: string | null;
  onSelect: (id: string) => void;
  pendenciasPorAmbiente: Record<string, number>;
  onNovoAmbiente?: () => void;
  /** Exibe cabeçalho com contagem e progresso geral. */
  header?: boolean;
  className?: string;
}

export function AmbienteList({
  ambientes,
  ativoId,
  onSelect,
  pendenciasPorAmbiente,
  onNovoAmbiente,
  header = true,
  className,
}: Props) {
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return ambientes;
    return ambientes.filter((a) => a.nome.toLowerCase().includes(t));
  }, [ambientes, busca]);

  const concluidos = ambientes.filter((a) => {
    const r = resumoAmbiente(a, pendenciasPorAmbiente[a.id] ?? 0);
    return r.total > 0 && r.feitas === r.total && !pendenciasPorAmbiente[a.id];
  }).length;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {header && (
        <div className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Ambientes ({ambientes.length})</h2>
            {onNovoAmbiente && (
              <Button variant="ghost" size="icon" onClick={onNovoAmbiente} aria-label="Novo ambiente">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Buscar ambiente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {concluidos} de {ambientes.length} concluídos
            </p>
            <Progress
              value={ambientes.length ? (concluidos / ambientes.length) * 100 : 0}
              className="mt-1.5 h-1.5"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
        {lista.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {ambientes.length ? 'Nenhum ambiente encontrado.' : 'Nenhum ambiente cadastrado ainda.'}
          </p>
        )}
        {lista.map((a) => {
          const r = resumoAmbiente(a, pendenciasPorAmbiente[a.id] ?? 0);
          const ativo = a.id === ativoId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              aria-current={ativo ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 text-left transition-colors',
                ativo
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                  : 'hover:bg-muted/50',
              )}
            >
              <span className={cn('h-9 w-1 shrink-0 rounded-full', ACCENT_BAR[r.tom])} />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-semibold', ativo && 'text-primary')}>
                  {a.nome}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.rotulo}</p>
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {r.feitas}/{r.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
