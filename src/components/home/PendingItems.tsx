import { AlertCircle } from 'lucide-react';

export function PendingItems() {
  return (
    <div className="rounded-2xl border border-home-pending-border bg-home-pending-bg p-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-home-pending-fg" strokeWidth={1.75} />
        <h3 className="text-base font-semibold text-home-pending-fg">Pendências</h3>
      </div>
      <p className="mt-3 text-sm text-home-pending-fg/85">
        Nenhuma pendência no momento.
      </p>
    </div>
  );
}
