import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ambiente } from '@/hooks/useRecebimentoChecklist';
import { resumoAmbiente } from '@/lib/recebimento/stats';
import { ACCENT_BAR } from '@/lib/recebimento/ui';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ambientes: Ambiente[];
  ativoId: string | null;
  pendenciasPorAmbiente: Record<string, number>;
  onSelect: (id: string) => void;
}

export function AmbienteSwitchSheet({
  open,
  onOpenChange,
  ambientes,
  ativoId,
  pendenciasPorAmbiente,
  onSelect,
}: Props) {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? ambientes.filter((a) => a.nome.toLowerCase().includes(t)) : ambientes;
  }, [ambientes, busca]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col rounded-t-2xl p-0 sm:mx-auto sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">Ir para ambiente</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Buscar ambiente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {lista.map((a) => {
            const r = resumoAmbiente(a, pendenciasPorAmbiente[a.id] ?? 0);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onSelect(a.id);
                  onOpenChange(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left',
                  a.id === ativoId ? 'border-primary/60 bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <span className={cn('h-8 w-1 shrink-0 rounded-full', ACCENT_BAR[r.tom])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.rotulo}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {r.feitas}/{r.total}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
