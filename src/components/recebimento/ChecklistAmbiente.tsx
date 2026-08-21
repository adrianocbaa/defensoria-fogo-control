import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, ChevronDown, Copy, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ambiente, AmbienteServico, Verificacao } from '@/hooks/useRecebimentoChecklist';
import type { VerificacaoStatus } from '@/lib/recebimento/constants';
import { progressoAmbiente } from '@/lib/recebimento/stats';
import { ServicoAccordion } from './ServicoAccordion';

interface Props {
  ambiente: Ambiente;
  somenteLeitura?: boolean;
  fotosPorVerificacao?: Record<string, number>;
  onSelecionarStatus: (v: Verificacao, status: VerificacaoStatus) => void;
  onMarcarPendentes: (servico: AmbienteServico) => void;
  onRemoverServico?: (id: string) => void;
  onAdicionarServico?: () => void;
  onEditarAmbiente?: () => void;
  onDuplicarAmbiente?: () => void;
  onRemoverAmbiente?: (id: string) => void;
  onFoto?: () => void;
  /** Abre o seletor rápido de ambiente (mobile). */
  onTrocarAmbiente?: () => void;
}

export function ChecklistAmbiente({
  ambiente,
  somenteLeitura,
  fotosPorVerificacao,
  onSelecionarStatus,
  onMarcarPendentes,
  onRemoverServico,
  onAdicionarServico,
  onEditarAmbiente,
  onDuplicarAmbiente,
  onRemoverAmbiente,
  onFoto,
  onTrocarAmbiente,
}: Props) {
  const p = useMemo(() => progressoAmbiente(ambiente), [ambiente]);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAbertos({});
  }, [ambiente.id]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-3 backdrop-blur">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onTrocarAmbiente}
              disabled={!onTrocarAmbiente}
              className="flex max-w-full items-center gap-1.5 text-left"
            >
              <h2 className="truncate text-xl font-bold md:text-2xl">{ambiente.nome}</h2>
              {onTrocarAmbiente && (
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground lg:hidden" />
              )}
            </button>
            <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">
              {ambiente.pavimento ? `${ambiente.pavimento} • ` : ''}
              {p.feitas} de {p.total} itens vistoriados
            </p>
          </div>

          <span className="mt-1 shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
            {Math.round(p.pct)}% concluído
          </span>

          {onFoto && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onFoto}
              aria-label="Registrar foto do ambiente"
            >
              <Camera className="h-5 w-5" />
            </Button>
          )}

          {!somenteLeitura && (onAdicionarServico || onEditarAmbiente || onDuplicarAmbiente || onRemoverAmbiente) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label="Ações do ambiente">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onAdicionarServico && (
                  <DropdownMenuItem onClick={onAdicionarServico}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
                  </DropdownMenuItem>
                )}
                {onEditarAmbiente && (
                  <DropdownMenuItem onClick={onEditarAmbiente}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar ambiente
                  </DropdownMenuItem>
                )}
                {onDuplicarAmbiente && (
                  <DropdownMenuItem onClick={onDuplicarAmbiente}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicar ambiente
                  </DropdownMenuItem>
                )}
                {onRemoverAmbiente && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onRemoverAmbiente(ambiente.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover ambiente
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card className="mb-3 p-3">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">
            Progresso do ambiente — {p.feitas} de {p.total} itens
          </span>
          <span className="tabular-nums">{Math.round(p.pct)}%</span>
        </div>
        <Progress value={p.pct} className="mt-2 h-2" />
      </Card>

      <div className="space-y-2.5 pb-2">
        {ambiente.servicos.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum serviço vinculado a este ambiente.
            </p>
            {!somenteLeitura && onAdicionarServico && (
              <Button className="h-11" onClick={onAdicionarServico}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
              </Button>
            )}
          </Card>
        )}

        {ambiente.servicos.map((s, i) => (
          <ServicoAccordion
            key={s.id}
            servico={s}
            indice={i + 1}
            aberto={!!abertos[s.id]}
            onToggle={() => setAbertos((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            somenteLeitura={somenteLeitura}
            fotosPorVerificacao={fotosPorVerificacao}
            onSelecionarStatus={onSelecionarStatus}
            onMarcarPendentes={onMarcarPendentes}
            onRemover={somenteLeitura ? undefined : onRemoverServico}
          />
        ))}

        {ambiente.servicos.length > 0 && !somenteLeitura && onAdicionarServico && (
          <Button
            variant="outline"
            className={cn('h-11 w-full border-dashed')}
            onClick={onAdicionarServico}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
          </Button>
        )}
      </div>
    </div>
  );
}
