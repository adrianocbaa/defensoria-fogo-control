import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, rpc, type Pendencia } from '@/lib/avaliacao/api';

export function useAvaliacao(id: string | undefined) {
  const qc = useQueryClient();
  const avaliacao = useQuery({
    queryKey: ['aval', id, 'base'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from('avaliacoes').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });
  const perms = useQuery({
    queryKey: ['aval', id, 'perms'],
    enabled: !!id,
    queryFn: async () => new Set(await rpc<string[]>('aval_my_perms', { p_avaliacao: id })),
  });
  const pendencias = useQuery({
    queryKey: ['aval', id, 'pendencias'],
    enabled: !!id,
    queryFn: async () => (await rpc<Pendencia[] | null>('aval_pendencias', { p_avaliacao: id })) ?? [],
  });
  const ativa = avaliacao.data?.status === 'ATIVA';
  const can = (perm: string) => ativa && !!perms.data?.has(perm);
  const refresh = () => qc.invalidateQueries({ queryKey: ['aval', id] });
  return { avaliacao, perms, pendencias, can, ativa, refresh };
}

export type AvaliacaoCtx = ReturnType<typeof useAvaliacao>;

export function useAvalQuery<T>(id: string | undefined, key: string, fn: () => Promise<T>, enabled = true) {
  return useQuery({ queryKey: ['aval', id, key], enabled: !!id && enabled, queryFn: fn });
}
