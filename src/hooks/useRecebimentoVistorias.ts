import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { VistoriaStatus, VistoriaTipo } from '@/lib/recebimento/constants';
import { removerRecebimentoFotos } from '@/lib/recebimento/storage';

export interface Vistoria {
  id: string;
  obra_id: string;
  tipo: VistoriaTipo;
  sequencia: number;
  vistoria_origem_id: string | null;
  status: VistoriaStatus;
  data: string;
  iniciado_em: string;
  concluido_em: string | null;
  fiscal_id: string | null;
  observacoes: string | null;
  created_at: string;
}

export function useRecebimentoVistorias(obraId: string) {
  const { user } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVistorias = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('recebimento_vistorias')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
      .limit(10000);
    if (error) console.error(error);
    setVistorias((data ?? []) as unknown as Vistoria[]);
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    fetchVistorias();
  }, [fetchVistorias]);

  const criarVistoria = async (args: {
    tipo: VistoriaTipo;
    data: string;
    observacoes?: string;
    vistoriaOrigemId?: string | null;
    copiarEstruturaDe?: string | null;
  }): Promise<Vistoria | null> => {
    if (!user) return null;

    // sequência confiável: nº de vistorias do mesmo tipo na obra + 1
    const { count } = await supabase
      .from('recebimento_vistorias')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obraId)
      .eq('tipo', args.tipo);

    const { data, error } = await supabase
      .from('recebimento_vistorias')
      .insert({
        obra_id: obraId,
        tipo: args.tipo,
        sequencia: (count ?? 0) + 1,
        vistoria_origem_id: args.vistoriaOrigemId ?? null,
        data: args.data,
        observacoes: args.observacoes ?? null,
        fiscal_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar vistoria: ' + error.message);
      return null;
    }

    const nova = data as unknown as Vistoria;

    if (args.copiarEstruturaDe) {
      await copiarEstrutura(args.copiarEstruturaDe, nova.id, obraId, user.id);
    }

    await fetchVistorias();
    toast.success('Vistoria criada');
    return nova;
  };

  const concluirVistoria = async (vistoriaId: string) => {
    const { error } = await supabase
      .from('recebimento_vistorias')
      .update({
        status: 'concluida',
        concluido_em: new Date().toISOString(),
        concluida_por: user?.id ?? null,
      })
      .eq('id', vistoriaId);
    if (error) {
      toast.error('Erro ao concluir vistoria');
      return false;
    }
    await fetchVistorias();
    toast.success('Vistoria concluída');
    return true;
  };

  const reabrirVistoria = async (vistoriaId: string) => {
    const { error } = await supabase
      .from('recebimento_vistorias')
      .update({ status: 'em_andamento', concluido_em: null })
      .eq('id', vistoriaId);
    if (error) {
      toast.error('Erro ao reabrir vistoria');
      return;
    }
    await fetchVistorias();
  };

  const cancelarVistoria = async (vistoriaId: string, motivo: string) => {
    const { error } = await supabase
      .from('recebimento_vistorias')
      .update({
        status: 'cancelada',
        cancelada_em: new Date().toISOString(),
        cancelada_por: user?.id ?? null,
        motivo_cancelamento: motivo,
      })
      .eq('id', vistoriaId);
    if (error) {
      toast.error('Erro ao cancelar vistoria');
      return;
    }
    await fetchVistorias();
    toast.success('Vistoria cancelada');
  };

  const excluirVistoria = async (vistoriaId: string) => {
    try {
      const db = supabase as any;

      // ambientes desta vistoria (para pegar pendências ligadas por ambiente)
      const { data: ambs } = await db
        .from('recebimento_ambientes')
        .select('id')
        .eq('vistoria_id', vistoriaId)
        .limit(10000);
      const ambIds = ((ambs ?? []) as { id: string }[]).map((a) => a.id);

      // pendências geradas nesta vistoria (por origem ou por ambiente)
      const { data: pends } = await db
        .from('recebimento_pendencias')
        .select('id')
        .or(
          ambIds.length
            ? `vistoria_origem_id.eq.${vistoriaId},ambiente_id.in.(${ambIds.join(',')})`
            : `vistoria_origem_id.eq.${vistoriaId}`,
        )
        .limit(10000);
      const pendIds = ((pends ?? []) as { id: string }[]).map((p) => p.id);

      // fotos: apaga também os arquivos do bucket
      const { data: fts } = await db
        .from('recebimento_fotos')
        .select('storage_path')
        .or(
          pendIds.length
            ? `vistoria_id.eq.${vistoriaId},pendencia_id.in.(${pendIds.join(',')})`
            : `vistoria_id.eq.${vistoriaId}`,
        )
        .limit(10000);
      await removerRecebimentoFotos(
        ((fts ?? []) as { storage_path: string }[]).map((f) => f.storage_path),
      );

      if (pendIds.length) {
        await db.from('recebimento_fotos').delete().in('pendencia_id', pendIds);
        await db.from('recebimento_pendencia_historico').delete().in('pendencia_id', pendIds);
      }

      await db.from('recebimento_pendencia_historico').delete().eq('vistoria_id', vistoriaId);
      await db.from('recebimento_fotos').delete().eq('vistoria_id', vistoriaId);
      await db.from('recebimento_pendencias').delete().eq('vistoria_origem_id', vistoriaId);
      await db.from('recebimento_verificacoes').delete().eq('vistoria_id', vistoriaId);
      await db.from('recebimento_ambiente_servicos').delete().eq('vistoria_id', vistoriaId);
      await db.from('recebimento_ambientes').delete().eq('vistoria_id', vistoriaId);

      // vistorias derivadas (reinspeções) que apontam para esta
      await db.from('recebimento_vistorias').update({ vistoria_origem_id: null }).eq('vistoria_origem_id', vistoriaId);

      const { error } = await db.from('recebimento_vistorias').delete().eq('id', vistoriaId);
      if (error) throw error;

      await fetchVistorias();
      toast.success('Vistoria e todos os seus dados foram excluídos');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error('Erro ao excluir vistoria: ' + msg);
      return false;
    }
  };

  return {
    vistorias,
    loading,
    criarVistoria,
    concluirVistoria,
    reabrirVistoria,
    cancelarVistoria,
    excluirVistoria,
    refetch: fetchVistorias,
  };
}

