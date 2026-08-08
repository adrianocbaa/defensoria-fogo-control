import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ABERTAS, type Impacto, type Responsabilidade } from '@/lib/entrega/constants';
import { assinarEntregaFotos, uploadEntregaFoto } from '@/lib/entrega/storage';
import type { EntregaPendencia } from './useEntregaInstitucional';

const db = supabase as any;

export interface EntregaFoto {
  id: string;
  entrega_id: string;
  ambiente_id: string | null;
  pendencia_id: string | null;
  historico_id: string | null;
  reinspecao_id: string | null;
  tipo: 'geral' | 'ocorrencia' | 'correcao' | 'reinspecao';
  storage_path: string;
  legenda: string | null;
  autor: string | null;
  created_at: string;
  url?: string | null;
}

export interface EntregaHistorico {
  id: string;
  pendencia_id: string;
  reinspecao_id: string | null;
  evento: string;
  situacao_anterior: string | null;
  situacao_nova: string | null;
  observacao: string | null;
  autor: string | null;
  autor_nome: string | null;
  created_at: string;
}

export interface EntregaReinspecao {
  id: string;
  entrega_id: string;
  sequencia: number;
  data: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  status: 'em_andamento' | 'concluida';
  observacoes: string | null;
  created_at: string;
}

export interface EntregaReinspecaoItem {
  id: string;
  reinspecao_id: string;
  pendencia_id: string;
  resultado: 'sanada' | 'continua_pendente' | null;
  observacao: string | null;
  avaliado_por: string | null;
  avaliado_em: string | null;
}

