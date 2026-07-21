import { AlertTriangle, ClipboardX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function RdoLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-home-border bg-home-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="rounded-xl border border-home-border bg-home-surface p-6">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-home-muted">Carregando dados do relatório...</p>
    </div>
  );
}

export function RdoErrorState({ onRetry, onBack }: { onRetry?: () => void; onBack?: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-home-border bg-home-surface p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Erro ao carregar os dados</h3>
        <p className="mt-1 max-w-md text-sm text-home-muted">
          Não foi possível carregar os relatórios deste período. Verifique sua conexão com a internet e tente
          novamente.
        </p>
      </div>
      <div className="flex gap-2">
        {onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar para Obras
          </Button>
        )}
      </div>
    </div>
  );
}

export function RdoEmptyMonth({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-home-border bg-home-surface p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ClipboardX className="h-6 w-6 text-home-muted" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Nenhum RDO registrado neste mês</h3>
        <p className="mt-1 text-sm text-home-muted">Clique em Novo RDO para começar</p>
      </div>
      {onCreate && <Button onClick={onCreate}>+ Novo RDO</Button>}
    </div>
  );
}
