import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type PlanoHistorico,
  type PlanoMeta,
  type PlanoRevisao,
} from '@/lib/planoExpansao';

export function usePlanoExpansao() {
  const [revisoes, setRevisoes] = useState<PlanoRevisao[]>([]);
  const [metas, setMetas] = useState<PlanoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [{ data: rev, error: revErr }, { data: mts, error: mtsErr }] = await Promise.all([
        supabase
          .from('plano_expansao_revisoes')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(10000),
        supabase
          .from('plano_expansao_metas')
          .select('*')
          .order('ordem', { ascending: true })
          .order('municipio', { ascending: true })
          .limit(10000),
      ]);
      if (revErr) throw revErr;
      if (mtsErr) throw mtsErr;
      setRevisoes((rev || []) as PlanoRevisao[]);
      setMetas((mts || []) as PlanoMeta[]);
    } catch (err: any) {
      console.error('Erro ao carregar plano de expansão:', err);
      setError(err.message || 'Erro ao carregar o Plano de Expansão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const revisaoVigente = useMemo(
    () => revisoes.find((r) => r.vigente) || revisoes[revisoes.length - 1] || null,
    [revisoes]
  );

  const salvarMeta = useCallback(
    async (meta: Partial<PlanoMeta> & { id?: string }) => {
      const payload = { ...meta } as any;
      delete payload.updated_at;
      const { error: err } = meta.id
        ? await supabase.from('plano_expansao_metas').update(payload).eq('id', meta.id)
        : await supabase.from('plano_expansao_metas').insert(payload);
      if (err) {
        toast.error('Erro ao salvar meta: ' + err.message);
        return false;
      }
      toast.success(meta.id ? 'Meta atualizada' : 'Meta cadastrada');
      await fetchAll();
      return true;
    },
    [fetchAll]
  );

  const excluirMeta = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from('plano_expansao_metas').delete().eq('id', id);
      if (err) {
        toast.error('Erro ao excluir meta: ' + err.message);
        return false;
      }
      toast.success('Meta excluída');
      await fetchAll();
      return true;
    },
    [fetchAll]
  );

  return {
    revisoes,
    revisaoVigente,
    metas,
    metasAtivas: useMemo(() => metas.filter((m) => m.ativo), [metas]),
    loading,
    error,
    refetch: fetchAll,
    salvarMeta,
    excluirMeta,
  };
}

export function useMetaHistorico(metaId?: string | null) {
  const [historico, setHistorico] = useState<PlanoHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!metaId) {
      setHistorico([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('plano_expansao_historico')
      .select('*')
      .eq('meta_id', metaId)
      .order('data', { ascending: false })
      .limit(10000);
    if (error) console.error(error);
    setHistorico((data || []) as PlanoHistorico[]);
    setLoading(false);
  }, [metaId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const adicionar = useCallback(
    async (registro: { data: string; titulo: string; descricao?: string }) => {
      if (!metaId) return false;
      const { error } = await supabase
        .from('plano_expansao_historico')
        .insert({ ...registro, meta_id: metaId });
      if (error) {
        toast.error('Erro ao registrar histórico: ' + error.message);
        return false;
      }
      await fetch();
      return true;
    },
    [metaId, fetch]
  );

  const remover = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('plano_expansao_historico').delete().eq('id', id);
      if (error) {
        toast.error('Erro ao remover registro: ' + error.message);
        return false;
      }
      await fetch();
      return true;
    },
    [fetch]
  );

  return { historico, loading, refetch: fetch, adicionar, remover };
}
