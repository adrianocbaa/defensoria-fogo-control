import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrcamentoItem } from '@/types/orcamento';
import { toast } from 'sonner';

export function useOrcamentoItens(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ['orcamento-itens', orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      
      const { data, error } = await supabase
        .from('orcamento_itens')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data as unknown as OrcamentoItem[];
    },
    enabled: !!orcamentoId,
  });
}

export function useCreateOrcamentoItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<OrcamentoItem, 'id' | 'created_at' | 'updated_at' | 'children'>) => {
      const { data, error } = await supabase
        .from('orcamento_itens')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-itens', variables.orcamento_id] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', variables.orcamento_id] });
    },
    onError: (error) => {
      console.error('Error creating item:', error);
      toast.error('Erro ao adicionar item');
    },
  });
}

export function useUpdateOrcamentoItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, orcamentoId, data }: { id: string; orcamentoId: string; data: Partial<OrcamentoItem> }) => {
      const { error } = await supabase
        .from('orcamento_itens')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-itens', variables.orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', variables.orcamentoId] });
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    },
  });
}

export function useDeleteOrcamentoItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, orcamentoId }: { id: string; orcamentoId: string }) => {
      const { error } = await supabase
        .from('orcamento_itens')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-itens', variables.orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ['orcamento', variables.orcamentoId] });
      toast.success('Item removido');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    },
  });
}

// Build tree structure from flat list
export function buildItemTree(items: OrcamentoItem[]): OrcamentoItem[] {
  const itemMap = new Map<string, OrcamentoItem>();
  const roots: OrcamentoItem[] = [];
  
  // First pass: create map with children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });
  
  // Second pass: build tree
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}

// Calculate totals for tree
export function calculateItemTotals(item: OrcamentoItem, bdiGlobal: number): number {
  if (item.children && item.children.length > 0) {
    // Sum of children
    return item.children.reduce((sum, child) => sum + calculateItemTotals(child, bdiGlobal), 0);
  }
  
  // Leaf node: quantity * price with BDI
  const bdi = item.bdi_personalizado ?? bdiGlobal;
  const precoComBdi = item.preco_unitario_base * (1 + bdi / 100);
  return item.quantidade * precoComBdi;
}
