import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { EntregaAmbienteList } from './EntregaAmbienteList';
import { EntregaGrupoAccordion } from './EntregaGrupoAccordion';
import { EntregaResumoLateral } from './EntregaResumoLateral';
import { progressoAmbiente } from '@/lib/entrega/resultado';
import type {
  EntregaAmbiente,
  EntregaGrupo,
  EntregaPendencia,
  EntregaVerificacao,
} from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto } from '@/hooks/useEntregaPendencias';

interface Props {
  ambientes: EntregaAmbiente[];
  ambienteAtivoId: string | null;
  pendencias: EntregaPendencia[];
  pendenciasPorAmbiente: Record<string, number>;
  fotos: EntregaFoto[];
  somenteLeitura: boolean;
  onSelecionarAmbiente: (id: string) => void;
  onAbrirVerificacao: (v: EntregaVerificacao, grupo: EntregaGrupo) => void;
  onMarcarConformes: (grupo: EntregaGrupo) => void;
  onRemoverGrupo: (grupoId: string) => void;
  onAdicionarAmbiente: () => void;
  onAdicionarServico: () => void;
  onFotoGeral: () => void;
  onAbrirPendencias: () => void;
  onNavegarAmbiente: (delta: number) => void;
}

export function EntregaChecklistView({
  ambientes,
  ambienteAtivoId,
  pendencias,
  pendenciasPorAmbiente,
  fotos,
  somenteLeitura,
  onSelecionarAmbiente,
  onAbrirVerificacao,
  onMarcarConformes,
  onRemoverGrupo,
  onAdicionarAmbiente,
  onAdicionarServico,
  onFotoGeral,
  onAbrirPendencias,
  onNavegarAmbiente,
}: Props) {
  const ambiente = ambientes.find((a) => a.id === ambienteAtivoId) ?? null;
  const prog = ambiente ? progressoAmbiente(ambiente) : { feitas: 0, total: 0, pct: 0 };
  const idx = ambientes.findIndex((a) => a.id === ambienteAtivoId);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(280px,340px)]">
      <EntregaAmbienteList
        ambientes={ambientes}
        ativoId={ambienteAtivoId}
        pendenciasPorAmbiente={pendenciasPorAmbiente}
        onSelecionar={onSelecionarAmbiente}
        onAdicionar={somenteLeitura ? undefined : onAdicionarAmbiente}
        className="self-start"
      />

      <Card className="flex min-w-0 flex-col gap-4 p-4">
        {ambiente ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{ambiente.nome}</h2>
                <p className="text-sm text-muted-foreground">Checklist de Entrega Institucional</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Progresso: {prog.feitas}/{prog.total} ({Math.round(prog.pct)}%)
              </span>
            </div>

            <Progress value={prog.pct} className="h-2" />

            <div className="space-y-2.5">
              {ambiente.grupos.map((g, i) => (
                <EntregaGrupoAccordion
                  key={g.id}
                  grupo={g}
                  pendencias={pendencias}
                  somenteLeitura={somenteLeitura}
                  defaultAberto={i === 0}
                  onAbrirVerificacao={onAbrirVerificacao}
                  onMarcarConformes={onMarcarConformes}
                  onRemoverGrupo={somenteLeitura ? undefined : onRemoverGrupo}
                />
              ))}
              {ambiente.grupos.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum grupo de verificação neste ambiente.
                </p>
              )}
            </div>

            {!somenteLeitura && (
              <Button variant="outline" className="h-11" onClick={onAdicionarServico}>
                <Layers className="mr-2 h-4 w-4" /> Adicionar serviço complementar
              </Button>
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="ghost"
                onClick={() => onNavegarAmbiente(-1)}
                disabled={idx <= 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Ambiente {idx + 1} de {ambientes.length}
              </span>
              <Button
                variant="ghost"
                onClick={() => onNavegarAmbiente(1)}
                disabled={idx < 0 || idx >= ambientes.length - 1}
              >
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Selecione um ambiente para iniciar a vistoria.
          </p>
        )}
      </Card>

      <div className="hidden xl:block">
        <EntregaResumoLateral
          ambiente={ambiente}
          pendencias={pendencias}
          fotos={fotos}
          somenteLeitura={somenteLeitura}
          onFotoGeral={onFotoGeral}
          onAbrirPendencias={onAbrirPendencias}
        />
      </div>

      {/* Tablet/mobile: resumo abaixo do checklist */}
      <div className="xl:hidden lg:col-span-2">
        <EntregaResumoLateral
          ambiente={ambiente}
          pendencias={pendencias}
          fotos={fotos}
          somenteLeitura={somenteLeitura}
          onFotoGeral={onFotoGeral}
          onAbrirPendencias={onAbrirPendencias}
        />
      </div>
    </div>
  );
}
