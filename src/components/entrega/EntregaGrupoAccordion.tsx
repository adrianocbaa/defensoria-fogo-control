import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCheck, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntregaVerificacaoItem } from './EntregaVerificacaoItem';
import type {
  EntregaGrupo,
  EntregaPendencia,
  EntregaVerificacao,
} from '@/hooks/useEntregaInstitucional';
import { ABERTAS } from '@/lib/entrega/constants';

interface Props {
  grupo: EntregaGrupo;
  pendencias: EntregaPendencia[];
  somenteLeitura: boolean;
  defaultAberto?: boolean;
  onAbrirVerificacao: (v: EntregaVerificacao, grupo: EntregaGrupo) => void;
  onMarcarConformes: (grupo: EntregaGrupo) => void;
  onRemoverGrupo?: (grupoId: string) => void;
}

export function EntregaGrupoAccordion({
  grupo,
  pendencias,
  somenteLeitura,
  defaultAberto = false,
  onAbrirVerificacao,
  onMarcarConformes,
  onRemoverGrupo,
}: Props) {
  const [aberto, setAberto] = useState(defaultAberto);

  const total = grupo.verificacoes.length;
  const feitas = grupo.verificacoes.filter((v) => v.status !== 'nao_vistoriado').length;
  const abertas = pendencias.filter(
    (p) => p.ambiente_grupo_id === grupo.id && ABERTAS.includes(p.situacao),
  );
  const impeditiva = abertas.some((p) => p.impacto === 'impeditiva');
  const completo = total > 0 && feitas === total && abertas.length === 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-colors',
        aberto && 'border-primary/50 ring-1 ring-primary/20',
      )}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold uppercase tracking-wide">
            {grupo.grupo_snapshot}
          </span>
          <span className="block text-xs text-muted-foreground">
            {feitas}/{total} itens
            {abertas.length > 0 &&
              ` · ${abertas.length} pendência${abertas.length > 1 ? 's' : ''}${impeditiva ? ' impeditiva' : ''}`}
          </span>
        </span>

        {impeditiva ? (
          <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
            Impeditiva
          </span>
        ) : abertas.length > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
            Pendência
          </span>
        ) : completo ? (
          <span className="shrink-0 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            OK
          </span>
        ) : null}

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            aberto && 'rotate-180',
          )}
        />
      </button>

      {aberto && (
        <div className="border-t px-1.5 py-1.5">
          {grupo.verificacoes.map((v) => (
            <EntregaVerificacaoItem
              key={v.id}
              verificacao={v}
              somenteLeitura={somenteLeitura}
              temPendenciaAberta={abertas.some((p) => p.verificacao_id === v.id)}
              onClick={() => onAbrirVerificacao(v, grupo)}
            />
          ))}

          {!somenteLeitura && (
            <div className="flex flex-wrap gap-2 px-2 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMarcarConformes(grupo)}
              >
                <CheckCheck className="mr-2 h-4 w-4" /> Marcar pendentes como Conforme
              </Button>
              {onRemoverGrupo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => onRemoverGrupo(grupo.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remover grupo
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
