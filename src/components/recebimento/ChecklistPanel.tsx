import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Plus,
  MinusCircle,
  AlertTriangle,
  Trash2,
  Copy,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STATUS_CLASS,
  STATUS_DOT,
  STATUS_LABEL,
  type VerificacaoStatus,
} from '@/lib/recebimento/constants';
import type { Ambiente, Verificacao } from '@/hooks/useRecebimentoChecklist';

const STATUS_ORDER: VerificacaoStatus[] = [
  'conforme',
  'nao_conforme',
  'nao_executado',
  'nao_aplica',
];

interface Props {
  ambientes: Ambiente[];
  ambienteAtivoId: string | null;
  onSelecionarAmbiente: (id: string) => void;
  pendenciasPorAmbiente: Record<string, number>;
  somenteLeitura: boolean;
  onSetStatus: (v: Verificacao, status: VerificacaoStatus) => void;
  onMarcarGrupo: (verifs: Verificacao[], status: VerificacaoStatus, sobrescrever: boolean) => void;
  onAdicionarServico: () => void;
  onNovoAmbiente: () => void;
  onDuplicarAmbiente: () => void;
  onRemoverAmbiente: (id: string) => void;
  onRemoverServico: (id: string) => void;
  onFotoGeral: () => void;
}

function progressoAmbiente(a: Ambiente) {
  const todas = a.servicos.flatMap((s) => s.verificacoes);
  const feitas = todas.filter((v) => v.status !== 'nao_vistoriado').length;
  return { total: todas.length, feitas, pct: todas.length ? (feitas / todas.length) * 100 : 0 };
}

