import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, CircleDot, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMetaHistorico } from '@/hooks/usePlanoExpansao';
import {
  ATENCAO_CLASS,
  ATENCAO_LABEL,
  JORNADAS,
  SITUACAO_CLASS,
  SITUACAO_LABEL,
  formatDateBR,
  type PlanoMeta,
} from '@/lib/planoExpansao';

interface Props {
  meta: PlanoMeta | null;
  onOpenChange: (open: boolean) => void;
}

export function MetaDrawer({ meta, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { historico } = useMetaHistorico(meta?.id);
  const etapas = meta ? (JORNADAS[meta.jornada]?.etapas ?? []) : [];

  return (
    <Sheet open={!!meta} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {meta && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl">{meta.municipio}</SheetTitle>
              <p className="text-sm text-muted-foreground">{meta.tipo_intervencao}</p>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progresso da meta</span>
                  <span className="font-bold text-emerald-700">
                    {Math.min(meta.etapa_index + 1, etapas.length)} de {etapas.length} etapas (
                    {meta.progresso}%)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${Math.min(100, meta.progresso)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Info label="Etapa atual" valor={meta.etapa_atual || etapas[meta.etapa_index] || '—'} />
                <Info label="Previsão de conclusão" valor={formatDateBR(meta.previsao_conclusao)} />
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Situação</p>
                  <Badge variant="outline" className={cn('mt-1', SITUACAO_CLASS[meta.situacao])}>
                    {SITUACAO_LABEL[meta.situacao]}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Nível de atenção</p>
                  <Badge variant="outline" className={cn('mt-1', ATENCAO_CLASS[meta.nivel_atencao])}>
                    {ATENCAO_LABEL[meta.nivel_atencao]}
                  </Badge>
                </div>
              </div>

              {meta.motivo_atencao && (
                <p className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-800">
                  {meta.motivo_atencao}
                </p>
              )}

              <div>
                <p className="mb-2 font-semibold">Jornada do Empreendimento</p>
                <div className="space-y-2">
                  {etapas.map((etapa, idx) => {
                    const concluida = idx < meta.etapa_index;
                    const atual = idx === meta.etapa_index;
                    return (
                      <div key={etapa} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          {concluida ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <CircleDot
                              className={cn(
                                'h-5 w-5',
                                atual ? 'text-emerald-600' : 'text-muted-foreground/50'
                              )}
                            />
                          )}
                          <span className={cn(atual && 'font-semibold text-emerald-700')}>
                            {idx + 1}. {etapa}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            concluida
                              ? 'text-emerald-700'
                              : atual
                                ? 'font-semibold text-emerald-700'
                                : 'text-muted-foreground'
                          )}
                        >
                          {concluida ? 'Concluído' : atual ? 'Em execução' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {meta.obra_id && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Obra vinculada
                    </p>
                    <p className="text-sm font-medium">Acompanhar execução no módulo Obras</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/obras/${meta.obra_id}`)}>
                    Ver obra <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {meta.sei_numero && <Info label="Processo SEI" valor={meta.sei_numero} />}
              {meta.observacoes && <Info label="Observações" valor={meta.observacoes} />}

              <div>
                <p className="mb-2 font-semibold">Histórico de Atualizações</p>
                {historico.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum registro no histórico.</p>
                )}
                <div className="space-y-3">
                  {historico.map((h) => (
                    <div key={h.id} className="border-l-2 border-muted pl-3">
                      <p className="text-sm font-semibold">{formatDateBR(h.data)}</p>
                      <p className="text-sm text-emerald-700">{h.titulo}</p>
                      {h.descricao && (
                        <p className="text-xs text-muted-foreground">{h.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{valor}</p>
    </div>
  );
}
