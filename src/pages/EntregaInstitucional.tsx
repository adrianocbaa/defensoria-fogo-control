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
import { ArrowLeft, Building2, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useEntregaInstitucional } from '@/hooks/useEntregaInstitucional';
import { useEntregaPendencias } from '@/hooks/useEntregaPendencias';
import { EntregaNav, type EntregaSecao } from '@/components/entrega/EntregaNav';
import { EntregaOverview } from '@/components/entrega/EntregaOverview';
import { EntregaChecklistView } from '@/components/entrega/EntregaChecklistView';
import { EntregaPendenciasView } from '@/components/entrega/EntregaPendenciasView';
import { EntregaReinspecaoView } from '@/components/entrega/EntregaReinspecaoView';
import { EntregaFotosView } from '@/components/entrega/EntregaFotosView';
import { EntregaResultadoView } from '@/components/entrega/EntregaResultadoView';
import { EntregaStatusSheet, type StatusAlvo } from '@/components/entrega/EntregaStatusSheet';
import {
  EntregaPendenciaSheet,
  type PendenciaAlvo,
} from '@/components/entrega/EntregaPendenciaSheet';
import { PrepararEntregaDialog } from '@/components/entrega/PrepararEntregaDialog';
import { AdicionarAmbienteDialog } from '@/components/entrega/AdicionarAmbienteDialog';
import { ServicoComplementarSheet } from '@/components/entrega/ServicoComplementarSheet';
import { FotoPicker } from '@/components/entrega/FotoPicker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ABERTAS, formatarData, type VerificacaoStatus } from '@/lib/entrega/constants';
import { calcularResumo } from '@/lib/entrega/resultado';
import {
  gerarRelatorioFotograficoEntregaPdf,
  gerarTermoEntregaPdf,
} from '@/lib/entrega/relatorioPdf';

