import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateItem {
  key: string;
  descricao: string;
  un: string;
  qtd_base: number;
}

export interface RdoTemplate {
  id: string;
  titulo: string;
  descricao?: string;
  tipo_obra?: string;
  itens: TemplateItem[];
  created_at: string;
}

export function useRdoTemplates() {
  return useQuery({
    queryKey: ['rdo-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_templates_atividades')
        .select('*')
        .order('titulo', { ascending: true});
      
      if (error) throw error;
      
      // Parse itens JSON
      return (data || []).map(template => ({
        ...template,
        itens: (template.itens as any) || [],
      })) as RdoTemplate[];
    },
  });
}
