import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePlanoExpansao } from '@/hooks/usePlanoExpansao';
import {
  ATENCAO_CLASS,
  ATENCAO_LABEL,
  ESTAGIOS_ECONUCLEO,
  formatDateBR,
  type PlanoMeta,
} from '@/lib/planoExpansao';

export function resumirPlano(metas: PlanoMeta[]) {
  const empreendimentos = metas.filter((m) => m.categoria === 'empreendimento');
  const econucleos = metas.filter((m) => m.categoria === 'econucleo');
  const conta = (lista: PlanoMeta[], s: string) => lista.filter((m) => m.situacao === s).length;
  const avanco =
    metas.length > 0 ? Math.round(metas.reduce((s, m) => s + m.progresso, 0) / metas.length) : 0;

  return {
    empreendimentos,
    econucleos,
    total: metas.length,
    avanco,
    concluidos: conta(empreendimentos, 'concluida'),
    emAndamento: conta(empreendimentos, 'em_andamento'),
    emDesenvolvimento: conta(empreendimentos, 'em_desenvolvimento'),
    pendentes: conta(empreendimentos, 'pendente'),
    porEstagio: ESTAGIOS_ECONUCLEO.map((e) => ({
      ...e,
      total: econucleos.filter((m) => m.estagio_econucleo === e.valor).length,
    })),
    atencao: metas.filter((m) => m.nivel_atencao !== 'normal'),
  };
}

export function PlanoExpansaoResumo() {
  const navigate = useNavigate();
  const { metasAtivas, loading } = usePlanoExpansao();
  const r = useMemo(() => resumirPlano(metasAtivas), [metasAtivas]);

  if (loading) return null;

  if (r.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Plano de Expansão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Acompanhamento das metas estratégicas de expansão da infraestrutura física
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Nenhuma meta cadastrada. Cadastre as metas do plano na área administrativa para
            acompanhar o andamento em tempo real.
          </p>
          <Button onClick={() => navigate('/admin/plano-expansao')} className="gap-2">
            Cadastrar metas do plano <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Plano de Expansão</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhamento das metas estratégicas de expansão da infraestrutura física
          </p>
        </div>
        <Button variant="link" className="gap-1 px-0" onClick={() => navigate('/plano-expansao')}>
          Ver plano completo <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plano Estratégico de Expansão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhamento global do portfólio de expansão de sedes
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{r.empreendimentos.length}</span>
              <span className="pb-1 text-sm text-muted-foreground">
                empreendimentos prioritários
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Pill valor={r.concluidos} label="Concluídos" tone="success" />
              <Pill valor={r.emAndamento} label="Em execução" tone="info" />
              <Pill valor={r.emDesenvolvimento} label="Em desenvolvimento" tone="warning" />
              <Pill valor={r.pendentes} label="Pendentes" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avanço geral</span>
                <span className="font-bold text-emerald-700">{r.avanco}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${r.avanco}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expansão dos Econúcleos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Projetos sustentáveis e de rápida implementação
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{r.econucleos.length}</span>
              <span className="pb-1 text-sm text-muted-foreground">econúcleos previstos</span>
            </div>
            <div className="space-y-2">
              {[...r.porEstagio].reverse().map((e) => (
                <div key={e.valor} className="border-l-4 border-emerald-600 pl-3">
                  <p className="text-sm font-bold">
                    {e.total} <span className="font-medium">{e.titulo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{e.descricao}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {r.atencao.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Metas que exigem acompanhamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.atencao.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    {m.municipio}
                    <Badge variant="outline" className={cn(ATENCAO_CLASS[m.nivel_atencao])}>
                      {ATENCAO_LABEL[m.nivel_atencao]}
                    </Badge>
                  </p>
                  {m.motivo_atencao && (
                    <p className="text-sm text-muted-foreground">{m.motivo_atencao}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {formatDateBR(m.updated_at?.slice(0, 10))}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/plano-expansao')}>
                  Ver meta <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Pill({
  valor,
  label,
  tone = 'default',
}: {
  valor: number;
  label: string;
  tone?: 'default' | 'success' | 'info' | 'warning';
}) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1',
        tone === 'success' && 'bg-emerald-50 text-emerald-700',
        tone === 'info' && 'bg-sky-50 text-sky-700',
        tone === 'warning' && 'bg-amber-50 text-amber-700',
        tone === 'default' && 'bg-muted text-muted-foreground'
      )}
    >
      <strong>{valor}</strong> {label}
    </span>
  );
}
