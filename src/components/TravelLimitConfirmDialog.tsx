import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LimitViolation } from '@/lib/travelDaysLimit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: LimitViolation[];
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Diálogo exibido quando uma viagem faria o(s) servidor(es) ultrapassar o
 *  limite mensal de dias de deslocamento. Requer anuência explícita. */
export function TravelLimitConfirmDialog({ open, onOpenChange, violations, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limite de diárias mensais ultrapassado</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                O agendamento faria os seguintes servidores ultrapassarem o limite mensal de{' '}
                <strong>10 diárias</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {violations.map((v) => (
                  <li key={`${v.managerId}-${v.monthKey}`}>
                    <strong>{v.managerName}</strong> — {v.monthLabel}: já possui {v.usedBefore} diária(s),
                    esta viagem adiciona {v.added}, totalizando{' '}
                    <strong className="text-destructive">{v.totalAfter}</strong> diárias (limite {v.limit}).
                  </li>
                ))}
              </ul>
              <p className="pt-2">
                Existe anuência da administração superior para seguir com a demanda? Caso não haja,
                troque o servidor ou deixe a viagem como <em>sem previsão</em>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Não, revisar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sim, há anuência — continuar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
