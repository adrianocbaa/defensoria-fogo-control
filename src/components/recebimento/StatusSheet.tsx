import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Verificacao } from '@/hooks/useRecebimentoChecklist';
import { STATUS_LABEL, type VerificacaoStatus } from '@/lib/recebimento/constants';
import { STATUS_ICON, STATUS_SOLID } from '@/lib/recebimento/ui';

export interface StatusAlvo {
  verificacao: Verificacao;
  servicoNome: string;
  macroNome: string;
  ambienteNome: string;
}

interface Props {
  alvo: StatusAlvo | null;
  onOpenChange: (o: boolean) => void;
  onSelecionar: (v: Verificacao, status: VerificacaoStatus) => void;
}

const OPCOES: Exclude<VerificacaoStatus, 'nao_vistoriado'>[] = [
  'conforme',
  'nao_conforme',
  'nao_executado',
  'nao_aplica',
];

export function StatusSheet({ alvo, onOpenChange, onSelecionar }: Props) {
  return (
    <Sheet open={!!alvo} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:max-w-md"
      >
        {alvo && (
          <>
            <SheetHeader className="border-b px-4 py-3 text-left">
              <p className="text-xs text-muted-foreground">
                {alvo.ambienteNome} › {alvo.macroNome} › {alvo.servicoNome}
              </p>
              <SheetTitle className="text-base">{alvo.verificacao.descricao_snapshot}</SheetTitle>
            </SheetHeader>

            <div className="space-y-2.5 px-4 py-4">
              {OPCOES.map((s) => {
                const Icon = STATUS_ICON[s];
                const atual = alvo.verificacao.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelecionar(alvo.verificacao, s)}
                    className={cn(
                      'flex h-14 w-full items-center gap-3 rounded-xl px-4 text-base font-semibold transition-colors',
                      STATUS_SOLID[s],
                      atual && 'ring-2 ring-foreground/30 ring-offset-2 ring-offset-background',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}

              {alvo.verificacao.status !== 'nao_vistoriado' && (
                <button
                  type="button"
                  onClick={() => onSelecionar(alvo.verificacao, 'nao_vistoriado')}
                  className="h-12 w-full rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Limpar resposta
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