/** Copia ambientes/serviços/verificações de uma vistoria para outra, zerando respostas. */
export async function copiarEstrutura(
  origemId: string,
  destinoId: string,
  obraId: string,
  userId: string,
) {
  const { data: ambientes } = await supabase
    .from('recebimento_ambientes')
    .select('*')
    .eq('vistoria_id', origemId)
    .eq('ativo', true)
    .limit(10000);
  if (!ambientes?.length) return;

  const { data: servicos } = await supabase
    .from('recebimento_ambiente_servicos')
    .select('*')
    .eq('vistoria_id', origemId)
    .eq('ativo', true)
    .limit(10000);

  const { data: verifs } = await supabase
    .from('recebimento_verificacoes')
    .select('*')
    .eq('vistoria_id', origemId)
    .eq('ativo', true)
    .limit(10000);

  for (const amb of ambientes) {
    const { data: novoAmb } = await supabase
      .from('recebimento_ambientes')
      .insert({
        vistoria_id: destinoId,
        obra_id: obraId,
        nome: amb.nome,
        tipo_modelo: amb.tipo_modelo,
        pavimento: amb.pavimento,
        ordem: amb.ordem,
        created_by: userId,
      })
      .select()
      .single();
    if (!novoAmb) continue;

    const servs = (servicos ?? []).filter((s) => s.ambiente_id === amb.id);
    for (const s of servs) {
      const { data: novoServ } = await supabase
        .from('recebimento_ambiente_servicos')
        .insert({
          ambiente_id: novoAmb.id,
          vistoria_id: destinoId,
          obra_id: obraId,
          biblioteca_servico_id: s.biblioteca_servico_id,
          macro_snapshot: s.macro_snapshot,
          servico_snapshot: s.servico_snapshot,
          ordem: s.ordem,
          created_by: userId,
        })
        .select()
        .single();
      if (!novoServ) continue;

      const vs = (verifs ?? []).filter((v) => v.ambiente_servico_id === s.id);
      if (vs.length) {
        await supabase.from('recebimento_verificacoes').insert(
          vs.map((v) => ({
            ambiente_servico_id: novoServ.id,
            ambiente_id: novoAmb.id,
            vistoria_id: destinoId,
            obra_id: obraId,
            biblioteca_verificacao_id: v.biblioteca_verificacao_id,
            descricao_snapshot: v.descricao_snapshot,
            status: 'nao_vistoriado',
            ordem: v.ordem,
          })),
        );
      }
    }
  }
}
