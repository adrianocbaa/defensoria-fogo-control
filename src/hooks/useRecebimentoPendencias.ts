import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PendenciaClassificacao, PendenciaSituacao } from '@/lib/recebimento/constants';
import { signRecebimentoFotos, uploadRecebimentoFoto } from '@/lib/recebimento/storage';

export interface Pendencia {
  id: string;
  verificacao_id: string | null;
  ambiente_id: string | null;
  obra_id: string;
  vistoria_origem_id: string | null;
  titulo: string;
  descricao: string | null;
  classificacao: PendenciaClassificacao;
  prazo_correcao: string | null;
  situacao: PendenciaSituacao;
  criada_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendenciaHistorico {
  id: string;
  pendencia_id: string;
  vistoria_id: string | null;
  evento: string;
  situacao_anterior: string | null;
  situacao_nova: string | null;
  observacao: string | null;
  autor: string | null;
  created_at: string;
}

export interface Foto {
  id: string;
  obra_id: string;
  vistoria_id: string | null;
  ambiente_id: string | null;
  pendencia_id: string | null;
  historico_id: string | null;
  tipo: 'ocorrencia' | 'correcao' | 'geral';
  storage_path: string;
  legenda: string | null;
  autor: string | null;
  created_at: string;
  url?: string | null;
}

export function useRecebimentoPendencias(obraId: string) {
  const { user } = useAuth();
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [historico, setHistorico] = useState<PendenciaHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const [{ data: pends }, { data: fts }, { data: hist }] = await Promise.all([
      supabase
        .from('recebimento_pendencias')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true })
        .limit(10000),
      supabase
        .from('recebimento_fotos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true })
        .limit(10000),
      supabase
        .from('recebimento_pendencia_historico')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true })
        .limit(10000),
    ]);

    const fotosList = (fts ?? []) as unknown as Foto[];
    const urlMap = await signRecebimentoFotos(fotosList.map((f) => f.storage_path));

    setPendencias((pends ?? []) as unknown as Pendencia[]);
    setHistorico((hist ?? []) as unknown as PendenciaHistorico[]);
    setFotos(fotosList.map((f) => ({ ...f, url: urlMap[f.storage_path] ?? null })));
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const registrarHistorico = async (args: {
    pendenciaId: string;
    vistoriaId?: string | null;
    evento: string;
    situacaoAnterior?: string | null;
    situacaoNova?: string | null;
    observacao?: string | null;
  }): Promise<string | null> => {
    const { data, error } = await supabase
      .from('recebimento_pendencia_historico')
      .insert({
        pendencia_id: args.pendenciaId,
        obra_id: obraId,
        vistoria_id: args.vistoriaId ?? null,
        evento: args.evento,
        situacao_anterior: args.situacaoAnterior ?? null,
        situacao_nova: args.situacaoNova ?? null,
        observacao: args.observacao ?? null,
        autor: user?.id ?? null,
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
    vistoriaId: string;
    ambienteId?: string | null;
    pendenciaId?: string | null;
    historicoId?: string | null;
    tipo: 'ocorrencia' | 'correcao' | 'geral';
    legenda?: string | null;
  }) => {
    for (const file of args.files) {
      try {
        const path = await uploadRecebimentoFoto({
          file,
          obraId,
          vistoriaId: args.vistoriaId,
          ambienteId: args.ambienteId,
          pendenciaId: args.pendenciaId,
        });
        const { error } = await supabase.from('recebimento_fotos').insert({
          obra_id: obraId,
          vistoria_id: args.vistoriaId,
          ambiente_id: args.ambienteId ?? null,
          pendencia_id: args.pendenciaId ?? null,
          historico_id: args.historicoId ?? null,
          tipo: args.tipo,
          storage_path: path,
          legenda: args.legenda ?? null,
          autor: user?.id ?? null,
        });
        if (error) throw error;
      } catch (e: any) {
        toast.error('Falha ao enviar foto: ' + (e?.message ?? 'erro desconhecido'));
      }
    }
  };

  /** Cria a pendência a partir de uma verificação marcada como Não Conforme. */
  const criarPendencia = async (args: {
    verificacaoId: string;
    ambienteId: string;
    vistoriaId: string;
    titulo: string;
    descricao: string;
    classificacao: PendenciaClassificacao;
    prazoCorrecao?: string | null;
    observacao?: string | null;
    fotos: File[];
  }) => {
    const { data, error } = await supabase
      .from('recebimento_pendencias')
      .insert({
        verificacao_id: args.verificacaoId,
        ambiente_id: args.ambienteId,
        obra_id: obraId,
        vistoria_origem_id: args.vistoriaId,
        titulo: args.titulo,
        descricao: args.descricao,
        classificacao: args.classificacao,
        prazo_correcao: args.prazoCorrecao || null,
        criada_por: user?.id ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error('Erro ao criar pendência');
      return null;
    }

    const histId = await registrarHistorico({
      pendenciaId: data.id,
      vistoriaId: args.vistoriaId,
      evento: 'criada',
      situacaoNova: 'pendente',
      observacao: args.observacao ?? args.descricao,
    });

    if (args.fotos.length) {
      await anexarFotos({
        files: args.fotos,
        vistoriaId: args.vistoriaId,
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

  const registrarCorrecao = async (args: {
    pendencia: Pendencia;
    vistoriaId: string;
    observacao: string;
    fotos: File[];
  }) => {
    const histId = await registrarHistorico({
      pendenciaId: args.pendencia.id,
      vistoriaId: args.vistoriaId,
      evento: 'correcao_registrada',
      situacaoAnterior: args.pendencia.situacao,
      situacaoNova: 'correcao_registrada',
      observacao: args.observacao,
    });
    if (args.fotos.length) {
      await anexarFotos({
        files: args.fotos,
        vistoriaId: args.vistoriaId,
        ambienteId: args.pendencia.ambiente_id,
        pendenciaId: args.pendencia.id,
        historicoId: histId,
        tipo: 'correcao',
      });
    }
    await supabase
      .from('recebimento_pendencias')
      .update({ situacao: 'correcao_registrada' })
      .eq('id', args.pendencia.id);
    await fetchAll();
    toast.success('Correção registrada — aguardando reinspeção');
  };

  const avaliarReinspecao = async (args: {
    pendencia: Pendencia;
    vistoriaId: string;
    aceita: boolean;
    observacao: string;
    fotos: File[];
  }) => {
    const novaSituacao: PendenciaSituacao = args.aceita ? 'sanada' : 'reprovada';
    const histId = await registrarHistorico({
      pendenciaId: args.pendencia.id,
      vistoriaId: args.vistoriaId,
      evento: args.aceita ? 'sanada' : 'reprovada',
      situacaoAnterior: args.pendencia.situacao,
      situacaoNova: novaSituacao,
      observacao: args.observacao,
    });
    if (args.fotos.length) {
      await anexarFotos({
        files: args.fotos,
        vistoriaId: args.vistoriaId,
        ambienteId: args.pendencia.ambiente_id,
        pendenciaId: args.pendencia.id,
        historicoId: histId,
        tipo: args.aceita ? 'correcao' : 'ocorrencia',
      });
    }
    await supabase
      .from('recebimento_pendencias')
      .update({
        situacao: novaSituacao,
        sanada_em: args.aceita ? new Date().toISOString() : null,
        sanada_por: args.aceita ? user?.id ?? null : null,
      })
      .eq('id', args.pendencia.id);
    await fetchAll();
    toast.success(args.aceita ? 'Pendência sanada' : 'Pendência continua em aberto');
  };

  const cancelarPendencia = async (pendencia: Pendencia, motivo: string) => {
    await registrarHistorico({
      pendenciaId: pendencia.id,
      evento: 'cancelada',
      situacaoAnterior: pendencia.situacao,
      situacaoNova: 'cancelada',
      observacao: motivo,
    });
    await supabase
      .from('recebimento_pendencias')
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

  return {
    pendencias,
    fotos,
    historico,
    loading,
    criarPendencia,
    registrarCorrecao,
    avaliarReinspecao,
    cancelarPendencia,
    anexarFotos,
    refetch: fetchAll,
  };
}
