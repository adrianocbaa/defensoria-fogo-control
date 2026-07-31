import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ObraInicioAlteracao {
  id: string;
  obra_id: string;
  data_anterior: string | null;
  data_nova: string;
  motivo: string;
  documento_url: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  created_at: string;
}

/** Soma dias a uma data YYYY-MM-DD sem sofrer deslocamento de fuso. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

export function useObraInicioHistorico(obraId?: string) {
  return useQuery({
    queryKey: ['obra-inicio-alteracoes', obraId],
    queryFn: async (): Promise<ObraInicioAlteracao[]> => {
      const { data, error } = await supabase
        .from('obra_inicio_alteracoes')
        .select('*')
        .eq('obra_id', obraId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ObraInicioAlteracao[];
    },
    enabled: !!obraId,
  });
}

interface AlterarInicioInput {
  obraId: string;
  dataAnterior: string | null;
  dataNova: string;
  motivo: string;
  documentoUrl?: string | null;
}

export function useAlterarInicioObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ obraId, dataAnterior, dataNova, motivo, documentoUrl }: AlterarInicioInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;

      let userName: string | null = null;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', userId)
          .maybeSingle();
        userName = profile?.display_name ?? null;
      }

      // Recalcula a previsão de término com base no prazo vigente
      const { data: obra, error: obraError } = await supabase
        .from('obras')
        .select('tempo_obra, aditivo_prazo')
        .eq('id', obraId)
        .single();
      if (obraError) throw obraError;

      const prazoTotal = (obra?.tempo_obra ?? 0) + (obra?.aditivo_prazo ?? 0);
      const update: Record<string, unknown> = { data_inicio: dataNova };
      if (prazoTotal > 0) {
        update.previsao_termino = addDaysIso(dataNova, prazoTotal);
      }

      const { error: updateError } = await supabase.from('obras').update(update).eq('id', obraId);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('obra_inicio_alteracoes').insert({
        obra_id: obraId,
        data_anterior: dataAnterior,
        data_nova: dataNova,
        motivo: motivo.trim(),
        documento_url: documentoUrl?.trim() || null,
        changed_by: userId,
        changed_by_name: userName,
      });
      if (logError) throw logError;

      return update;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obra', vars.obraId] });
      queryClient.invalidateQueries({ queryKey: ['obra-inicio-alteracoes', vars.obraId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-restrictions', vars.obraId] });
      toast.success('Data de início atualizada e registrada no histórico');
    },
    onError: (error: unknown) => {
      console.error('Erro ao alterar data de início:', error);
      toast.error('Não foi possível alterar a data de início');
    },
  });
}
