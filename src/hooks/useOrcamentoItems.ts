import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrcamentoItem {
  id: string;
  item: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  total_contrato: number;
  nivel: number;
  origem: string;
  aditivo_num?: number;
}

export function useOrcamentoItems(obraId: string) {
  return useQuery({
    queryKey: ['orcamento-items', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_items')
        .select('id, item, codigo, descricao, unidade, quantidade, total_contrato, nivel, origem, aditivo_num')
        .eq('obra_id', obraId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return (data || []) as OrcamentoItem[];
    },
    enabled: !!obraId,
  });
}
