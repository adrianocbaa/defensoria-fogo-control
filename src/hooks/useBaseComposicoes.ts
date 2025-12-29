import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BaseComposicao, ComposicaoItem } from '@/types/orcamento';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export function useBaseComposicoes(searchTerm?: string) {
  return useQuery({
    queryKey: ['base-composicoes', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('base_composicoes')
        .select('*')
        .order('codigo', { ascending: true });
      
      if (searchTerm) {
        query = query.or(`codigo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        composicao_itens: (Array.isArray(item.composicao_itens) ? item.composicao_itens : []) as unknown as ComposicaoItem[]
      })) as BaseComposicao[];
    },
  });
}

export function useCreateBaseComposicao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<BaseComposicao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData: Record<string, unknown> = {
        codigo: data.codigo,
        descricao: data.descricao,
        unidade: data.unidade,
        preco_unitario: data.preco_unitario,
        fonte: data.fonte,
        tipo: data.tipo,
        estado: data.estado,
        versao: data.versao,
        composicao_itens: data.composicao_itens as unknown as Json,
        eh_mao_de_obra: data.eh_mao_de_obra,
        grupo: data.grupo,
        observacao: data.observacao,
        created_by: user.user?.id,
      };
      
      const { data: result, error } = await supabase
        .from('base_composicoes')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-composicoes'] });
      toast.success('Composição/Insumo criado!');
    },
    onError: (error) => {
      console.error('Error creating base composicao:', error);
      toast.error('Erro ao criar composição/insumo');
    },
  });
}

export function useUpdateBaseComposicao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BaseComposicao> }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.composicao_itens) {
        updateData.composicao_itens = data.composicao_itens as unknown as Json;
      }
      
      const { error } = await supabase
        .from('base_composicoes')
        .update(updateData as never)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-composicoes'] });
      toast.success('Atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating base composicao:', error);
      toast.error('Erro ao atualizar');
    },
  });
}

export function useDeleteBaseComposicao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('base_composicoes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-composicoes'] });
      toast.success('Removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting base composicao:', error);
      toast.error('Erro ao remover');
    },
  });
}
