import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ObrasLayout, ObrasSidebarMenuButton } from '@/components/obras/ObrasLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRecebimentoVistorias } from '@/hooks/useRecebimentoVistorias';
import {
  useRecebimentoChecklist,
  type AmbienteServico,
  type Verificacao,
} from '@/hooks/useRecebimentoChecklist';
import { useRecebimentoPendencias, type Pendencia } from '@/hooks/useRecebimentoPendencias';
import { NovaVistoriaDialog } from '@/components/recebimento/NovaVistoriaDialog';
import { AmbienteFormDialog } from '@/components/recebimento/AmbienteFormDialog';
import { DuplicarAmbienteDialog } from '@/components/recebimento/DuplicarAmbienteDialog';
import { AdicionarServicoSheet } from '@/components/recebimento/AdicionarServicoSheet';
import { NaoConformidadeSheet } from '@/components/recebimento/NaoConformidadeSheet';
import { AutosaveIndicator } from '@/components/recebimento/AutosaveIndicator';
import { RecebimentoNav, type RecebimentoSecao } from '@/components/recebimento/RecebimentoNav';
import { RecebimentoOverview } from '@/components/recebimento/RecebimentoOverview';
import { ChecklistView } from '@/components/recebimento/ChecklistView';
import { PendenciasView } from '@/components/recebimento/PendenciasView';
import { ReinspecaoView } from '@/components/recebimento/ReinspecaoView';
import { FotosGaleria } from '@/components/recebimento/FotosGaleria';
import { HistoricoTimeline } from '@/components/recebimento/HistoricoTimeline';
import { StatusSheet, type StatusAlvo } from '@/components/recebimento/StatusSheet';
import { FinalizarVistoriaSheet } from '@/components/recebimento/FinalizarVistoriaSheet';
import { RecebimentoMobileFooter } from '@/components/recebimento/RecebimentoMobileFooter';
import { ABERTAS, vistoriaTitulo, type VerificacaoStatus } from '@/lib/recebimento/constants';
import { gerarRelatorioRecebimentoPdf } from '@/lib/recebimento/relatorioPdf';
import { uploadRecebimentoFoto } from '@/lib/recebimento/storage';

