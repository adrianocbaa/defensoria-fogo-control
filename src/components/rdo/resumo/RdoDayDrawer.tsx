import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, MessageSquareText, AlertTriangle, ClipboardCheck, Video, Pencil, Eye } from 'lucide-react';
import type { RdoCalendarDay } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
  preenchendo: { label: 'Preenchendo', className: 'bg-amber-100 text-amber-800' },
  concluido: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-800' },
  aprovado: { label: 'Aprovado', className: 'bg-emerald-600 text-white' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-800' },
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
  day: RdoCalendarDay | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canEdit?: boolean;
}

export function RdoDayDrawer({ obraId, day, open, onOpenChange, canEdit }: Props) {
  const navigate = useNavigate();
  if (!day) return null;
  const st = STATUS_MAP[day.status] ?? { label: day.status, className: 'bg-slate-100 text-slate-700' };

  const goToRdo = () => {
    onOpenChange(false);
    navigate(`/obras/${obraId}/rdo/diario?data=${day.data}&id=${day.report_id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <span className="font-mono text-base">RDO #{day.numero_seq}</span>
            <span className="text-home-muted">—</span>
            <span className="text-base">{fmt(day.data)}</span>
          </SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge className={cn('border-0', st.className)}>{st.label}</Badge>
            {day.was_rejected && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                Já reprovado
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-home-muted">Resumo do dia</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatRow icon={ClipboardCheck} label="Atividades" value={day.activity_count} />
              <StatRow icon={AlertTriangle} label="Ocorrências" value={day.occurrence_count} tone={day.occurrence_count > 0 ? 'text-red-600' : undefined} />
              <StatRow icon={Camera} label="Fotos" value={day.photo_count} />
              <StatRow icon={MessageSquareText} label="Comentários" value={day.comment_count} />
              <StatRow icon={ClipboardCheck} label="Com quantitativo" value={day.quantitativo_count} />
              <StatRow icon={Video} label="Vídeos" value={0} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-home-muted">Assinaturas</h3>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center justify-between rounded-md border border-home-border px-3 py-2">
                <span>Fiscal</span>
                <span className={cn('text-xs font-medium', day.assinatura_fiscal_validado_em ? 'text-emerald-600' : 'text-home-muted')}>
                  {day.assinatura_fiscal_validado_em ? 'Assinado' : 'Pendente'}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-md border border-home-border px-3 py-2">
                <span>Contratada</span>
                <span className={cn('text-xs font-medium', day.assinatura_contratada_validado_em ? 'text-emerald-600' : 'text-home-muted')}>
                  {day.assinatura_contratada_validado_em ? 'Assinado' : 'Pendente'}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={goToRdo}>
            <Eye className="mr-2 h-4 w-4" /> Ver RDO completo
          </Button>
          {canEdit && (
            <Button variant="outline" className="w-full" onClick={goToRdo}>
              <Pencil className="mr-2 h-4 w-4" /> Editar RDO
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatRow({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-home-border px-3 py-2">
      <Icon className={cn('h-4 w-4 text-home-muted', tone)} />
      <div className="min-w-0">
        <p className="text-[11px] text-home-muted">{label}</p>
        <p className={cn('text-sm font-semibold text-foreground', tone)}>{value}</p>
      </div>
    </div>
  );
}
