import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  AlertTriangle,
  MessageSquareText,
  Camera,
  Video,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import type { RdoCalendarDay } from '@/hooks/useRdoData';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-200' },
  preenchendo: { label: 'Em preenchimento', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  concluido: { label: 'Concluído', className: 'bg-green-100 text-green-800 border-green-200' },
  aprovado: { label: 'Aprovado', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-800 border-red-200' },
};

interface RdoDayDrawerProps {
  obraId: string;
  day: RdoCalendarDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RdoDayDrawer({ obraId, day, open, onOpenChange }: RdoDayDrawerProps) {
  const navigate = useNavigate();

  if (!day) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    );
  }

  const status = STATUS_CONFIG[day.status] ?? {
    label: day.status,
    className: 'bg-gray-100 text-gray-800',
  };

  const dateObj = new Date(day.data + 'T12:00:00');
  const dateLabel = format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const counters = [
    { label: 'Atividades', value: day.activity_count, Icon: ClipboardCheck, color: 'text-blue-500' },
    { label: 'Quantitativos', value: day.quantitativo_count, Icon: BarChart2, color: 'text-purple-500' },
    { label: 'Ocorrências', value: day.occurrence_count, Icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Comentários', value: day.comment_count, Icon: MessageSquareText, color: 'text-purple-500' },
    { label: 'Fotos', value: day.photo_count, Icon: Camera, color: 'text-orange-500' },
    { label: 'Vídeos', value: 0, Icon: Video, color: 'text-pink-500' },
  ];

  const openFull = () => {
    onOpenChange(false);
    navigate(`/obras/${obraId}/rdo/diario?data=${day.data}&id=${day.report_id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              RDO #{day.numero_seq}
            </Badge>
            <Badge className={cn('border', status.className)}>{status.label}</Badge>
          </div>
          <SheetTitle className="text-xl">{dateLabel}</SheetTitle>
          <SheetDescription>
            Resumo com os dados já carregados. Para clima, equipe detalhada e quantitativos completos,
            abra o RDO.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {counters.map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="rounded-lg border bg-card p-3 flex items-center gap-3"
            >
              <Icon className={cn('h-5 w-5 shrink-0', color)} />
              <div className="min-w-0">
                <p className="text-xl font-semibold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {day.was_rejected && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Este RDO foi reprovado anteriormente pela fiscalização.
            </div>
          )}
          {day.assinatura_contratada_validado_em && !day.assinatura_fiscal_validado_em && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Aguardando assinatura do Fiscal.
            </div>
          )}
          {day.assinatura_fiscal_validado_em && !day.assinatura_contratada_validado_em && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              Aguardando assinatura da Contratada.
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={openFull} className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            Ver RDO completo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
