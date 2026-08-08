import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { STATUS_LABEL, type VerificacaoStatus } from '@/lib/entrega/constants';
import { STATUS_ICON, STATUS_SOLID } from '@/lib/entrega/ui';
import type { EntregaVerificacao } from '@/hooks/useEntregaInstitucional';

export interface StatusAlvo {
  verificacao: EntregaVerificacao;
  grupoNome: string;
  ambienteNome: string;
}

interface Props {
  alvo: StatusAlvo | null;
  onOpenChange: (open: boolean) => void;
  onSelecionar: (status: VerificacaoStatus) => void;
}

const OPCOES: Exclude<VerificacaoStatus, 'nao_vistoriado'>[] = ['conforme', 'pendencia', 'nao_aplica'];

/** Botões grandes para marcação em campo (bottom sheet no mobile). */
export function EntregaStatusSheet({ alvo, onOpenChange, onSelecionar }: Props) {
  return (
    <Sheet open={!!alvo} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        {alvo && (
          <>
            <SheetHeader className="text-left">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {alvo.ambienteNome} · {alvo.grupoNome}
              </p>
              <SheetTitle className="text-base">{alvo.verificacao.descricao_snapshot}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid gap-2 pb-2">
              {OPCOES.map((s) => {
                const Icon = STATUS_ICON[s];
                return (
                  <Button
                    key={s}
                    className={`h-14 justify-start text-base ${STATUS_SOLID[s]}`}
                    onClick={() => onSelecionar(s)}
                  >
                    <Icon className="mr-3 h-5 w-5" /> {STATUS_LABEL[s]}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => onSelecionar('nao_vistoriado')}
              >
                Limpar resposta
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