export function ChecklistPanel({
  ambientes,
  ambienteAtivoId,
  onSelecionarAmbiente,
  pendenciasPorAmbiente,
  somenteLeitura,
  onSetStatus,
  onMarcarGrupo,
  onAdicionarServico,
  onNovoAmbiente,
  onDuplicarAmbiente,
  onRemoverAmbiente,
  onRemoverServico,
  onFotoGeral,
}: Props) {
  const [confirmar, setConfirmar] = useState<{
    verifs: Verificacao[];
    status: VerificacaoStatus;
    qtd: number;
  } | null>(null);

  const ambiente = ambientes.find((a) => a.id === ambienteAtivoId) ?? null;
  const idx = ambientes.findIndex((a) => a.id === ambienteAtivoId);

  const geral = useMemo(() => {
    const todas = ambientes.flatMap((a) => a.servicos.flatMap((s) => s.verificacoes));
    const feitas = todas.filter((v) => v.status !== 'nao_vistoriado').length;
    return { total: todas.length, feitas, pct: todas.length ? (feitas / todas.length) * 100 : 0 };
  }, [ambientes]);

  const aplicarGrupo = (verifs: Verificacao[], status: VerificacaoStatus) => {
    const jaRespondidas = verifs.filter(
      (v) => v.status !== 'nao_vistoriado' && v.status !== status,
    );
    if (jaRespondidas.length > 0) {
      // aplica só nos não vistoriados; oferece sobrescrever explicitamente
      onMarcarGrupo(verifs, status, false);
      setConfirmar({ verifs, status, qtd: jaRespondidas.length });
      return;
    }
    onMarcarGrupo(verifs, status, false);
  };

  if (ambientes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum ambiente nesta vistoria. Comece criando o primeiro.
        </p>
        <Button className="h-11" onClick={onNovoAmbiente} disabled={somenteLeitura}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar ambiente
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Lista de ambientes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Ambientes</p>
          <Button variant="ghost" size="sm" onClick={onNovoAmbiente} disabled={somenteLeitura}>
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">
          {ambientes.map((a) => {
            const p = progressoAmbiente(a);
            const pend = pendenciasPorAmbiente[a.id] ?? 0;
            const concluido = p.total > 0 && p.feitas === p.total;
            const ativo = a.id === ambienteAtivoId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelecionarAmbiente(a.id)}
                className={cn(
                  'min-w-[190px] shrink-0 rounded-lg border p-3 text-left transition-colors lg:w-full',
                  ativo ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.nome}</span>
                  {concluido ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : p.feitas > 0 ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.feitas}/{p.total}
                    </span>
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                </div>
                <Progress value={p.pct} className="mt-2 h-1.5" />
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {concluido ? 'Concluído' : p.feitas > 0 ? 'Em andamento' : 'Não iniciado'}
                  </span>
                  {pend > 0 && (
                    <Badge variant="outline" className="h-5 gap-1 border-destructive/40 px-1.5 text-[10px] text-destructive">
                      <AlertTriangle className="h-3 w-3" /> {pend}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Card className="hidden p-3 lg:block">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Progresso geral</p>
          <p className="mt-1 text-sm">
            {geral.feitas}/{geral.total} itens verificados
          </p>
          <Progress value={geral.pct} className="mt-2 h-2" />
        </Card>
      </div>

      {/* Checklist do ambiente */}
      <div className="space-y-3 pb-24 lg:pb-0">
        {ambiente && (
          <>
            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{ambiente.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[ambiente.tipo_modelo, ambiente.pavimento].filter(Boolean).join(' · ') ||
                      'Sem modelo definido'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={onDuplicarAmbiente} disabled={somenteLeitura}>
                    <Copy className="mr-1 h-4 w-4" /> Duplicar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoverAmbiente(ambiente.id)}
                    disabled={somenteLeitura}
                    aria-label="Remover ambiente"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {(() => {
                const p = progressoAmbiente(ambiente);
                return (
                  <>
                    <Progress value={p.pct} className="mt-3 h-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.feitas} de {p.total} itens vistoriados · {Math.round(p.pct)}%
                    </p>
                  </>
                );
              })()}
            </Card>

            {ambiente.servicos.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhum serviço neste ambiente.</p>
                <Button className="h-11" onClick={onAdicionarServico} disabled={somenteLeitura}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
                </Button>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {ambiente.servicos.map((s) => {
                  const total = s.verificacoes.length;
                  const conformes = s.verificacoes.filter((v) => v.status === 'conforme').length;
                  const naoConformes = s.verificacoes.filter((v) => v.status === 'nao_conforme').length;
                  const feitas = s.verificacoes.filter((v) => v.status !== 'nao_vistoriado').length;
                  return (
                    <AccordionItem
                      key={s.id}
                      value={s.id}
                      className="overflow-hidden rounded-lg border bg-card"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
                          <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-semibold uppercase">
                              {s.servico_snapshot}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{s.macro_snapshot}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {naoConformes > 0 && (
                              <Badge variant="outline" className="border-destructive/40 text-destructive">
                                {naoConformes}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {feitas === total ? `${conformes}/${total} conforme` : `${feitas}/${total}`}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3">
                        {!somenteLeitura && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="h-10 flex-1"
                              onClick={() => aplicarGrupo(s.verificacoes, 'conforme')}
                            >
                              <Check className="mr-1 h-4 w-4" /> Marcar todos como Conforme
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10"
                              onClick={() => aplicarGrupo(s.verificacoes, 'nao_aplica')}
                            >
                              <MinusCircle className="mr-1 h-4 w-4" /> N/A
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10"
                              onClick={() => onRemoverServico(s.id)}
                              aria-label="Remover serviço"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          {s.verificacoes.map((v) => (
                            <div key={v.id} className="rounded-md border p-2">
                              <div className="mb-2 flex items-center gap-2">
                                <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[v.status])} />
                                <span className="min-w-0 flex-1 text-sm">{v.descricao_snapshot}</span>
                                <span
                                  className={cn(
                                    'shrink-0 rounded border px-1.5 py-0.5 text-[10px]',
                                    STATUS_CLASS[v.status],
                                  )}
                                >
                                  {STATUS_LABEL[v.status]}
                                </span>
                              </div>
                              {!somenteLeitura && (
                                <div className="grid grid-cols-4 gap-1">
                                  {STATUS_ORDER.map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => onSetStatus(v, st)}
                                      className={cn(
                                        'h-10 rounded-md border text-[11px] font-medium transition-colors',
                                        v.status === st
                                          ? STATUS_CLASS[st]
                                          : 'border-border text-muted-foreground hover:bg-muted',
                                      )}
                                    >
                                      {st === 'conforme'
                                        ? 'Conforme'
                                        : st === 'nao_conforme'
                                          ? 'Não conf.'
                                          : st === 'nao_executado'
                                            ? 'Não exec.'
                                            : 'N/A'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            {ambiente.servicos.length > 0 && !somenteLeitura && (
              <Button variant="outline" className="h-11 w-full" onClick={onAdicionarServico}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar serviço
              </Button>
            )}
          </>
        )}
      </div>

      {/* Barra fixa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
        <Button
          variant="outline"
          className="h-12 flex-1"
          disabled={idx <= 0}
          onClick={() => onSelecionarAmbiente(ambientes[idx - 1].id)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="secondary" className="h-12 flex-1" onClick={onFotoGeral} disabled={somenteLeitura}>
          <Camera className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          className="h-12 flex-1"
          disabled={idx < 0 || idx >= ambientes.length - 1}
          onClick={() => onSelecionarAmbiente(ambientes[idx + 1].id)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <AlertDialog open={!!confirmar} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sobrescrever respostas já registradas?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens ainda não vistoriados já foram marcados como{' '}
              {confirmar ? STATUS_LABEL[confirmar.status] : ''}. Existem{' '}
              {confirmar?.qtd} verificação(ões) com resposta anterior — inclusive não conformidades —
              que foram preservadas. Deseja sobrescrevê-las também?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter respostas</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmar) onMarcarGrupo(confirmar.verifs, confirmar.status, true);
                setConfirmar(null);
              }}
            >
              Sobrescrever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
