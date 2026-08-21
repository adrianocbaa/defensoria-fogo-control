import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  formatCompactBRL,
  type ObraIndicador,
  type ResumoCarteira,
  type MunicipioResumo,
  type Marco,
  type IndicadoresHistoricos,
} from '@/lib/dashboardExecutivo';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDot,
  Clock,
  MapPin,
  Pause,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/* Atenção da Administração                                            */
/* ------------------------------------------------------------------ */

export function AtencaoAdministracao({ indicadores }: { indicadores: ObraIndicador[] }) {
  const navigate = useNavigate();
  const criticos = indicadores.filter((i) => i.risco === 'critico');
  const atencao = indicadores.filter((i) => i.risco === 'atencao');
  const lista = [...criticos, ...atencao].slice(0, 6);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Atenção da Administração</CardTitle>
        <p className="text-sm text-muted-foreground">
          Situações que podem exigir acompanhamento ou decisão da gestão
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma obra em situação de atenção no momento.
          </p>
        )}
        {lista.map((i) => (
          <div
            key={i.obra.id}
            className={cn(
              'rounded-lg border p-4',
              i.risco === 'critico'
                ? 'border-rose-200 bg-rose-50/70 dark:bg-rose-950/20'
                : 'border-amber-200 bg-amber-50/70 dark:bg-amber-950/20'
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{i.obra.nome}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold uppercase',
                  i.risco === 'critico'
                    ? 'border-rose-300 text-rose-700'
                    : 'border-amber-300 text-amber-700'
                )}
              >
                {i.risco === 'critico' ? 'Risco alto' : 'Atenção'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {i.prazoConsumido}% do prazo consumido · {i.execucaoFisica}% executado · Desvio:{' '}
              {i.desvio} p.p.
            </p>
            {i.motivo && <p className="mt-1 text-sm">{i.motivo}</p>}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-2"
              onClick={() => navigate(`/obras/${i.obra.id}`)}
            >
              Ver obra <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Execução das obras: físico x prazo                                  */
/* ------------------------------------------------------------------ */

export function ExecucaoObras({ indicadores }: { indicadores: ObraIndicador[] }) {
  const navigate = useNavigate();
  const lista = indicadores
    .filter((i) => i.obra.status === 'em_andamento' || i.obra.status === 'paralisada')
    .sort((a, b) => a.desvio - b.desvio)
    .slice(0, 8);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Execução das Obras</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparativo entre avanço da obra e consumo do prazo contratual
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {lista.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma obra em execução no filtro atual.
          </p>
        )}
        {lista.map((i) => (
          <div
            key={i.obra.id}
            className={cn(
              'rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/60',
              i.risco === 'critico' && 'bg-rose-50/70 dark:bg-rose-950/20'
            )}
            onClick={() => navigate(`/obras/${i.obra.id}`)}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{i.obra.nome}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase',
                  i.desvio <= -20
                    ? 'border-rose-300 text-rose-700'
                    : i.desvio <= -10
                      ? 'border-amber-300 text-amber-700'
                      : 'border-emerald-300 text-emerald-700'
                )}
              >
                {i.desvio <= -20 ? 'Desvio crítico' : i.desvio <= -10 ? 'Atenção' : 'No prazo'}
              </Badge>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      i.desvio <= -20 ? 'bg-rose-500' : 'bg-emerald-600'
                    )}
                    style={{ width: `${Math.min(100, i.execucaoFisica)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Executado: {i.execucaoFisica}%
                </p>
              </div>
              <div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{ width: `${Math.min(100, i.prazoConsumido)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Prazo consumido: {i.prazoConsumido}%
                </p>
              </div>
            </div>
            <p
              className={cn(
                'mt-1 text-sm font-semibold',
                i.desvio < 0 ? 'text-rose-600' : 'text-emerald-600'
              )}
            >
              {i.desvio} p.p. de desvio
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Panorama financeiro                                                 */
/* ------------------------------------------------------------------ */

export function PanoramaFinanceiro({ resumo }: { resumo: ResumoCarteira }) {
  const blocos = [
    { label: 'Valor inicial contratado', valor: formatCompactBRL(resumo.valorInicial) },
    {
      label: 'Acréscimos',
      valor: `+${formatCompactBRL(resumo.acrescimos)}`,
      className: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/20',
    },
    {
      label: 'Supressões',
      valor: `-${formatCompactBRL(resumo.supressoes)}`,
      className: 'border-rose-200 bg-rose-50/70 text-rose-700 dark:bg-rose-950/20',
    },
    {
      label: 'Valor atualizado',
      valor: formatCompactBRL(resumo.valorAtualizado),
      hint: 'Valor final com aditivos',
    },
    {
      label: 'Valor executado',
      valor: formatCompactBRL(resumo.valorExecutado),
      hint: `${resumo.percentualExecutado.toFixed(1)}% realizado`,
    },
    {
      label: 'Saldo contratual',
      valor: formatCompactBRL(resumo.saldo),
      hint: `${(100 - resumo.percentualExecutado).toFixed(1)}% pendente de medição`,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Panorama Financeiro</CardTitle>
        <p className="text-sm text-muted-foreground">
          Demonstrativo global da alocação de recursos contratados, execuções e saldos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {blocos.map((b) => (
            <div key={b.label} className={cn('rounded-lg border p-3', b.className)}>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                {b.label}
              </p>
              <p className="mt-1 text-lg font-bold">{b.valor}</p>
              {b.hint && <p className="text-xs text-muted-foreground">{b.hint}</p>}
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-emerald-700">
              {resumo.percentualExecutado.toFixed(1)}% executado
            </span>
            <span className="text-muted-foreground">
              {(100 - resumo.percentualExecutado).toFixed(1)}% saldo restante
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.min(100, resumo.percentualExecutado)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Situação das obras                                                  */
/* ------------------------------------------------------------------ */

export function SituacaoObras({
  resumo,
  onSelect,
}: {
  resumo: ResumoCarteira;
  onSelect?: (status: string) => void;
}) {
  const linhas = [
    { label: 'Em andamento', valor: resumo.ativas, icon: PlayCircle, color: 'text-emerald-600', status: 'em_andamento' },
    { label: 'Aguardando início', valor: resumo.aguardandoInicio, icon: Clock, color: 'text-sky-600', status: 'planejada' },
    { label: 'Em atenção', valor: resumo.emAtencao + resumo.criticas, icon: AlertTriangle, color: 'text-amber-600', status: 'atencao' },
    { label: 'Paralisadas', valor: resumo.paralisadas, icon: Pause, color: 'text-rose-600', status: 'paralisada' },
    { label: 'Concluídas no exercício', valor: resumo.concluidasNoAno, icon: CheckCircle2, color: 'text-emerald-700', status: 'concluida' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Situação das Obras</CardTitle>
        <p className="text-sm text-muted-foreground">
          Status operacional das {resumo.totalObras} obras do portfólio
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {linhas.map((l) => (
          <button
            key={l.label}
            type="button"
            onClick={() => onSelect?.(l.status)}
            className="flex w-full items-center justify-between border-b py-3 text-left last:border-0 hover:bg-muted/50"
          >
            <span className="flex items-center gap-3">
              <l.icon className={cn('h-4 w-4', l.color)} />
              <span className="text-sm">{l.label}</span>
            </span>
            <span className="text-base font-bold">{l.valor}</span>
          </button>
        ))}
        <div className="flex items-center justify-between pt-3 text-sm">
          <span className="text-muted-foreground">Total sob gestão</span>
          <span className="font-bold">{resumo.totalObras} obras</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Impacto dos aditivos                                                */
/* ------------------------------------------------------------------ */

export function ImpactoAditivos({
  resumo,
  indicadores,
}: {
  resumo: ResumoCarteira;
  indicadores: ObraIndicador[];
}) {
  const maiores = indicadores
    .filter((i) => i.valorAditivado !== 0 && i.valorContratado > 0)
    .sort(
      (a, b) =>
        Math.abs(b.valorAditivado / b.valorContratado) -
        Math.abs(a.valorAditivado / a.valorContratado)
    )
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Impacto dos Aditivos Contratuais</CardTitle>
        <p className="text-sm text-muted-foreground">
          Variações acumuladas em relação ao plano orçamentário original
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Acréscimos" valor={formatCompactBRL(resumo.acrescimos)} tone="success" />
          <Mini label="Supressões" valor={formatCompactBRL(resumo.supressoes)} tone="danger" />
          <Mini
            label="Impacto líquido"
            valor={formatCompactBRL(resumo.acrescimos - resumo.supressoes)}
            tone="success"
          />
          <Mini
            label="Variação"
            valor={`${resumo.variacaoAditivos >= 0 ? '+' : ''}${resumo.variacaoAditivos.toFixed(1)}%`}
            tone={resumo.variacaoAditivos > 25 ? 'danger' : 'default'}
          />
        </div>
        {resumo.variacaoAditivos > 25 && (
          <p className="rounded-md border border-rose-200 bg-rose-50/70 p-2 text-xs text-rose-700">
            Variação acumulada acima de 25% — limite de referência da Lei 14.133/2021.
          </p>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Obras com maiores alterações contratuais</p>
          <div className="space-y-2">
            {maiores.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aditivo registrado.</p>
            )}
            {maiores.map((i) => {
              const variacao = (i.valorAditivado / i.valorContratado) * 100;
              return (
                <div
                  key={i.obra.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
                >
                  <span className="font-medium">{i.obra.nome}</span>
                  <span className="flex items-center gap-4 text-muted-foreground">
                    <span>{formatCurrency(i.valorContratado)}</span>
                    <span
                      className={cn(
                        'font-semibold',
                        variacao >= 25 ? 'text-rose-600' : 'text-emerald-700'
                      )}
                    >
                      {variacao >= 0 ? '+' : ''}
                      {variacao.toFixed(1)}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  valor,
  tone = 'default',
}: {
  label: string;
  valor: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2',
        tone === 'success' && 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20',
        tone === 'danger' && 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/20'
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold">{valor}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contratos próximos do término                                       */
/* ------------------------------------------------------------------ */

export function ContratosProximosTermino({ indicadores }: { indicadores: ObraIndicador[] }) {
  const navigate = useNavigate();
  const lista = indicadores
    .filter(
      (i) =>
        i.obra.status !== 'concluida' &&
        i.diasRestantes !== null &&
        i.diasRestantes <= 90 &&
        i.diasRestantes >= -365
    )
    .sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));

  const faixa = (d: number) => (d < 0 ? 'vencido' : d <= 30 ? '30' : d <= 60 ? '60' : '90');
  const contar = (f: string) => lista.filter((i) => faixa(i.diasRestantes ?? 0) === f).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Contratos Próximos do Término</CardTitle>
        <p className="text-sm text-muted-foreground">
          Acompanhamento preventivo dos prazos contratuais de vigência
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Vencidos" valor={String(contar('vencido'))} tone="danger" />
          <Mini label="Próximos 30 dias" valor={String(contar('30'))} tone="danger" />
          <Mini label="31 a 60 dias" valor={String(contar('60'))} />
          <Mini label="61 a 90 dias" valor={String(contar('90'))} />
        </div>
        <div className="space-y-2">
          {lista.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum contrato com vencimento nos próximos 90 dias.
            </p>
          )}
          {lista.slice(0, 6).map((i) => (
            <button
              key={i.obra.id}
              onClick={() => navigate(`/obras/${i.obra.id}`)}
              className="flex w-full flex-wrap items-center justify-between gap-2 border-b pb-2 text-left text-sm last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{i.obra.nome}</p>
                <p className="text-xs text-muted-foreground">{i.obra.municipio}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{i.execucaoFisica}% exec.</span>
                <span
                  className={cn(
                    'font-semibold',
                    (i.diasRestantes ?? 0) <= 30 ? 'text-rose-600' : 'text-emerald-700'
                  )}
                >
                  {(i.diasRestantes ?? 0) < 0
                    ? `${Math.abs(i.diasRestantes ?? 0)} dias de atraso`
                    : `${i.diasRestantes} dias`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Distribuição por município                                          */
/* ------------------------------------------------------------------ */

export function DistribuicaoMunicipios({ dados }: { dados: MunicipioResumo[] }) {
  const max = Math.max(1, ...dados.map((d) => d.contratado));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" /> Distribuição dos Investimentos por Município
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranking por volume financeiro contratado
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {dados.slice(0, 10).map((d, idx) => (
          <div key={d.municipio}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {idx + 1}. {d.municipio}{' '}
                <span className="text-xs text-muted-foreground">({d.obras} obras)</span>
              </span>
              <span className="font-semibold">{formatCompactBRL(d.contratado)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${(d.contratado / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Próximos marcos                                                     */
/* ------------------------------------------------------------------ */

export function ProximosMarcos({ marcos }: { marcos: Marco[] }) {
  const navigate = useNavigate();
  if (marcos.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5" /> Próximos Marcos da Carteira
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Eventos contratuais e entregas previstas
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {marcos.map((m, i) => (
          <button
            key={`${m.obraId}-${i}`}
            onClick={() => navigate(`/obras/${m.obraId}`)}
            className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <CircleDot
                className={cn(
                  'h-4 w-4',
                  m.tipo === 'inicio' ? 'text-sky-600' : 'text-amber-600'
                )}
              />
              <span className="text-sm font-bold uppercase">
                {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            <p className="mt-2 text-sm">{m.titulo}</p>
            <Badge variant="outline" className="mt-2 text-[10px] uppercase">
              {m.tipo === 'inicio' ? 'Início' : 'Prazo contratual'}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Indicadores de desempenho                                           */
/* ------------------------------------------------------------------ */

export function IndicadoresDesempenho({ dados }: { dados: IndicadoresHistoricos }) {
  const itens = [
    { valor: `${dados.taxaConclusao.toFixed(0)}%`, label: 'Obras concluídas' },
    { valor: `${dados.concluidasNoPrazo.toFixed(0)}%`, label: 'Concluídas no prazo' },
    { valor: `${dados.concluidasNoValor.toFixed(0)}%`, label: 'Concluídas no valor' },
    { valor: `${dados.acrescimoMedio.toFixed(1)}%`, label: 'Acréscimo médio' },
    { valor: `${dados.prazoMedioDias} dias`, label: 'Prazo médio de execução' },
    { valor: formatCompactBRL(dados.totalInvestido), label: 'Total executado' },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Indicadores de Desempenho</CardTitle>
        <p className="text-sm text-muted-foreground">
          Análise consolidada de eficiência e custos da carteira
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {itens.map((i) => (
          <div key={i.label} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xl font-bold tracking-tight">{i.valor}</p>
            <p className="text-xs text-muted-foreground">{i.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
