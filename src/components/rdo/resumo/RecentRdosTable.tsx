import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RdoRecente } from '@/hooks/useRdoData';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  preenchendo: { label: 'Pendente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  concluido: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  aprovado: { label: 'Aprovado', className: 'bg-emerald-600 text-white border-emerald-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-800 border-red-200' },
};

function parseYmd(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmt(v: string) {
  const d = parseYmd(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

interface Props {
  obraId: string;
  data?: RdoRecente[];
  isLoading: boolean;
  onSeeAll?: () => void;
}

export function RecentRdosTable({ obraId, data, isLoading, onSeeAll }: Props) {
  const navigate = useNavigate();

  return (
    <section className="rounded-xl border border-home-border bg-home-surface">
      <header className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Relatórios Recentes</h2>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todos
          </button>
        )}
      </header>

      <div className="border-t border-home-border">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-home-muted">Nenhum relatório recente.</p>
        ) : (
          <ul className="divide-y divide-home-border">
            <li className="hidden grid-cols-[64px_120px_120px_60px_60px_1fr_60px] items-center gap-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-home-muted md:grid">
              <span>RDO</span>
              <span>Data</span>
              <span>Status</span>
              <span className="text-center">Fotos</span>
              <span className="text-center">Ocorr.</span>
              <span>Responsável</span>
              <span className="text-right">Ação</span>
            </li>
            {data.map((r) => {
              const st = STATUS_MAP[r.status] ?? { label: r.status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-2 items-center gap-3 px-5 py-3 hover:bg-accent/30 md:grid-cols-[64px_120px_120px_60px_60px_1fr_60px]"
                >
                  <span className="font-mono text-sm font-semibold text-primary">#{r.numero_seq}</span>
                  <span className="text-sm text-foreground">{fmt(r.data)}</span>
                  <span>
                    <Badge variant="outline" className={cn('text-[11px]', st.className)}>
                      {st.label}
                    </Badge>
                  </span>
                  <span className="hidden items-center justify-center gap-1 text-sm md:inline-flex">
                    <Camera className="h-3.5 w-3.5 text-home-muted" /> {r.photo_count}
                  </span>
                  <span className="hidden items-center justify-center gap-1 text-sm text-home-muted md:inline-flex">
                    <AlertTriangle className="h-3.5 w-3.5" /> 0
                  </span>
                  <span className="hidden text-sm text-home-muted md:inline">—</span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/obras/${obraId}/rdo/diario?data=${r.data}&id=${r.id}`)
                    }
                    className="justify-self-end text-sm font-medium text-primary hover:underline"
                  >
                    Ver
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