export function RecebimentoObra() {
  const { obraId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, role } = useUserRole();

  const [obra, setObra] = useState<Record<string, unknown> | null>(null);
  const [fiscalNome, setFiscalNome] = useState('');
  const [vistoriaId, setVistoriaId] = useState<string | null>(null);
  const [ambienteAtivoId, setAmbienteAtivoId] = useState<string | null>(null);
  const [secao, setSecao] = useState<RecebimentoSecao>('visao');
  const [gerando, setGerando] = useState(false);

  const [novaVistoriaOpen, setNovaVistoriaOpen] = useState(false);
  const [ambienteOpen, setAmbienteOpen] = useState(false);
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [servicoOpen, setServicoOpen] = useState(false);
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [statusAlvo, setStatusAlvo] = useState<StatusAlvo | null>(null);
  const [ncAlvo, setNcAlvo] = useState<{ v: Verificacao; servico: string } | null>(null);

  const { vistorias, criarVistoria, concluirVistoria, reabrirVistoria } =
    useRecebimentoVistorias(obraId);
  const checklist = useRecebimentoChecklist(obraId, vistoriaId);
  const pend = useRecebimentoPendencias(obraId);

  const vistoria = vistorias.find((v) => v.id === vistoriaId) ?? null;
  const somenteLeitura = !vistoria || vistoria.status !== 'em_andamento';
  const podeEditar = isAdmin || role === 'editor' || role === 'gm' || role === 'admin';
  const bloqueado = somenteLeitura || !podeEditar;

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
    return {
      total: todas.length,
      feitas,
      conformes: todas.filter((v) => v.status === 'conforme').length,
      naoExecutados: todas.filter((v) => v.status === 'nao_executado').length,
      abertas: pend.pendencias.filter((p) => ABERTAS.includes(p.situacao)).length,
    };
  }, [checklist.ambientes, pend.pendencias]);

  const abrirVerificacao = (v: Verificacao, servico: AmbienteServico) => {
    setStatusAlvo({
      verificacao: v,
      servicoNome: servico.servico_snapshot,
      macroNome: servico.macro_snapshot,
      ambienteNome: ambiente?.nome ?? '',
    });
  };

  const aplicarStatus = async (v: Verificacao, status: VerificacaoStatus) => {
    setStatusAlvo(null);
    await checklist.setStatus(v.id, status);
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

  const irParaAmbiente = (delta: number) => {
    const idx = checklist.ambientes.findIndex((a) => a.id === ambienteAtivoId);
    const prox = checklist.ambientes[idx + delta];
    if (prox) setAmbienteAtivoId(prox.id);
  };

  const idxAmbiente = checklist.ambientes.findIndex((a) => a.id === ambienteAtivoId);

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

  const abrirPendencia = (_p: Pendencia) => setSecao('pendencias');

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
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              Obras · {(obra?.nome as string) ?? ''}
            </p>
            <h1 className="truncate text-base font-semibold md:text-lg">
              {vistoria ? vistoriaTitulo(vistoria) : 'Recebimento de Obra'}
            </h1>
          </div>
          {vistoria && (
            <Badge variant={vistoria.status === 'em_andamento' ? 'default' : 'secondary'}>
              {vistoria.status === 'em_andamento' ? 'Em andamento' : 'Concluída'}
            </Badge>
          )}
        </header>
      )}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-24 lg:pb-4">
        {vistoria && (
          <AutosaveIndicator
            estado={checklist.syncEstado}
            pendentes={checklist.pendentes}
            ultimoSalvamento={checklist.ultimoSalvamento}
            onSincronizar={() => checklist.sincronizarAgora()}
          />
        )}

        <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Vistoria
            </p>
            <Select value={vistoriaId ?? ''} onValueChange={setVistoriaId}>
              <SelectTrigger className="mt-1 h-11 lg:max-w-md">
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
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" onClick={() => setNovaVistoriaOpen(true)} disabled={!podeEditar}>
              <Plus className="mr-2 h-4 w-4" /> Nova vistoria
            </Button>
            {vistoria && vistoria.status === 'em_andamento' && (
              <Button variant="outline" className="h-11" onClick={() => setFinalizarOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
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
          <div className="flex gap-6">
            <RecebimentoNav
              value={secao}
              onChange={setSecao}
              badges={{ pendencias: stats.abertas }}
              orientation="vertical"
              className="sticky top-24 hidden self-start xl:flex"
            />

            <div className="min-w-0 flex-1 space-y-4">
              <RecebimentoNav
                value={secao}
                onChange={setSecao}
                badges={{ pendencias: stats.abertas }}
                className="xl:hidden"
              />

              {secao === 'visao' && (
                <RecebimentoOverview
                  ambientes={checklist.ambientes}
                  pendencias={pend.pendencias}
                  pendenciasPorAmbiente={pendenciasPorAmbiente}
                  onContinuar={() => setSecao('checklist')}
                  onAbrirAmbiente={(id) => {
                    setAmbienteAtivoId(id);
                    setSecao('checklist');
                  }}
                  onVerPendencias={() => setSecao('pendencias')}
                />
              )}

              {secao === 'checklist' && (
                <ChecklistView
                  ambientes={checklist.ambientes}
                  ambienteAtivoId={ambienteAtivoId}
                  onSelecionarAmbiente={setAmbienteAtivoId}
                  pendenciasPorAmbiente={pendenciasPorAmbiente}
                  pendencias={pend.pendencias}
                  fotos={pend.fotos}
                  somenteLeitura={bloqueado}
                  onAbrirVerificacao={abrirVerificacao}
                  onMarcarPendentes={(s) => checklist.marcarGrupo(s.verificacoes, 'conforme')}
                  onNovoAmbiente={() => setAmbienteOpen(true)}
                  onDuplicarAmbiente={() => setDuplicarOpen(true)}
                  onRemoverAmbiente={(id) => checklist.inativarAmbiente(id)}
                  onAdicionarServico={() => setServicoOpen(true)}
                  onRemoverServico={(id) => checklist.inativarServico(id)}
                  onFoto={handleFotoGeral}
                  onAbrirPendencia={abrirPendencia}
                />
              )}

              {secao === 'pendencias' && (
                <PendenciasView
                  pendencias={pend.pendencias}
                  fotos={pend.fotos}
                  historico={pend.historico}
                  nomeAmbiente={nomeAmbiente}
                  somenteLeitura={bloqueado}
                  onRegistrarCorrecao={(p, observacao, fotos) =>
                    pend.registrarCorrecao({ pendencia: p, vistoriaId: vistoria.id, observacao, fotos })
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
              )}

              {secao === 'fotos' && (
                <FotosGaleria fotos={pend.fotos} nomeAmbiente={nomeAmbiente} />
              )}

              {secao === 'historico' && (
                <HistoricoTimeline
                  historico={pend.historico}
                  pendencias={pend.pendencias}
                  nomeAmbiente={nomeAmbiente}
                />
              )}

              {secao === 'relatorio' && (
                <div className="space-y-4">
                  <ReinspecaoView
                    vistoriaTitulo={vistoriaTitulo(vistoria)}
                    ehReinspecao={vistoria.tipo === 'reinspecao'}
                    pendencias={pend.pendencias}
                    fotos={pend.fotos}
                    historico={pend.historico}
                    nomeAmbiente={nomeAmbiente}
                    somenteLeitura={bloqueado}
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

                  <Button className="h-12 w-full lg:w-auto lg:px-8" onClick={exportarPdf} disabled={gerando}>
                    {gerando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Gerar relatório PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {vistoria && secao === 'checklist' && (
        <RecebimentoMobileFooter
          onAnterior={() => irParaAmbiente(-1)}
          onProximo={() => irParaAmbiente(1)}
          onFoto={handleFotoGeral}
          anteriorDisabled={idxAmbiente <= 0}
          proximoDisabled={idxAmbiente < 0 || idxAmbiente >= checklist.ambientes.length - 1}
        />
      )}

      <StatusSheet
        alvo={statusAlvo}
        onOpenChange={(o) => !o && setStatusAlvo(null)}
        onSelecionar={aplicarStatus}
      />

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
            setSecao('visao');
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

      <FinalizarVistoriaSheet
        open={finalizarOpen}
        onOpenChange={setFinalizarOpen}
        vistoriados={stats.feitas}
        naoVistoriados={stats.total - stats.feitas}
        pendenciasAbertas={stats.abertas}
        naoExecutados={stats.naoExecutados}
        onVerPendentes={() => {
          setFinalizarOpen(false);
          setSecao('checklist');
        }}
        onFinalizar={() => {
          setFinalizarOpen(false);
          setConcluirOpen(true);
        }}
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
