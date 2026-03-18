import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChecklistOcorrencia {
  id: string;
  servico_id: string;
  obra_id: string;
  descricao?: string | null;
  status: 'pendente' | 'aprovado' | 'reprovado';
  gravidade?: 'critico' | 'medio' | 'estetico' | null;
  observacao?: string | null;
  foto_reprovacao_url?: string | null;
  foto_correcao_url?: string | null;
  location_pin?: { x: number; y: number } | null;
  ordem: number;
  data_avaliacao?: string | null;
  avaliado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export function useChecklistOcorrencias(obraId: string) {
  const { user } = useAuth();
  const [ocorrenciasPorServico, setOcorrenciasPorServico] = useState<
    Record<string, ChecklistOcorrencia[]>
  >({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const fetchOcorrencias = useCallback(async (servicoId: string) => {
    setLoadingIds(prev => new Set(prev).add(servicoId));
    const { data, error } = await supabase
      .from('checklist_ocorrencias' as any)
      .select('*')
      .eq('servico_id', servicoId)
      .order('ordem', { ascending: true });

    setLoadingIds(prev => { const s = new Set(prev); s.delete(servicoId); return s; });
    if (error) { console.error(error); return; }
    setOcorrenciasPorServico(prev => ({
      ...prev,
      [servicoId]: (data ?? []) as ChecklistOcorrencia[],
    }));
  }, []);

  const addOcorrencia = async (servicoId: string, descricao?: string) => {
    if (!user) return;
    const existingCount = ocorrenciasPorServico[servicoId]?.length ?? 0;
    const { data, error } = await supabase
      .from('checklist_ocorrencias' as any)
      .insert({
        servico_id: servicoId,
        obra_id: obraId,
        descricao: descricao ?? null,
        status: 'reprovado',
        gravidade: 'medio',
        ordem: existingCount,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) { toast.error('Erro ao adicionar ocorrência'); return null; }
    await fetchOcorrencias(servicoId);
    return data as ChecklistOcorrencia;
  };

  const updateOcorrencia = async (
    ocorrenciaId: string,
    servicoId: string,
    updates: Partial<Omit<ChecklistOcorrencia, 'id' | 'servico_id' | 'obra_id' | 'created_at' | 'updated_at'>>
  ) => {
    const { error } = await supabase
      .from('checklist_ocorrencias' as any)
      .update({
        ...updates,
        data_avaliacao: new Date().toISOString(),
        avaliado_por: user?.id,
      })
      .eq('id', ocorrenciaId);

    if (error) { toast.error('Erro ao atualizar ocorrência'); return; }
    await fetchOcorrencias(servicoId);
  };

  const deleteOcorrencia = async (ocorrenciaId: string, servicoId: string) => {
    const { error } = await supabase
      .from('checklist_ocorrencias' as any)
      .delete()
      .eq('id', ocorrenciaId);
    if (error) { toast.error('Erro ao excluir ocorrência'); return; }
    await fetchOcorrencias(servicoId);
    toast.success('Ocorrência excluída');
  };

  const uploadFotoOcorrencia = async (
    file: File,
    ocorrenciaId: string,
    tipo: 'reprovacao' | 'correcao'
  ): Promise<string | null> => {
    const path = `${obraId}/ocorrencias/${ocorrenciaId}/${tipo}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('checklist-fotos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { toast.error('Erro ao enviar foto'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('checklist-fotos').getPublicUrl(data.path);
    return publicUrl;
  };

  return {
    ocorrenciasPorServico,
    loadingIds,
    fetchOcorrencias,
    addOcorrencia,
    updateOcorrencia,
    deleteOcorrencia,
    uploadFotoOcorrencia,
  };
}
