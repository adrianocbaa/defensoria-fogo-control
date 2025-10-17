import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ModoAtividades = 'manual' | 'planilha' | 'template';

export interface RdoConfig {
  obra_id: string;
  modo_atividades: ModoAtividades;
  locked_at: string;
  chosen_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useRdoConfig(obraId: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['rdo-config', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_config')
        .select('*')
        .eq('obra_id', obraId)
        .maybeSingle();

      if (error) throw error;
      return data as RdoConfig | null;
    },
    enabled: !!obraId,
  });

  const createConfigMutation = useMutation({
    mutationFn: async (params: {
      obra_id: string;
      modo_atividades: ModoAtividades;
      chosen_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('rdo_config')
        .insert({
          obra_id: params.obra_id,
          modo_atividades: params.modo_atividades,
          chosen_by: params.chosen_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-config', obraId] });
      toast.success('Modo de preenchimento definido com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar configuração:', error);
      toast.error('Erro ao definir modo de preenchimento');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (params: {
      obra_id: string;
      modo_atividades: ModoAtividades;
    }) => {
      const { data, error } = await supabase
        .from('rdo_config')
        .update({
          modo_atividades: params.modo_atividades,
        })
        .eq('obra_id', params.obra_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-config', obraId] });
      toast.success('Modo de preenchimento atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar modo de preenchimento');
    },
  });

  return {
    config,
    isLoading,
    createConfig: createConfigMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    isCreating: createConfigMutation.isPending,
    isUpdating: updateConfigMutation.isPending,
  };
}
