import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ObrasLayout, ObrasSidebarMenuButton } from '@/components/obras/ObrasLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  Plus,
  FileDown,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRecebimentoVistorias } from '@/hooks/useRecebimentoVistorias';
import { useRecebimentoChecklist, type Verificacao } from '@/hooks/useRecebimentoChecklist';
import { useRecebimentoPendencias, type Pendencia } from '@/hooks/useRecebimentoPendencias';
import { NovaVistoriaDialog } from '@/components/recebimento/NovaVistoriaDialog';
import { AmbienteFormDialog } from '@/components/recebimento/AmbienteFormDialog';
import { DuplicarAmbienteDialog } from '@/components/recebimento/DuplicarAmbienteDialog';
import { AdicionarServicoSheet } from '@/components/recebimento/AdicionarServicoSheet';
import { NaoConformidadeSheet } from '@/components/recebimento/NaoConformidadeSheet';
import { ChecklistPanel } from '@/components/recebimento/ChecklistPanel';
import { PendenciasPanel, PendenciaDetailSheet } from '@/components/recebimento/PendenciasPanel';
import {
  ABERTAS,
  SITUACAO_CLASS,
  SITUACAO_LABEL,
  vistoriaTitulo,
  type VerificacaoStatus,
} from '@/lib/recebimento/constants';
import { gerarRelatorioRecebimentoPdf } from '@/lib/recebimento/relatorioPdf';
import { uploadRecebimentoFoto } from '@/lib/recebimento/storage';
import { cn } from '@/lib/utils';

