import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Video, AlertTriangle, MessageSquareText, MoreHorizontal, Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RdoCalendarDay } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  preenchendo: { label: 'Preenchendo', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  concluido: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  aprovado: { label: 'Aprovado', className: 'bg-emerald-600 text-white border-emerald-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-800 border-red-200' },
};

const WEEKDAY = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function parseYmd(v: string) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmt(v: string) {
  const d = parseYmd(v);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function weekday(v: string) {
  return WEEKDAY[parseYmd(v).getDay()];
}

interface Props {
  obraId: string;
  data: RdoCalendarDay[];
  onOpenDay?: (day: RdoCalendarDay) => void;
  onDelete?: (day: RdoCalendarDay) => void;
  onPrint?: (day: RdoCalendarDay) => void;
  canEdit?: boolean;
}

export function RdoListView({ obraId, data, onOpenDay, onDelete, onPrint, canEdit = true }: Props) {
  const navigate = useNavigate();
  const rows = useMemo(
    () => [...data].sort((a, b) => b.data.localeCompare(a.data)),
    [data],
  );

  const open = (r: RdoCalendarDay) =>
    navigate(`/obras/${obraId}/rdo/diario?data=${r.data}&id=${r.report_id}`);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-home-border bg-home-surface px-6 py-12 text-center text-sm text-home-muted">
        Nenhum RDO no período selecionado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-home-border bg-home-surface">
      <div className="hidden grid-cols-[80px_120px_1fr_140px_repeat(4,72px)_140px_60px] items-center gap-3 border-b border-home-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-home-muted lg:grid">
        <span>RDO</span>
        <span>Data</span>
        <span>Dia da semana</span>
        <span>Status</span>
        <span className="text-center">Fotos</span>
        <span className="text-center">Vídeos</span>
        <span className="text-center">Ocorr.</span>
        <span className="text-center">Coment.</span>
        <span>Ativid.</span>
        <span className="text-right">Ações</span>
      </div>

      <ul className="divide-y divide-home-border">
        {rows.map((r) => {
          const st = STATUS_MAP[r.status] ?? { label: r.status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
          return (
            <li
              key={r.report_id}
              className="grid grid-cols-2 items-center gap-3 px-4 py-3 hover:bg-accent/30 lg:grid-cols-[80px_120px_1fr_140px_repeat(4,72px)_140px_60px]"
            >
              <button
                onClick={() => (onOpenDay ? onOpenDay(r) : open(r))}
                className="text-left font-mono text-sm font-semibold text-primary hover:underline"
              >
                #{r.numero_seq}
              </button>
              <span className="text-sm text-foreground lg:col-span-1">{fmt(r.data)}</span>
              <span className="hidden text-sm text-home-muted lg:inline">{weekday(r.data)}</span>
              <span>
                <Badge variant="outline" className={cn('text-[11px]', st.className)}>
                  {st.label}
                </Badge>
              </span>
              <span className="hidden items-center justify-center gap-1 text-sm lg:inline-flex">
                <Camera className="h-3.5 w-3.5 text-home-muted" /> {r.photo_count}
              </span>
              <span className="hidden items-center justify-center gap-1 text-sm lg:inline-flex">
                <Video className="h-3.5 w-3.5 text-home-muted" /> 0
              </span>
              <span className={cn('hidden items-center justify-center gap-1 text-sm lg:inline-flex', r.occurrence_count > 0 && 'text-red-600 font-semibold')}>
                <AlertTriangle className="h-3.5 w-3.5" /> {r.occurrence_count}
              </span>
              <span className="hidden items-center justify-center gap-1 text-sm lg:inline-flex">
                <MessageSquareText className="h-3.5 w-3.5 text-home-muted" /> {r.comment_count}
              </span>
              <span className="hidden text-sm text-home-muted lg:inline">{r.activity_count} ativ.</span>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => (onOpenDay ? onOpenDay(r) : open(r))}>
                  Ver
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => open(r)}>
                      <Eye className="mr-2 h-4 w-4" /> Abrir RDO
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => open(r)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    )}
                    {onPrint && (
                      <DropdownMenuItem onClick={() => onPrint(r)}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                      </DropdownMenuItem>
                    )}
                    {canEdit && onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(r)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
