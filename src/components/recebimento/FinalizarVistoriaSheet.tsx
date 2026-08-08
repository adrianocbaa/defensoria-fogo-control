import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Circle, MinusCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vistoriados: number;
  naoVistoriados: number;
  pendenciasAbertas: number;
  naoExecutados: number;
  onVerPendentes: () => void;
  onFinalizar: () => void;
}

export function FinalizarVistoriaSheet({
  open,
  onOpenChange,
  vistoriados,
  naoVistoriados,
  pendenciasAbertas,
  naoExecutados,
  onVerPendentes,
  onFinalizar,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">Finalizar vistoria</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          <div className="space-y-2 rounded-xl border p-3 text-sm">
            <Linha
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              texto={`${vistoriados} itens vistoriados`}
            />
            <Linha
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              texto={`${pendenciasAbertas} pendência(s) em aberto`}
            />
            <Linha
              icon={<MinusCircle className="h-4 w-4 text-amber-600" />}
              texto={`${naoExecutados} itens não executados`}
            />
            <Linha
              icon={<Circle className="h-4 w-4 text-muted-foreground" />}
              texto={`${naoVistoriados} itens não vistoriados`}
            />
          </div>

          {naoVistoriados > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              Existem {naoVistoriados} itens ainda não vistoriados. Ao finalizar, eles permanecerão
              registrados como não vistoriados no relatório.
            </div>
          )}

          <div className="space-y-2">
            {naoVistoriados > 0 && (
              <Button variant="outline" className="h-12 w-full" onClick={onVerPendentes}>
                Ver itens pendentes
              </Button>
            )}
            <Button className="h-12 w-full" onClick={onFinalizar}>
              {naoVistoriados > 0 ? 'Finalizar mesmo assim' : 'Finalizar vistoria'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Linha({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{texto}</span>
    </div>
  );
}
