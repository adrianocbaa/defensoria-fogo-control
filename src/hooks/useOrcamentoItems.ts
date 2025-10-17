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
  calculated_level?: number;
  parent_code?: string | null;
  is_macro?: boolean;
  is_under_administracao?: boolean;
}

export function useOrcamentoItems(obraId: string) {
  return useQuery({
    queryKey: ['orcamento-items-hierarquia', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_planilha_hierarquia')
        .select('id, item, codigo, descricao, unidade, quantidade_total, total_contrato, nivel, origem, aditivo_num, calculated_level, parent_code, is_macro, is_under_administracao')
        .eq('obra_id', obraId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      // Mapear quantidade_total para quantidade para manter compatibilidade
      return (data || []).map(d => ({
        ...d,
        quantidade: d.quantidade_total
      })) as OrcamentoItem[];
    },
    enabled: !!obraId,
  });
}
