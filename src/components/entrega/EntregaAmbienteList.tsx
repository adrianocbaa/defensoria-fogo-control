import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { progressoAmbiente } from '@/lib/entrega/resultado';
import type { EntregaAmbiente } from '@/hooks/useEntregaInstitucional';

interface Props {
  ambientes: EntregaAmbiente[];
  ativoId: string | null;
  pendenciasPorAmbiente: Record<string, number>;
  onSelecionar: (id: string) => void;
  onAdicionar?: () => void;
  className?: string;
}

export function EntregaAmbienteList({
  ambientes,
  ativoId,
  pendenciasPorAmbiente,
  onSelecionar,
  onAdicionar,
  className,
}: Props) {
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ambientes;
    return ambientes.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [ambientes, busca]);

  return (
    <Card className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">Ambientes Importados</h2>
        {onAdicionar && (
          <Button variant="ghost" size="sm" onClick={onAdicionar} aria-label="Adicionar ambiente">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ambiente..."
          className="h-11 pl-9"
        />
      </div>

      <div className="space-y-2">
        {lista.map((a) => {
          const { feitas, total, pct } = progressoAmbiente(a);
          const pend = pendenciasPorAmbiente[a.id] ?? 0;
          const ativo = a.id === ativoId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelecionar(a.id)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                ativo ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{a.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    Verificações: {feitas}/{total}
                  </span>
                </span>
                {pend > 0 ? (
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {pend} ⚠
                  </span>
                ) : total > 0 && feitas === total ? (
                  <span className="shrink-0 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    OK
                  </span>
                ) : feitas === 0 ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Pendente
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {lista.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum ambiente encontrado.
          </p>
        )}
      </div>
    </Card>
  );
}
