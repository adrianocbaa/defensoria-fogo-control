import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Orcamento, OrcamentoFormData } from '@/types/orcamento';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export function useOrcamentos() {
  return useQuery({
    queryKey: ['orcamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Orcamento[];
    },
  });
}

export function useOrcamento(id: string | undefined) {
  return useQuery({
    queryKey: ['orcamento', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as unknown as Orcamento;
    },
    enabled: !!id,
  });
}

export function useCreateOrcamento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: OrcamentoFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData: Record<string, unknown> = {
        codigo: formData.codigo || '',
        nome: formData.nome,
        cliente: formData.cliente || null,
        categoria: formData.categoria || null,
        prazo_entrega: formData.prazo_entrega || null,
        is_licitacao: formData.is_licitacao,
        tipo_licitacao: formData.is_licitacao ? formData.tipo_licitacao : null,
        data_abertura_licitacao: formData.is_licitacao && formData.data_abertura_licitacao 
          ? new Date(formData.data_abertura_licitacao).toISOString() 
          : null,
        numero_processo_licitacao: formData.is_licitacao ? formData.numero_processo_licitacao : null,
        arredondamento: formData.arredondamento,
        tipo_encargo: formData.tipo_encargo,
        bdi_incidencia: formData.bdi_incidencia,
        bdi_percentual: formData.bdi_percentual,
        bdi_manual: formData.bdi_manual,
        bases_referencia: formData.bases_referencia as unknown as Json,
        created_by: user?.id,
        status: 'nao_iniciado',
      };
      
      const { data, error } = await supabase
        .from('orcamentos')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating orcamento:', error);
      toast.error('Erro ao criar orçamento');
    },
  });
}

export function useUpdateOrcamento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Orcamento> }) => {
      const { error } = await supabase
        .from('orcamentos')
        .update(data as Record<string, unknown>)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', variables.id] });
      toast.success('Orçamento atualizado!');
    },
    onError: (error) => {
      console.error('Error updating orcamento:', error);
      toast.error('Erro ao atualizar orçamento');
    },
  });
}

export function useDeleteOrcamento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento excluído!');
    },
    onError: (error) => {
      console.error('Error deleting orcamento:', error);
      toast.error('Erro ao excluir orçamento');
    },
  });
}
