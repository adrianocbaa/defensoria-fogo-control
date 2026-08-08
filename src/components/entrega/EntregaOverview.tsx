import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ClipboardCheck,
  Images,
  ShieldAlert,
  UserRound,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  PAPEL_LABEL,
  RESPONSABILIDADE_LABEL,
  RESULTADO_LABEL,
  formatarData,
} from '@/lib/entrega/constants';
import { RESULTADO_TONE } from '@/lib/entrega/ui';
import { progressoAmbiente } from '@/lib/entrega/resultado';
import type { ResumoEntrega } from '@/lib/entrega/resultado';
import type {
  EntregaAmbiente,
  EntregaParticipante,
  EntregaVistoria,
} from '@/hooks/useEntregaInstitucional';

interface Props {
  entrega: EntregaVistoria;
  resumo: ResumoEntrega;
  ambientes: EntregaAmbiente[];
  participantes: EntregaParticipante[];
  totalFotos: number;
  onIrPara: (secao: 'checklist' | 'pendencias' | 'resultado' | 'fotos') => void;
  onSelecionarAmbiente: (id: string) => void;
}

export function EntregaOverview({
  entrega,
  resumo,
  ambientes,
  participantes,
  totalFotos,
  onIrPara,
  onSelecionarAmbiente,
}: Props) {
  const tone = RESULTADO_TONE[resumo.resultado];

  const metricas = [
    {
      label: 'Progresso da vistoria',
      valor: `${Math.round(resumo.progresso)}%`,
      icon: ClipboardCheck,
      acao: 'checklist' as const,
    },
    {
      label: 'Pendências abertas',
      valor: String(resumo.pendenciasAbertas),
      icon: ShieldAlert,
      acao: 'pendencias' as const,
    },
    {
      label: 'Impeditivas',
      valor: String(resumo.impeditivasAbertas),
      icon: ShieldAlert,
      acao: 'pendencias' as const,
    },
    {
      label: 'Fotos registradas',
      valor: String(totalFotos),
      icon: Images,
      acao: 'fotos' as const,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className={cn('border-2 p-5', tone.card)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Situação atual
            </p>
            <h2 className={cn('mt-1 text-xl font-black sm:text-2xl', tone.titulo)}>
              {RESULTADO_LABEL[resumo.resultado]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrega de {formatarData(entrega.data)}
              {entrega.recebimento_definitivo_data
                ? ` · Recebimento Definitivo em ${formatarData(entrega.recebimento_definitivo_data)}`
                : ''}
            </p>
          </div>
          <Button variant="outline" className="h-11" onClick={() => onIrPara('resultado')}>
            Ver resultado <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <Progress value={resumo.progresso} className="mt-4 h-2" />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((m) => (
          <Card
            key={m.label}
            role="button"
            tabIndex={0}
            onClick={() => onIrPara(m.acao)}
            onKeyDown={(e) => e.key === 'Enter' && onIrPara(m.acao)}
            className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
          >
            <m.icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-2xl font-black">{m.valor}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-bold">Ambientes ({ambientes.length})</h3>
            <button
              type="button"
              className="text-xs font-semibold text-primary"
              onClick={() => onIrPara('checklist')}
            >
              Abrir checklist
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {ambientes.map((a) => {
              const p = progressoAmbiente(a);
              const completo = p.total > 0 && p.feitas === p.total;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onSelecionarAmbiente(a.id);
                    onIrPara('checklist');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{a.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.feitas}/{p.total} verificações
                    </span>
                  </span>
                  <span className="w-24 shrink-0">
                    <Progress value={p.pct} className="h-1.5" />
                  </span>
                  {completo && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>
              );
            })}
            {ambientes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum ambiente importado do Recebimento Definitivo.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-base font-bold">Participantes</h3>
            <ul className="mt-3 space-y-2">
              {participantes.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.nome_snapshot}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {PAPEL_LABEL[p.papel] ?? p.papel}
                  </span>
                </li>
              ))}
              {participantes.length === 0 && (
                <li className="text-sm text-muted-foreground">Nenhum participante registrado.</li>
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-bold">Pendências por responsabilidade</h3>
            <ul className="mt-3 space-y-2">
              {Object.entries(resumo.porResponsabilidade).map(([chave, qtd]) => (
                <li key={chave} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {RESPONSABILIDADE_LABEL[chave as keyof typeof RESPONSABILIDADE_LABEL]}
                  </span>
                  <span className="font-bold">{qtd}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
