import { useMemo, useState } from 'react';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { ErrorState } from '@/components/LoadingStates';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  AtencaoAdministracao,
  ContratosProximosTermino,
  DistribuicaoMunicipios,
  ExecucaoObras,
  ImpactoAditivos,
  IndicadoresDesempenho,
  PanoramaFinanceiro,
  ProximosMarcos,
  SituacaoObras,
} from '@/components/dashboard/ExecutiveSections';
import { PlanoExpansaoResumo } from '@/components/plano-expansao/PlanoExpansaoResumo';
import { useObras } from '@/hooks/useObras';
import {
  formatCompactBRL,
  indicadoresHistoricos,
  proximosMarcos,
  resumirCarteira,
  resumirPorMunicipio,
} from '@/lib/dashboardExecutivo';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export default function Dashboard() {
  const { obras, loading, error, refetch } = useObras();
  const [ano, setAno] = useState<string>('all');
  const [municipio, setMunicipio] = useState<string>('all');
  const [busca, setBusca] = useState('');


  const anos = useMemo(() => {
    const set = new Set<number>();
    obras.forEach((o) => {
      const y = Number(String(o.dataInicio || '').slice(0, 4));
      if (y) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [obras]);

  const municipios = useMemo(
    () => [...new Set(obras.map((o) => o.municipio).filter(Boolean))].sort(),
    [obras]
  );

  const filtradas = useMemo(
    () =>
      obras.filter((o) => {
        if (ano !== 'all' && String(o.dataInicio || '').slice(0, 4) !== ano) return false;
        if (municipio !== 'all' && o.municipio !== municipio) return false;
        return true;
      }),
    [obras, ano, municipio]
  );

  const resumo = useMemo(() => resumirCarteira(filtradas), [filtradas]);
  const porMunicipio = useMemo(() => resumirPorMunicipio(resumo.indicadores), [resumo]);
  const marcos = useMemo(() => proximosMarcos(filtradas), [filtradas]);
  const historicos = useMemo(() => indicadoresHistoricos(filtradas), [filtradas]);

  const emRisco = resumo.emAtencao + resumo.criticas;

  const renderHeader = ({ openMenu }: { openMenu: () => void }) => (
    <WorksPageHeader
      onOpenMenu={openMenu}
      globalSearch={busca}
      onGlobalSearchChange={setBusca}
      breadcrumb="Dashboard / Visão Executiva"
      title="Painel de Gestão e Controle de Obras"
      subtitle="Visão executiva da carteira de obras, execução financeira e plano de expansão"
    />
  );

  if (error && !loading) {
    return (
      <ObrasLayout header={renderHeader}>
        <ErrorState message={error} onRetry={refetch} />
      </ObrasLayout>
    );
  }

  return (
    <ObrasLayout header={renderHeader}>
      <div className="pb-12">
        <div className="mb-6 flex flex-wrap gap-2">
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Exercício" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os exercícios</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={municipio} onValueChange={setMunicipio}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Município" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os municípios</SelectItem>
              {municipios.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">

          {loading ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma obra encontrada para os filtros selecionados.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPIs executivos */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  label="Valor contratado (vigente)"
                  value={formatCompactBRL(resumo.valorAtualizado)}
                  hint={`Original ${formatCompactBRL(resumo.valorInicial)}`}
                  icon={DollarSign}
                />
                <KpiCard
                  label="Valor executado"
                  value={formatCompactBRL(resumo.valorExecutado)}
                  hint={`${resumo.percentualExecutado.toFixed(1)}% do contratado`}
                  icon={Wallet}
                  tone="success"
                  progress={resumo.percentualExecutado}
                />
                <KpiCard
                  label="Saldo a executar"
                  value={formatCompactBRL(resumo.saldo)}
                  hint="Compromisso financeiro futuro"
                  icon={TrendingUp}
                />
                <KpiCard
                  label="Avanço físico ponderado"
                  value={`${resumo.avancoFisicoPonderado.toFixed(1)}%`}
                  hint="Ponderado pelo valor de cada obra"
                  icon={CheckCircle2}
                  progress={resumo.avancoFisicoPonderado}
                />
                <KpiCard
                  label="Obras sob gestão"
                  value={resumo.totalObras}
                  hint={`${resumo.ativas} em andamento · ${resumo.paralisadas} paralisadas`}
                  icon={Building2}
                />
                <KpiCard
                  label="Obras em risco"
                  value={emRisco}
                  hint={
                    resumo.totalObras > 0
                      ? `${((emRisco / resumo.totalObras) * 100).toFixed(0)}% da carteira`
                      : '—'
                  }
                  icon={AlertTriangle}
                  tone={resumo.criticas > 0 ? 'danger' : emRisco > 0 ? 'warning' : 'default'}
                />
              </div>

              <AtencaoAdministracao indicadores={resumo.indicadores} />

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ExecucaoObras indicadores={resumo.indicadores} />
                </div>
                <SituacaoObras resumo={resumo} />
              </div>

              <PanoramaFinanceiro resumo={resumo} />

              <div className="grid gap-6 lg:grid-cols-2">
                <ImpactoAditivos resumo={resumo} indicadores={resumo.indicadores} />
                <ContratosProximosTermino indicadores={resumo.indicadores} />
              </div>

              <DistribuicaoMunicipios dados={porMunicipio} />

              <ProximosMarcos marcos={marcos} />

              <IndicadoresDesempenho dados={historicos} />
            </>
          )}

          <PlanoExpansaoResumo />
        </div>
      </div>
    </SimpleHeader>
  );
}
