import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavedFilter<T = any> {
  id: string;
  user_id: string;
  scope: string;
  name: string;
  filters: T;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const MAX_NAME_LENGTH = 80;

export function validarNomeFiltro(nome: string, existentes: string[], nomeAtual?: string): string | null {
  const trimmed = nome.trim();
  if (!trimmed) return 'Informe um nome para o filtro.';
  if (trimmed.length > MAX_NAME_LENGTH) return `Nome deve ter até ${MAX_NAME_LENGTH} caracteres.`;
  const duplicado = existentes.some((n) => n.toLowerCase() === trimmed.toLowerCase() && n !== nomeAtual);
  if (duplicado) return 'Já existe um filtro com esse nome.';
  return null;
}

export function useSavedFilters<T = any>(scope: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedFilter<T>[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_saved_filters')
      .select('*')
      .eq('user_id', user.id)
      .eq('scope', scope)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Erro ao carregar filtros salvos:', error);
    } else {
      setItems((data || []) as SavedFilter<T>[]);
    }
    setLoading(false);
  }, [user, scope]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (name: string, filters: T, is_default = false) => {
    if (!user) return null;
    const nomeExistentes = items.map((i) => i.name);
    const erro = validarNomeFiltro(name, nomeExistentes);
    if (erro) { toast.error(erro); return null; }
    try {
      if (is_default) {
        await supabase.from('user_saved_filters')
          .update({ is_default: false })
          .eq('user_id', user.id).eq('scope', scope).eq('is_default', true);
      }
      const { data, error } = await supabase.from('user_saved_filters').insert({
        user_id: user.id,
        scope,
        name: name.trim(),
        filters: filters as any,
        is_default,
      }).select().single();
      if (error) throw error;
      toast.success('Filtro salvo');
      await refresh();
      return data as SavedFilter<T>;
    } catch (e: any) {
      if (e?.code === '23505') toast.error('Nome de filtro já existente.');
      else toast.error('Erro ao salvar filtro');
      return null;
    }
  }, [user, scope, items, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('user_saved_filters').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir filtro');
    else { toast.success('Filtro removido'); await refresh(); }
  }, [user, refresh]);

  const setDefault = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('user_saved_filters')
        .update({ is_default: false })
        .eq('user_id', user.id).eq('scope', scope).eq('is_default', true);
      const { error } = await supabase.from('user_saved_filters')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      toast.error('Erro ao marcar como padrão');
    }
  }, [user, scope, refresh]);

  return { items, loading, create, remove, setDefault, refresh };
}