export function useEntregaPendencias(obraId: string, entregaId: string | null) {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState<EntregaPendencia[]>([]);
  const [fotos, setFotos] = useState<EntregaFoto[]>([]);
  const [historico, setHistorico] = useState<EntregaHistorico[]>([]);
  const [reinspecoes, setReinspecoes] = useState<EntregaReinspecao[]>([]);
  const [reinspecaoItens, setReinspecaoItens] = useState<EntregaReinspecaoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    if (!user) return;
    db.from('profiles')
      .select('display_name, email')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { display_name?: string; email?: string } | null }) =>
        setNomeUsuario(data?.display_name ?? data?.email ?? ''),
      );
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!entregaId) {
      setPendencias([]);
      setFotos([]);
      setHistorico([]);
      setReinspecoes([]);
      setReinspecaoItens([]);
      return;
    }
    setLoading(true);
    const [{ data: pends }, { data: fts }, { data: hist }, { data: reins }] = await Promise.all([
      db
        .from('entrega_pendencias')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('created_at', { ascending: true })
        .limit(10000),
      db
        .from('entrega_fotos')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('created_at', { ascending: true })
        .limit(10000),
      db
        .from('entrega_pendencia_historico')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('created_at', { ascending: true })
        .limit(10000),
      db
        .from('entrega_reinspecoes')
        .select('*')
        .eq('entrega_id', entregaId)
        .order('sequencia', { ascending: true })
        .limit(1000),
    ]);

    const listaReins = (reins ?? []) as EntregaReinspecao[];
    let itens: EntregaReinspecaoItem[] = [];
    if (listaReins.length) {
      const { data } = await db
        .from('entrega_reinspecao_itens')
        .select('*')
        .in(
          'reinspecao_id',
          listaReins.map((r) => r.id),
        )
        .limit(10000);
      itens = (data ?? []) as EntregaReinspecaoItem[];
    }

    const listaFotos = (fts ?? []) as EntregaFoto[];
    const urls = await assinarEntregaFotos(listaFotos.map((f) => f.storage_path));

    setPendencias((pends ?? []) as EntregaPendencia[]);
    setFotos(listaFotos.map((f) => ({ ...f, url: urls[f.storage_path] ?? null })));
    setHistorico((hist ?? []) as EntregaHistorico[]);
    setReinspecoes(listaReins);
    setReinspecaoItens(itens);
    setLoading(false);
  }, [entregaId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ------------------------------------------------------------ auxiliares */

  const registrarHistorico = async (args: {
    pendenciaId: string;
    evento: string;
    situacaoAnterior?: string | null;
    situacaoNova?: string | null;
    observacao?: string | null;
    reinspecaoId?: string | null;
  }): Promise<string | null> => {
    if (!entregaId) return null;
    const { data, error } = await db
      .from('entrega_pendencia_historico')
      .insert({
        pendencia_id: args.pendenciaId,
        entrega_id: entregaId,
        obra_id: obraId,
        reinspecao_id: args.reinspecaoId ?? null,
        evento: args.evento,
        situacao_anterior: args.situacaoAnterior ?? null,
        situacao_nova: args.situacaoNova ?? null,
        observacao: args.observacao ?? null,
        autor: user?.id ?? null,
        autor_nome: nomeUsuario || null,
      })
      .select()
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    return data.id as string;
  };

  const anexarFotos = async (args: {
    files: File[];
    ambienteId?: string | null;
    pendenciaId?: string | null;
    historicoId?: string | null;
    reinspecaoId?: string | null;
    tipo: EntregaFoto['tipo'];
    legenda?: string | null;
  }) => {
    if (!entregaId) return;
    for (const file of args.files) {
      try {
        const path = await uploadEntregaFoto({
          file,
          obraId,
          entregaId,
          ambienteId: args.ambienteId,
          pendenciaId: args.pendenciaId,
        });
        await db.from('entrega_fotos').insert({
          entrega_id: entregaId,
          obra_id: obraId,
          ambiente_id: args.ambienteId ?? null,
          pendencia_id: args.pendenciaId ?? null,
          historico_id: args.historicoId ?? null,
          reinspecao_id: args.reinspecaoId ?? null,
          tipo: args.tipo,
          storage_path: path,
          legenda: args.legenda ?? null,
          autor: user?.id ?? null,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'erro desconhecido';
        toast.error('Falha ao enviar foto: ' + msg);
      }
    }
  };

  /* -------------------------------------------------------------- ações */

  const adicionarFotoGeral = async (files: File[], ambienteId: string | null, legenda?: string) => {
    await anexarFotos({ files, ambienteId, tipo: 'geral', legenda });
    await fetchAll();
    toast.success('Foto registrada no ambiente');
  };

  const removerFoto = async (foto: EntregaFoto) => {
    await db.from('entrega_fotos').delete().eq('id', foto.id);
    await fetchAll();
  };

  const criarPendencia = async (args: {
    ambienteId: string | null;
    ambienteGrupoId: string | null;
    verificacaoId: string | null;
    titulo: string;
    descricao: string;
    responsabilidade: Responsabilidade;
    responsavelTerceiro?: string | null;
    impacto: Impacto;
    prazoCorrecao?: string | null;
    fotos: File[];
  }) => {
    if (!entregaId) return null;
    const { data, error } = await db
      .from('entrega_pendencias')
      .insert({
        entrega_id: entregaId,
        obra_id: obraId,
        ambiente_id: args.ambienteId,
        ambiente_grupo_id: args.ambienteGrupoId,
        verificacao_id: args.verificacaoId,
        titulo: args.titulo,
        descricao: args.descricao || null,
        responsabilidade: args.responsabilidade,
        responsavel_terceiro: args.responsavelTerceiro || null,
        impacto: args.impacto,
        prazo_correcao: args.prazoCorrecao || null,
        criada_por: user?.id ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error('Erro ao registrar a pendência');
      return null;
    }

    const histId = await registrarHistorico({
      pendenciaId: data.id,
      evento: 'criada',
      situacaoNova: 'pendente',
      observacao: args.descricao,
    });

    if (args.fotos.length) {
      await anexarFotos({
        files: args.fotos,
        ambienteId: args.ambienteId,
        pendenciaId: data.id,
        historicoId: histId,
        tipo: 'ocorrencia',
      });
    }

    await fetchAll();
    toast.success('Pendência registrada');
    return data.id as string;
  };

  const registrarCorrecao = async (
    pendencia: EntregaPendencia,
    observacao: string,
    arquivos: File[],
  ) => {
    const histId = await registrarHistorico({
      pendenciaId: pendencia.id,
      evento: 'correcao_registrada',
      situacaoAnterior: pendencia.situacao,
      situacaoNova: 'correcao_registrada',
      observacao,
    });
    if (arquivos.length) {
      await anexarFotos({
        files: arquivos,
        ambienteId: pendencia.ambiente_id,
        pendenciaId: pendencia.id,
        historicoId: histId,
        tipo: 'correcao',
      });
    }
    await db
      .from('entrega_pendencias')
      .update({ situacao: 'correcao_registrada' })
      .eq('id', pendencia.id);
    await fetchAll();
    toast.success('Correção registrada — aguardando reinspeção');
  };

  const cancelarPendencia = async (pendencia: EntregaPendencia, motivo: string) => {
    await registrarHistorico({
      pendenciaId: pendencia.id,
      evento: 'cancelada',
      situacaoAnterior: pendencia.situacao,
      situacaoNova: 'cancelada',
      observacao: motivo,
    });
    await db
      .from('entrega_pendencias')
      .update({
        situacao: 'cancelada',
        cancelada_em: new Date().toISOString(),
        cancelada_por: user?.id ?? null,
        motivo_cancelamento: motivo,
      })
      .eq('id', pendencia.id);
    await fetchAll();
    toast.success('Pendência cancelada com justificativa');
  };

  /** Abre uma sessão de reinspeção com as pendências abertas no momento. */
  const criarReinspecao = async () => {
    if (!entregaId) return null;
    const abertas = pendencias.filter((p) => ABERTAS.includes(p.situacao));
    if (!abertas.length) {
      toast.info('Não há pendências abertas para reinspecionar');
      return null;
    }
    const { data, error } = await db
      .from('entrega_reinspecoes')
      .insert({
        entrega_id: entregaId,
        obra_id: obraId,
        sequencia: reinspecoes.length + 1,
        data: new Date().toISOString().slice(0, 10),
        responsavel_id: user?.id ?? null,
        responsavel_nome: nomeUsuario || null,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error('Erro ao criar a reinspeção');
      return null;
    }
    await db.from('entrega_reinspecao_itens').insert(
      abertas.map((p) => ({
        reinspecao_id: data.id,
        pendencia_id: p.id,
        obra_id: obraId,
      })),
    );
    await fetchAll();
    toast.success(`Reinspeção nº ${String(reinspecoes.length + 1).padStart(2, '0')} criada`);
    return data.id as string;
  };

  const avaliarItemReinspecao = async (args: {
    reinspecaoId: string;
    pendencia: EntregaPendencia;
    sanada: boolean;
    observacao: string;
    fotos: File[];
  }) => {
    const novaSituacao = args.sanada ? 'sanada' : 'reprovada';
    const histId = await registrarHistorico({
      pendenciaId: args.pendencia.id,
      reinspecaoId: args.reinspecaoId,
      evento: args.sanada ? 'sanada' : 'reprovada',
      situacaoAnterior: args.pendencia.situacao,
      situacaoNova: novaSituacao,
      observacao: args.observacao,
    });
    if (args.fotos.length) {
      await anexarFotos({
        files: args.fotos,
        ambienteId: args.pendencia.ambiente_id,
        pendenciaId: args.pendencia.id,
        historicoId: histId,
        reinspecaoId: args.reinspecaoId,
        tipo: 'reinspecao',
      });
    }
    await db
      .from('entrega_reinspecao_itens')
      .update({
        resultado: args.sanada ? 'sanada' : 'continua_pendente',
        observacao: args.observacao || null,
        avaliado_por: user?.id ?? null,
        avaliado_em: new Date().toISOString(),
      })
      .eq('reinspecao_id', args.reinspecaoId)
      .eq('pendencia_id', args.pendencia.id);

    await db
      .from('entrega_pendencias')
      .update({
        situacao: novaSituacao,
        sanada_em: args.sanada ? new Date().toISOString() : null,
        sanada_por: args.sanada ? user?.id ?? null : null,
      })
      .eq('id', args.pendencia.id);

    await fetchAll();
    toast.success(args.sanada ? 'Pendência sanada' : 'Pendência continua em aberto');
  };

  const concluirReinspecao = async (reinspecaoId: string) => {
    await db
      .from('entrega_reinspecoes')
      .update({ status: 'concluida', concluida_em: new Date().toISOString() })
      .eq('id', reinspecaoId);
    await fetchAll();
  };

  return {
    loading,
    pendencias,
    fotos,
    historico,
    reinspecoes,
    reinspecaoItens,
    criarPendencia,
    registrarCorrecao,
    cancelarPendencia,
    criarReinspecao,
    avaliarItemReinspecao,
    concluirReinspecao,
    adicionarFotoGeral,
    removerFoto,
    refetch: fetchAll,
  };
}