export function RecebimentoObra() {
  const { obraId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, role } = useUserRole();

  const [obra, setObra] = useState<Record<string, unknown> | null>(null);
  const [fiscalNome, setFiscalNome] = useState('');
  const [vistoriaId, setVistoriaId] = useState<string | null>(null);
  const [ambienteAtivoId, setAmbienteAtivoId] = useState<string | null>(null);
  const [tab, setTab] = useState('vistoria');
  const [gerando, setGerando] = useState(false);

  const [novaVistoriaOpen, setNovaVistoriaOpen] = useState(false);
  const [ambienteOpen, setAmbienteOpen] = useState(false);
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [servicoOpen, setServicoOpen] = useState(false);
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [ncAlvo, setNcAlvo] = useState<{ v: Verificacao; servico: string } | null>(null);
  const [reinspAlvo, setReinspAlvo] = useState<Pendencia | null>(null);

  const { vistorias, criarVistoria, concluirVistoria, reabrirVistoria } =
    useRecebimentoVistorias(obraId);
  const checklist = useRecebimentoChecklist(obraId, vistoriaId);
  const pend = useRecebimentoPendencias(obraId);

  const vistoria = vistorias.find((v) => v.id === vistoriaId) ?? null;
  const somenteLeitura = !vistoria || vistoria.status !== 'em_andamento';
  const podeEditar = isAdmin || role === 'editor' || role === 'gm' || role === 'admin';

  useEffect(() => {
    if (!obraId) return;
    supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .maybeSingle()
      .then(({ data }) => setObra((data as Record<string, unknown>) ?? null));
  }, [obraId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setFiscalNome(data?.display_name ?? data?.email ?? ''));
  }, [user]);

  useEffect(() => {
    if (!vistoriaId && vistorias.length) {
      const emAndamento = vistorias.find((v) => v.status === 'em_andamento');
      setVistoriaId((emAndamento ?? vistorias[0]).id);
    }
  }, [vistorias, vistoriaId]);

  useEffect(() => {
    if (checklist.ambientes.length === 0) setAmbienteAtivoId(null);
    else if (!checklist.ambientes.some((a) => a.id === ambienteAtivoId))
      setAmbienteAtivoId(checklist.ambientes[0].id);
  }, [checklist.ambientes, ambienteAtivoId]);

  const ambiente = checklist.ambientes.find((a) => a.id === ambienteAtivoId) ?? null;

  const nomeAmbiente = (id: string | null) =>
    checklist.ambientes.find((a) => a.id === id)?.nome ?? 'Ambiente';

  const pendenciasPorAmbiente = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pend.pendencias) {
      if (!p.ambiente_id) continue;
      if (!ABERTAS.includes(p.situacao)) continue;
      map[p.ambiente_id] = (map[p.ambiente_id] ?? 0) + 1;
    }
    return map;
  }, [pend.pendencias]);

  const maisUsados = useMemo(() => {
    const cnt = new Map<string, { macro: string; servico: string; n: number }>();
    for (const a of checklist.ambientes) {
      for (const s of a.servicos) {
        const k = `${s.macro_snapshot}|${s.servico_snapshot}`;
        const cur = cnt.get(k) ?? { macro: s.macro_snapshot, servico: s.servico_snapshot, n: 0 };
        cur.n += 1;
        cnt.set(k, cur);
      }
    }
    return [...cnt.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map(({ macro, servico }) => ({ macro, servico }));
  }, [checklist.ambientes]);

  const stats = useMemo(() => {
    const todas = checklist.ambientes.flatMap((a) => a.servicos.flatMap((s) => s.verificacoes));
    const feitas = todas.filter((v) => v.status !== 'nao_vistoriado').length;
    const abertas = pend.pendencias.filter((p) => ABERTAS.includes(p.situacao)).length;
    const sanadas = pend.pendencias.filter((p) => p.situacao === 'sanada').length;
    return {
      total: todas.length,
      feitas,
      pct: todas.length ? (feitas / todas.length) * 100 : 0,
      conformes: todas.filter((v) => v.status === 'conforme').length,
      naoConformes: todas.filter((v) => v.status === 'nao_conforme').length,
      abertas,
      sanadas,
    };
  }, [checklist.ambientes, pend.pendencias]);

  const abertasLista = pend.pendencias.filter((p) => ABERTAS.includes(p.situacao));

  const handleStatus = async (v: Verificacao, status: VerificacaoStatus) => {
    const ok = await checklist.setStatus(v.id, status);
    if (!ok) return;
    if (status === 'nao_conforme') {
      const servico =
        ambiente?.servicos.find((s) => s.id === v.ambiente_servico_id)?.servico_snapshot ?? '';
      setNcAlvo({ v, servico });
    }
  };

  const handleFotoGeral = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !vistoriaId) return;
      await uploadRecebimentoFoto({ file, obraId, vistoriaId, ambienteId: ambienteAtivoId });
      await pend.refetch();
      toast.success('Foto registrada no ambiente');
    };
    input.click();
  };

  const exportarPdf = async () => {
    if (!vistoria) return;
    setGerando(true);
    try {
      await gerarRelatorioRecebimentoPdf({
        vistoria,
        obra: {
          nome: (obra?.nome as string) ?? 'Obra',
          contrato: (obra?.numero_contrato as string) ?? (obra?.contrato as string) ?? null,
          endereco: (obra?.endereco_completo as string) ?? null,
          empresa: (obra?.empresa_responsavel as string) ?? (obra?.empresa as string) ?? null,
        },
        fiscalNome,
        ambientes: checklist.ambientes,
        pendencias: pend.pendencias.filter((p) => p.situacao !== 'cancelada'),
        fotos: pend.fotos,
      });
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar o relatório');
    } finally {
      setGerando(false);
    }
  };

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <ObrasSidebarMenuButton onClick={openMenu} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/obras/${obraId}/checklist`)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold md:text-lg">Recebimento de Obra</h1>
            <p className="truncate text-xs text-muted-foreground">{(obra?.nome as string) ?? ''}</p>
          </div>
          {vistoria && (
            <Badge variant={vistoria.status === 'em_andamento' ? 'default' : 'secondary'}>
              {vistoria.status === 'em_andamento' ? 'Em andamento' : 'Concluída'}
            </Badge>
          )}
        </header>
      )}
    >
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-muted-foreground">Vistoria</p>
            <Select value={vistoriaId ?? ''} onValueChange={setVistoriaId}>
              <SelectTrigger className="mt-1 h-11">
                <SelectValue placeholder="Selecione a vistoria" />
              </SelectTrigger>
              <SelectContent>
                {vistorias.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {vistoriaTitulo(v)} — {v.data.slice(0, 10).split('-').reverse().join('/')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="h-11" onClick={() => setNovaVistoriaOpen(true)} disabled={!podeEditar}>
              <Plus className="mr-2 h-4 w-4" /> Nova vistoria
            </Button>
            {vistoria && vistoria.status === 'em_andamento' && (
              <Button variant="outline" className="h-11" onClick={() => setConcluirOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir
              </Button>
            )}
            {vistoria && vistoria.status === 'concluida' && podeEditar && (
              <Button variant="outline" className="h-11" onClick={() => reabrirVistoria(vistoria.id)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reabrir
              </Button>
            )}
          </div>
        </Card>

        {!vistoria ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma vistoria de recebimento iniciada para esta obra.
            </p>
            <Button className="h-11" onClick={() => setNovaVistoriaOpen(true)} disabled={!podeEditar}>
              <Plus className="mr-2 h-4 w-4" /> Iniciar Recebimento Provisório
            </Button>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vistoria">Vistoria</TabsTrigger>
              <TabsTrigger value="pendencias">
                Pendências
                {stats.abertas > 0 && (
                  <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                    {stats.abertas}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reinspecao">Reinspeção</TabsTrigger>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
            </TabsList>

            <TabsContent value="vistoria" className="mt-4">
              <ChecklistPanel
                ambientes={checklist.ambientes}
                ambienteAtivoId={ambienteAtivoId}
                onSelecionarAmbiente={setAmbienteAtivoId}
                pendenciasPorAmbiente={pendenciasPorAmbiente}
                somenteLeitura={somenteLeitura || !podeEditar}
                onSetStatus={handleStatus}
                onMarcarGrupo={(verifs, status, sobrescrever) =>
                  checklist.marcarGrupo(verifs, status, sobrescrever)
                }
                onAdicionarServico={() => setServicoOpen(true)}
                onNovoAmbiente={() => setAmbienteOpen(true)}
                onDuplicarAmbiente={() => setDuplicarOpen(true)}
                onRemoverAmbiente={(id) => checklist.inativarAmbiente(id)}
                onRemoverServico={(id) => checklist.inativarServico(id)}
                onFotoGeral={handleFotoGeral}
              />
            </TabsContent>

            <TabsContent value="pendencias" className="mt-4">
              <PendenciasPanel
                pendencias={pend.pendencias}
                fotos={pend.fotos}
                historico={pend.historico}
                nomeAmbiente={nomeAmbiente}
                somenteLeitura={somenteLeitura || !podeEditar}
                onRegistrarCorrecao={(p, observacao, fotos) =>
                  pend.registrarCorrecao({
                    pendencia: p,
                    vistoriaId: vistoria.id,
                    observacao,
                    fotos,
                  })
                }
                onAvaliar={(p, aceita, observacao, fotos) =>
                  pend.avaliarReinspecao({
                    pendencia: p,
                    vistoriaId: vistoria.id,
                    aceita,
                    observacao,
                    fotos,
                  })
                }
                onCancelar={(p, motivo) => pend.cancelarPendencia(p, motivo)}
              />
            </TabsContent>

            <TabsContent value="reinspecao" className="mt-4 space-y-3">
              {vistoria.tipo === 'provisorio' && (
                <Card className="p-4 text-sm text-muted-foreground">
                  A reinspeção avalia as pendências abertas. Crie uma vistoria do tipo
                  &quot;Reinspeção&quot; para registrar formalmente a avaliação — as pendências abaixo
                  permanecem as mesmas em todas as etapas.
                </Card>
              )}
              {abertasLista.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma pendência em aberto. Obra apta ao Recebimento Definitivo.
                </Card>
              ) : (
                abertasLista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReinspAlvo(p)}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/40"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nomeAmbiente(p.ambiente_id)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded border px-2 py-0.5 text-[10px]',
                        SITUACAO_CLASS[p.situacao],
                      )}
                    >
                      {SITUACAO_LABEL[p.situacao]}
                    </span>
                  </button>
                ))
              )}
            </TabsContent>

            <TabsContent value="resumo" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Itens vistoriados', value: `${stats.feitas}/${stats.total}` },
                  { label: 'Conformes', value: stats.conformes },
                  { label: 'Pendências abertas', value: stats.abertas },
                  { label: 'Pendências sanadas', value: stats.sanadas },
                ].map((k) => (
                  <Card key={k.label} className="p-4">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{k.value}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-4">
                <p className="text-sm font-medium">Progresso da vistoria</p>
                <Progress value={stats.pct} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">{Math.round(stats.pct)}% concluído</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-medium">Pendências por ambiente</p>
                <div className="mt-3 space-y-2">
                  {checklist.ambientes.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.nome}</span>
                      <Badge variant={pendenciasPorAmbiente[a.id] ? 'destructive' : 'secondary'}>
                        {pendenciasPorAmbiente[a.id] ?? 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Button className="h-12 w-full" onClick={exportarPdf} disabled={gerando}>
                {gerando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Gerar relatório PDF
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <NovaVistoriaDialog
        open={novaVistoriaOpen}
        onOpenChange={setNovaVistoriaOpen}
        vistoriasExistentes={vistorias.map((v) => ({
          id: v.id,
          tipo: v.tipo,
          sequencia: v.sequencia,
          data: v.data,
          status: v.status,
        }))}
        onConfirm={async (args) => {
          const nova = await criarVistoria(args);
          if (nova) {
            setVistoriaId(nova.id);
            setTab('vistoria');
          }
        }}
      />

      <AmbienteFormDialog
        open={ambienteOpen}
        onOpenChange={setAmbienteOpen}
        templates={checklist.templates}
        onConfirm={async (args) => {
          const id = await checklist.criarAmbiente(args);
          if (id) setAmbienteAtivoId(id as string);
        }}
      />

      <DuplicarAmbienteDialog
        open={duplicarOpen}
        onOpenChange={setDuplicarOpen}
        ambienteNome={ambiente?.nome ?? ''}
        onConfirm={(nomes) => ambiente && checklist.duplicarAmbiente(ambiente.id, nomes)}
      />

      <AdicionarServicoSheet
        open={servicoOpen}
        onOpenChange={setServicoOpen}
        obraId={obraId}
        ambienteNome={ambiente?.nome ?? ''}
        maisUsados={maisUsados}
        onAdicionar={(ids) => ambiente && checklist.adicionarServicos(ambiente.id, ids)}
        onAdicionarPersonalizado={(macro, servico, verificacoes) =>
          ambiente && checklist.adicionarServicoPersonalizado(ambiente.id, macro, servico, verificacoes)
        }
      />

      <NaoConformidadeSheet
        open={!!ncAlvo}
        onOpenChange={(o) => !o && setNcAlvo(null)}
        ambienteNome={ambiente?.nome ?? ''}
        servicoNome={ncAlvo?.servico ?? ''}
        verificacaoNome={ncAlvo?.v.descricao_snapshot ?? ''}
        onCancelar={() => {
          // desfaz a marcação se o fiscal desistir de descrever a não conformidade
          if (ncAlvo) checklist.setStatus(ncAlvo.v.id, 'nao_vistoriado');
          setNcAlvo(null);
        }}
        onSalvar={async ({ descricao, classificacao, prazoCorrecao, observacao, fotos }) => {
          if (!ncAlvo || !vistoriaId || !ambiente) return;
          await pend.criarPendencia({
            verificacaoId: ncAlvo.v.id,
            ambienteId: ambiente.id,
            vistoriaId,
            titulo: ncAlvo.v.descricao_snapshot,
            descricao,
            classificacao,
            prazoCorrecao,
            observacao,
            fotos,
          });
          setNcAlvo(null);
        }}
      />

      <PendenciaDetailSheet
        pendencia={reinspAlvo}
        onOpenChange={(o) => !o && setReinspAlvo(null)}
        fotos={pend.fotos}
        historico={pend.historico}
        nomeAmbiente={nomeAmbiente}
        somenteLeitura={somenteLeitura || !podeEditar}
        modoReinspecao
        onRegistrarCorrecao={(p, observacao, fotos) =>
          pend.registrarCorrecao({ pendencia: p, vistoriaId: vistoria!.id, observacao, fotos })
        }
        onAvaliar={(p, aceita, observacao, fotos) =>
          pend.avaliarReinspecao({
            pendencia: p,
            vistoriaId: vistoria!.id,
            aceita,
            observacao,
            fotos,
          })
        }
        onCancelar={(p, motivo) => pend.cancelarPendencia(p, motivo)}
      />

      <AlertDialog open={concluirOpen} onOpenChange={setConcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir vistoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Após concluir, o checklist fica somente leitura. Itens não vistoriados:{' '}
              {stats.total - stats.feitas}. Pendências em aberto: {stats.abertas}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (vistoria) await concluirVistoria(vistoria.id);
                setConcluirOpen(false);
              }}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ObrasLayout>
  );
}

export default RecebimentoObra;
