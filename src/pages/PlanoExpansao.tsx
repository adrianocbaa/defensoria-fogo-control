import { useMemo, useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowRight, Search, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanoExpansao } from '@/hooks/usePlanoExpansao';
import { useUserRole } from '@/hooks/useUserRole';
import { MetaDrawer } from '@/components/plano-expansao/MetaDrawer';
import { JornadaStepper } from '@/components/plano-expansao/JornadaStepper';
import { resumirPlano } from '@/components/plano-expansao/PlanoExpansaoResumo';
import {
  ATENCAO_CLASS,
  ATENCAO_LABEL,
  ESTAGIOS_ECONUCLEO,
  JORNADAS,
  SITUACAO_CLASS,
  SITUACAO_LABEL,
  formatDateBR,
  type JornadaTipo,
  type PlanoMeta,
} from '@/lib/planoExpansao';

export default function PlanoExpansao() {
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const { metas, metasAtivas, revisaoVigente, loading } = usePlanoExpansao();
  const [metaSelecionada, setMetaSelecionada] = useState<PlanoMeta | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');

  const resumo = useMemo(() => resumirPlano(metasAtivas), [metasAtivas]);

  const empreendimentosFiltrados = useMemo(() => {
    return resumo.empreendimentos.filter((m) => {
      if (busca && !m.municipio.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroSituacao !== 'all' && m.situacao !== filtroSituacao) return false;
      if (filtroTipo !== 'all' && m.tipo_intervencao !== filtroTipo) return false;
      return true;
    });
  }, [resumo.empreendimentos, busca, filtroSituacao, filtroTipo]);

  const tipos = useMemo(
    () => [...new Set(resumo.empreendimentos.map((m) => m.tipo_intervencao))],
    [resumo.empreendimentos]
  );

  const incluidos = metas.filter((m) => m.status_plano === 'incluido');
  const retirados = metas.filter((m) => m.status_plano === 'retirado' || !m.ativo);
  const mantidos = metas.filter((m) => m.status_plano === 'mantido' && m.ativo);

  const avancoEsperado = useMemo(() => {
    const comPrevisao = metasAtivas.filter((m) => m.previsao_conclusao);
    if (comPrevisao.length === 0) return null;
    const hoje = new Date();
    const soma = comPrevisao.reduce((s, m) => {
      const fim = new Date(m.previsao_conclusao as string);
      return s + (fim.getTime() <= hoje.getTime() ? 100 : 0);
    }, 0);
    return Math.round(soma / comPrevisao.length);
  }, [metasAtivas]);

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background pb-12">
        <PageHeader
          title="Plano de Expansão"
          subtitle="Acompanhamento estratégico das metas de expansão da infraestrutura física"
          actions={
            <div className="flex items-center gap-2">
              {revisaoVigente && (
                <Badge variant="outline" className="h-9 px-3">
                  {revisaoVigente.nome} · {revisaoVigente.ano_vigencia}
                </Badge>
              )}
              {canEdit && (
                <Button variant="outline" onClick={() => navigate('/admin/plano-expansao')}>
                  <Settings2 className="mr-2 h-4 w-4" /> Gerenciar metas
                </Button>
              )}
            </div>
          }
        />

        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : metasAtivas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 p-8">
                <p className="text-lg font-semibold">Nenhuma meta cadastrada</p>
                <p className="text-sm text-muted-foreground">
                  Cadastre as metas do Plano de Expansão na área administrativa para acompanhar o
                  andamento em tempo real.
                </p>
                {canEdit && (
                  <Button onClick={() => navigate('/admin/plano-expansao')} className="gap-2">
                    Cadastrar metas <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="visao" className="space-y-6">
              <TabsList>
                <TabsTrigger value="visao">Visão Geral</TabsTrigger>
                <TabsTrigger value="estrategico">Plano Estratégico</TabsTrigger>
                <TabsTrigger value="econucleos">Econúcleos</TabsTrigger>
                <TabsTrigger value="alteracoes">Alterações do Plano</TabsTrigger>
              </TabsList>

              {/* ---------------- Visão Geral ---------------- */}
              <TabsContent value="visao" className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <Kpi label="Metas do plano" valor={resumo.empreendimentos.length} destaque />
                  <Kpi label="Econúcleos" valor={resumo.econucleos.length} />
                  <Kpi label="Em andamento" valor={resumo.emAndamento} />
                  <Kpi label="Concluídas" valor={resumo.concluidos} />
                  <Kpi label="Pendentes" valor={resumo.pendentes} />
                  <Kpi label="Em atenção" valor={resumo.atencao.length} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Avanço Global do Plano</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Cumprimento ponderado de todas as etapas e marcos estratégicos
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-end gap-3">
                        <span className="text-5xl font-bold text-emerald-700">
                          {resumo.avanco}%
                        </span>
                        <span className="pb-2 text-sm text-muted-foreground">
                          do cronograma concluído globalmente
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${resumo.avanco}%` }}
                        />
                      </div>
                      {avancoEsperado !== null && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Avanço esperado (metas com previsão vencida)</span>
                            <span className="font-bold">{avancoEsperado}%</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span>Avanço realizado</span>
                            <span className="font-bold text-emerald-700">{resumo.avanco}%</span>
                          </div>
                          <p
                            className={cn(
                              'mt-2 text-xs font-semibold',
                              resumo.avanco >= avancoEsperado
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            )}
                          >
                            Desvio: {resumo.avanco - avancoEsperado} p.p.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Pipeline de Econúcleos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[...resumo.porEstagio].reverse().map((e) => (
                        <div key={e.valor} className="border-l-4 border-emerald-600 pl-3">
                          <p className="text-sm font-bold">
                            {e.total} <span className="font-medium">{e.titulo}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{e.descricao}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {resumo.atencao.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Metas que Exigem Acompanhamento</h3>
                    {resumo.atencao.map((m) => (
                      <Card
                        key={m.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => setMetaSelecionada(m)}
                      >
                        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold">{m.municipio}</p>
                            {m.motivo_atencao && (
                              <p className="text-sm text-muted-foreground">{m.motivo_atencao}</p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              Última atualização: {formatDateBR(m.updated_at?.slice(0, 10))}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn(ATENCAO_CLASS[m.nivel_atencao])}>
                            {ATENCAO_LABEL[m.nivel_atencao]}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ---------------- Plano Estratégico ---------------- */}
              <TabsContent value="estrategico" className="space-y-6">
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Tipo de serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {tipos.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Situação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as situações</SelectItem>
                        {Object.entries(SITUACAO_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative ml-auto w-full max-w-xs">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar núcleo"
                        className="pl-9"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="p-3">Núcleo</th>
                            <th className="p-3">Tipo de intervenção</th>
                            <th className="p-3 w-48">Progresso</th>
                            <th className="p-3">Etapa atual</th>
                            <th className="p-3">Previsão</th>
                            <th className="p-3">Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empreendimentosFiltrados.map((m) => (
                            <tr
                              key={m.id}
                              className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                              onClick={() => setMetaSelecionada(m)}
                            >
                              <td className="p-3 font-semibold">{m.municipio}</td>
                              <td className="p-3 text-muted-foreground">{m.tipo_intervencao}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-emerald-600"
                                      style={{ width: `${m.progresso}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold">{m.progresso}%</span>
                                </div>
                              </td>
                              <td className="p-3">
                                {m.etapa_atual ||
                                  JORNADAS[m.jornada]?.etapas[m.etapa_index] ||
                                  '—'}
                              </td>
                              <td className="p-3">{formatDateBR(m.previsao_conclusao)}</td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={cn(SITUACAO_CLASS[m.situacao])}
                                >
                                  {SITUACAO_LABEL[m.situacao]}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {empreendimentosFiltrados.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                Nenhum empreendimento encontrado com os filtros atuais.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Etapas da Jornada por Tipo de Empreendimento
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Fluxos de trabalho padronizados conforme a estratégia de contratação
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {(Object.keys(JORNADAS) as JornadaTipo[]).map((j) => {
                      const metasJornada = resumo.empreendimentos
                        .concat(resumo.econucleos)
                        .filter((m) => m.jornada === j);
                      const media =
                        metasJornada.length > 0
                          ? Math.round(
                              metasJornada.reduce((s, m) => s + m.etapa_index, 0) /
                                metasJornada.length
                            )
                          : 0;
                      return (
                        <div key={j}>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">Jornada — {JORNADAS[j].label}</p>
                            <Badge variant="outline">
                              {metasJornada.length} metas · etapa média:{' '}
                              {JORNADAS[j].etapas[media] ?? '—'}
                            </Badge>
                          </div>
                          <JornadaStepper jornada={j} etapaIndex={media} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------- Econúcleos ---------------- */}
              <TabsContent value="econucleos" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {ESTAGIOS_ECONUCLEO.map((e) => {
                    const lista = resumo.econucleos.filter((m) => m.estagio_econucleo === e.valor);
                    return (
                      <Card
                        key={e.valor}
                        className={cn(
                          e.valor === 2 && 'border-amber-200 bg-amber-50/50',
                          e.valor === 3 && 'border-emerald-200 bg-emerald-50/50'
                        )}
                      >
                        <CardHeader className="pb-2">
                          <Badge variant="outline" className="w-fit text-[10px] uppercase">
                            Estágio {e.valor}
                          </Badge>
                          <CardTitle className="text-base">{e.titulo}</CardTitle>
                          <p className="text-xs text-muted-foreground">{e.descricao}</p>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">
                            {lista.length}{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                              núcleos
                            </span>
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {lista.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => setMetaSelecionada(m)}
                                className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                              >
                                {m.municipio}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Linha do Tempo e Marcos de Progresso Padrão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JornadaStepper
                      jornada="econucleo"
                      etapaIndex={
                        resumo.econucleos.length > 0
                          ? Math.round(
                              resumo.econucleos.reduce((s, m) => s + m.etapa_index, 0) /
                                resumo.econucleos.length
                            )
                          : 0
                      }
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {resumo.econucleos.map((m) => (
                    <Card key={m.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{m.municipio}</CardTitle>
                          <Badge variant="outline" className={cn(SITUACAO_CLASS[m.situacao])}>
                            {SITUACAO_LABEL[m.situacao]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Etapa atual</p>
                          <p className="font-medium">
                            {m.etapa_atual || JORNADAS[m.jornada]?.etapas[m.etapa_index] || '—'}
                          </p>
                        </div>
                        {m.motivo_atencao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Próxima ação</p>
                            <p className="font-medium">{m.motivo_atencao}</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setMetaSelecionada(m)}
                        >
                          Ver detalhes
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* ---------------- Alterações ---------------- */}
              <TabsContent value="alteracoes" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Kpi label="Mantidos" valor={mantidos.length} sub="empreendimentos intocados" />
                  <Kpi
                    label="Incluídos"
                    valor={incluidos.length}
                    sub="novas metas no plano"
                    destaque
                  />
                  <Kpi label="Retirados" valor={retirados.length} sub="itens descontinuados" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Novas metas incluídas</h3>
                  {incluidos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma inclusão registrada.</p>
                  )}
                  {incluidos.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="space-y-1 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{m.municipio}</p>
                          <Badge variant="outline" className="text-emerald-700">
                            Incluído na revisão
                          </Badge>
                        </div>
                        {m.justificativa && (
                          <p>
                            <span className="text-muted-foreground">Justificativa: </span>
                            {m.justificativa}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Data de inclusão: {formatDateBR(m.data_inclusao)}
                          {m.documento_ref && ` · Documento: ${m.documento_ref}`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Metas retiradas / suspensas</h3>
                  {retirados.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma retirada registrada.</p>
                  )}
                  {retirados.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="space-y-1 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold line-through text-muted-foreground">
                            {m.municipio}
                          </p>
                          <Badge variant="outline">Retirado do plano</Badge>
                        </div>
                        {m.justificativa && (
                          <p>
                            <span className="text-muted-foreground">Justificativa: </span>
                            {m.justificativa}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Data de retirada: {formatDateBR(m.data_retirada)}
                          {m.documento_ref && ` · Documento: ${m.documento_ref}`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Registros históricos são preservados para fins de auditoria e rastreabilidade.
                </p>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <MetaDrawer meta={metaSelecionada} onOpenChange={() => setMetaSelecionada(null)} />
      </div>
    </SimpleHeader>
  );
}

function Kpi({
  label,
  valor,
  sub,
  destaque,
}: {
  label: string;
  valor: number;
  sub?: string;
  destaque?: boolean;
}) {
  return (
    <Card className={cn(destaque && 'border-emerald-200 bg-emerald-50/60')}>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold">{valor}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