export function EntregaInstitucional() {
  const { obraId = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin, role } = useUserRole();

  const [obra, setObra] = useState<Record<string, unknown> | null>(null);
  const [secao, setSecao] = useState<EntregaSecao>('visao');
  const [ambienteAtivoId, setAmbienteAtivoId] = useState<string | null>(null);
  const [prepararOpen, setPrepararOpen] = useState(false);
  const [ambienteOpen, setAmbienteOpen] = useState(false);
  const [servicoOpen, setServicoOpen] = useState(false);
  const [fotoOpen, setFotoOpen] = useState(false);
  const [fotoArquivos, setFotoArquivos] = useState<File[]>([]);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [statusAlvo, setStatusAlvo] = useState<StatusAlvo | null>(null);
  const [pendenciaAlvo, setPendenciaAlvo] = useState<PendenciaAlvo | null>(null);
  const [exportando, setExportando] = useState(false);

  const ent = useEntregaInstitucional(obraId);
  const pend = useEntregaPendencias(obraId, ent.entregaId);

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
    if (ent.ambientes.length === 0) setAmbienteAtivoId(null);
    else if (!ent.ambientes.some((a) => a.id === ambienteAtivoId))
      setAmbienteAtivoId(ent.ambientes[0].id);
  }, [ent.ambientes, ambienteAtivoId]);

  const podeEditar = isAdmin || role === 'editor' || role === 'gm';
  const entrega = ent.entrega;
  const formalizada = !!entrega?.ciencia_em;
  const somenteLeitura = !entrega || formalizada || !podeEditar;

  const resumo = useMemo(
    () => calcularResumo(ent.ambientes, pend.pendencias),
    [ent.ambientes, pend.pendencias],
  );

  const nomeAmbiente = (id: string | null) =>
    ent.ambientes.find((a) => a.id === id)?.nome ?? 'Ambiente';

  const nomeGrupo = (id: string | null) =>
    ent.ambientes.flatMap((a) => a.grupos).find((g) => g.id === id)?.grupo_snapshot ?? 'Serviço';

  const pendenciasPorAmbiente = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of pend.pendencias) {
      if (!p.ambiente_id || !ABERTAS.includes(p.situacao)) continue;
      map[p.ambiente_id] = (map[p.ambiente_id] ?? 0) + 1;
    }
    return map;
  }, [pend.pendencias]);

  const ambienteAtivo = ent.ambientes.find((a) => a.id === ambienteAtivoId) ?? null;

  const aplicarStatus = async (status: VerificacaoStatus) => {
    if (!statusAlvo) return;
    const { verificacao, grupoNome, ambienteNome } = statusAlvo;
    setStatusAlvo(null);
    await ent.definirStatus([verificacao.id], status);
    if (status === 'pendencia') {
      const grupo = ent.ambientes
        .flatMap((a) => a.grupos)
        .find((g) => g.id === verificacao.ambiente_grupo_id);
      setPendenciaAlvo({
        verificacaoId: verificacao.id,
        ambienteId: verificacao.ambiente_id,
        ambienteGrupoId: verificacao.ambiente_grupo_id,
        ambienteNome,
        grupoNome,
        descricao: verificacao.descricao_snapshot,
        responsabilidadePadrao: grupo?.responsabilidade_padrao ?? 'contratada',
      });
    }
  };

  const cancelarPendenciaAlvo = async () => {
    if (pendenciaAlvo?.verificacaoId) {
      await ent.definirStatus([pendenciaAlvo.verificacaoId], 'nao_vistoriado');
    }
    setPendenciaAlvo(null);
  };

  const dadosObra = {
    nome: (obra?.nome as string) ?? 'Obra',
    contrato: (obra?.numero_contrato as string) ?? (obra?.contrato as string) ?? null,
    endereco: (obra?.endereco_completo as string) ?? null,
    empresa: (obra?.empresa_responsavel as string) ?? (obra?.empresa as string) ?? null,
  };

  const exportar = async (tipo: 'termo' | 'fotografico') => {
    if (!entrega) return;
    setExportando(true);
    try {
      const args = {
        entrega,
        obra: dadosObra,
        resumo,
        ambientes: ent.ambientes,
        participantes: ent.participantes,
        pendencias: pend.pendencias.filter((p) => p.situacao !== 'cancelada'),
        fotos: pend.fotos,
      };
      if (tipo === 'termo') await gerarTermoEntregaPdf(args);
      else await gerarRelatorioFotograficoEntregaPdf(args);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar o documento');
    } finally {
      setExportando(false);
    }
  };

  const navegarAmbiente = (delta: number) => {
    const idx = ent.ambientes.findIndex((a) => a.id === ambienteAtivoId);
    const prox = ent.ambientes[idx + delta];
    if (prox) setAmbienteAtivoId(prox.id);
  };

  const badges: Partial<Record<EntregaSecao, number>> = {
    pendencias: resumo.pendenciasAbertas,
    fotos: pend.fotos.length,
  };

  const semDefinitivo = !ent.definitivo;
  const semEntrega = !entrega;

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
              Obras · {dadosObra.nome}
            </p>
            <h1 className="truncate text-base font-semibold md:text-lg">Entrega Institucional</h1>
          </div>
          {entrega && (
            <Badge variant={formalizada ? 'secondary' : 'default'}>
              {formalizada ? 'Entregue' : 'Em andamento'}
            </Badge>
          )}
        </header>
      )}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-16">
        {ent.loading ? (
          <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando entrega institucional...
          </Card>
        ) : semDefinitivo ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold">Recebimento Definitivo não concluído</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              A Entrega Institucional é uma etapa independente do Recebimento Técnico e só pode ser
              iniciada após a conclusão do Recebimento Definitivo da obra.
            </p>
            <Button
              variant="outline"
              className="mt-2 h-11"
              onClick={() => navigate(`/obras/${obraId}/checklist/recebimento`)}
            >
              Ir para o Recebimento de Obra
            </Button>
          </Card>
        ) : semEntrega ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Preparar Entrega Institucional</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Verificação da prontidão da edificação para uso — limpeza, pintura, climatização,
              persianas e mobiliário. Os ambientes serão importados do Recebimento Definitivo
              concluído em {formatarData(ent.definitivo?.concluido_em ?? ent.definitivo?.data)}.
            </p>
            {podeEditar && (
              <Button className="mt-2 h-12" onClick={() => setPrepararOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Preparar entrega
              </Button>
            )}
          </Card>
        ) : (
          <>
            <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Entrega
                </p>
                <Select value={ent.entregaId ?? ''} onValueChange={ent.setEntregaId}>
                  <SelectTrigger className="mt-1 h-11 lg:max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ent.entregas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        Entrega de {formatarData(e.data)}
                        {e.ciencia_em ? ' — formalizada' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {podeEditar && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="h-11" onClick={() => setPrepararOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova entrega
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="h-11 text-destructive hover:text-destructive"
                      onClick={() => setExcluirOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  )}
                </div>
              )}
            </Card>

            <EntregaNav value={secao} onChange={setSecao} badges={badges} />

            {secao === 'visao' && entrega && (
              <EntregaOverview
                entrega={entrega}
                resumo={resumo}
                ambientes={ent.ambientes}
                participantes={ent.participantes}
                totalFotos={pend.fotos.length}
                onIrPara={setSecao}
                onSelecionarAmbiente={setAmbienteAtivoId}
              />
            )}

            {secao === 'checklist' && (
              <EntregaChecklistView
                ambientes={ent.ambientes}
                ambienteAtivoId={ambienteAtivoId}
                pendencias={pend.pendencias}
                pendenciasPorAmbiente={pendenciasPorAmbiente}
                fotos={pend.fotos}
                somenteLeitura={somenteLeitura}
                onSelecionarAmbiente={setAmbienteAtivoId}
                onAbrirVerificacao={(v, g) =>
                  setStatusAlvo({
                    verificacao: v,
                    grupoNome: g.grupo_snapshot,
                    ambienteNome: ambienteAtivo?.nome ?? '',
                  })
                }
                onMarcarConformes={(g) => ent.marcarPendentesComoConforme(g.verificacoes)}
                onRemoverGrupo={ent.removerGrupo}
                onAdicionarAmbiente={() => setAmbienteOpen(true)}
                onAdicionarServico={() => setServicoOpen(true)}
                onFotoGeral={() => setFotoOpen(true)}
                onAbrirPendencias={() => setSecao('pendencias')}
                onNavegarAmbiente={navegarAmbiente}
              />
            )}

            {secao === 'pendencias' && (
              <EntregaPendenciasView
                pendencias={pend.pendencias}
                fotos={pend.fotos}
                historico={pend.historico}
                nomeAmbiente={nomeAmbiente}
                nomeGrupo={nomeGrupo}
                somenteLeitura={somenteLeitura}
                progresso={resumo.progresso}
                onRegistrarCorrecao={pend.registrarCorrecao}
                onCancelar={pend.cancelarPendencia}
              />
            )}

            {secao === 'reinspecao' && (
              <EntregaReinspecaoView
                pendencias={pend.pendencias}
                fotos={pend.fotos}
                reinspecoes={pend.reinspecoes}
                reinspecaoItens={pend.reinspecaoItens}
                nomeAmbiente={nomeAmbiente}
                somenteLeitura={somenteLeitura}
                onCriarReinspecao={pend.criarReinspecao}
                onAvaliar={pend.avaliarItemReinspecao}
                onConcluirReinspecao={pend.concluirReinspecao}
              />
            )}

            {secao === 'fotos' && (
              <EntregaFotosView
                ambientes={ent.ambientes}
                fotos={pend.fotos}
                somenteLeitura={somenteLeitura}
                onRemover={pend.removerFoto}
              />
            )}

            {secao === 'resultado' && entrega && (
              <EntregaResultadoView
                entrega={entrega}
                resumo={resumo}
                pendenciasAbertas={pend.pendencias.filter((p) => ABERTAS.includes(p.situacao))}
                nomeAmbiente={nomeAmbiente}
                somenteLeitura={!podeEditar}
                exportando={exportando}
                onRegistrarCiencia={async (observacoes) => {
                  if (resumo.resultado !== 'apto' && resumo.resultado !== 'apto_com_ressalvas')
                    return;
                  await ent.registrarCiencia({
                    resultado: resumo.resultado,
                    resumo: resumo as unknown as Record<string, unknown>,
                    observacoes,
                  });
                }}
                onExportarTermo={() => exportar('termo')}
                onExportarFotografico={() => exportar('fotografico')}
              />
            )}
          </>
        )}
      </div>

      <PrepararEntregaDialog
        open={prepararOpen}
        onOpenChange={setPrepararOpen}
        definitivo={ent.definitivo}
        salvando={ent.salvando}
        onConfirmar={async (args) => {
          const id = await ent.prepararEntrega(args);
          if (id) {
            setPrepararOpen(false);
            setSecao('checklist');
          }
        }}
      />

      <AdicionarAmbienteDialog
        open={ambienteOpen}
        onOpenChange={setAmbienteOpen}
        templates={ent.templates}
        onConfirmar={async (args) => {
          const id = await ent.adicionarAmbiente(args);
          if (id) setAmbienteAtivoId(id);
        }}
      />

      {servicoOpen && (
        <ServicoComplementarSheet
          open={servicoOpen}
          onOpenChange={setServicoOpen}
          biblioteca={ent.biblioteca}
          ambientes={ent.ambientes}
          ambienteAtivoId={ambienteAtivoId}
          onConfirmar={ent.adicionarGrupoEmAmbientes}
        />
      )}

      <EntregaStatusSheet
        alvo={statusAlvo}
        onOpenChange={(o) => !o && setStatusAlvo(null)}
        onSelecionar={aplicarStatus}
      />

      <EntregaPendenciaSheet
        alvo={pendenciaAlvo}
        onOpenChange={(o) => !o && setPendenciaAlvo(null)}
        onCancelar={cancelarPendenciaAlvo}
        onSalvar={async (dados) => {
          if (!pendenciaAlvo) return;
          await pend.criarPendencia({
            ambienteId: pendenciaAlvo.ambienteId,
            ambienteGrupoId: pendenciaAlvo.ambienteGrupoId,
            verificacaoId: pendenciaAlvo.verificacaoId,
            titulo: dados.titulo,
            descricao: dados.descricao,
            responsabilidade: dados.responsabilidade,
            responsavelTerceiro: dados.responsavelTerceiro,
            impacto: dados.impacto,
            prazoCorrecao: dados.prazoCorrecao,
            fotos: dados.fotos,
          });
          setPendenciaAlvo(null);
        }}
      />

      <Dialog
        open={fotoOpen}
        onOpenChange={(o) => {
          setFotoOpen(o);
          if (!o) setFotoArquivos([]);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto geral de {ambienteAtivo?.nome ?? 'ambiente'}</DialogTitle>
          </DialogHeader>
          <FotoPicker arquivos={fotoArquivos} onChange={setFotoArquivos} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFotoOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!fotoArquivos.length}
              onClick={async () => {
                await pend.adicionarFotoGeral(fotoArquivos, ambienteAtivoId);
                setFotoArquivos([]);
                setFotoOpen(false);
              }}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta entrega institucional?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os ambientes, verificações, pendências, fotos e reinspeções desta entrega serão
              removidos definitivamente. O Recebimento Técnico não é afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (entrega) await ent.excluirEntrega(entrega.id);
                setExcluirOpen(false);
                setSecao('visao');
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ObrasLayout>
  );
}

export default EntregaInstitucional;
