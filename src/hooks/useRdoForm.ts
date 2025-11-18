import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';

export interface RdoFormData {
  id?: string;
  obra_id: string;
  data: string;
  numero_seq?: number;
  status: 'rascunho' | 'preenchendo' | 'concluido' | 'aprovado' | 'reprovado';
  observacoes?: string;
  clima_manha?: 'claro' | 'nublado' | 'chuvoso';
  clima_tarde?: 'claro' | 'nublado' | 'chuvoso';
  clima_noite?: 'claro' | 'nublado' | 'chuvoso';
  cond_manha?: 'praticavel' | 'impraticavel';
  cond_tarde?: 'praticavel' | 'impraticavel';
  cond_noite?: 'praticavel' | 'impraticavel';
  pluviometria_mm?: number;
  assinatura_fiscal_url?: string;
  assinatura_fiscal_nome?: string;
  assinatura_fiscal_cargo?: string;
  assinatura_fiscal_documento?: string;
  assinatura_fiscal_datetime?: string;
  assinatura_fiscal_validado_em?: string;
  assinatura_contratada_url?: string;
  assinatura_contratada_nome?: string;
  assinatura_contratada_cargo?: string;
  assinatura_contratada_documento?: string;
  assinatura_contratada_datetime?: string;
  assinatura_contratada_validado_em?: string;
  aprovacao_observacao?: string;
  pdf_url?: string;
  hash_verificacao?: string;
  modo_atividades?: 'manual' | 'planilha' | 'template';
  template_id?: string;
  fiscal_concluido_em?: string;
  contratada_concluido_em?: string;
}

export function useRdoForm(obraId: string, data: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<RdoFormData>({
    obra_id: obraId,
    data,
    status: 'rascunho',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const debouncedFormData = useDebounce(formData, 2000);

  // Buscar RDO existente
  const { data: rdoReport, isLoading } = useQuery({
    queryKey: ['rdo-report', obraId, data],
    queryFn: async () => {
      const { data: report, error } = await supabase
        .from('rdo_reports')
        .select('*')
        .eq('obra_id', obraId)
        .eq('data', data)
        .maybeSingle();

      if (error) throw error;
      return report;
    },
  });

  // Resetar formData quando a data mudar
  useEffect(() => {
    setFormData({
      obra_id: obraId,
      data,
      status: 'rascunho',
    });
    setHasChanges(false);
  }, [obraId, data]);

  // Atualizar formData quando carregar o RDO existente
  useEffect(() => {
    if (rdoReport) {
      setFormData(rdoReport as RdoFormData);
      setHasChanges(false);
    }
  }, [rdoReport?.id]);

  // Mutation para salvar/atualizar
  const saveMutation = useMutation({
    mutationFn: async (data: RdoFormData) => {
      // Buscar config da obra para preencher modo_atividades automaticamente
      const { data: config } = await supabase
        .from('rdo_config')
        .select('modo_atividades')
        .eq('obra_id', obraId)
        .maybeSingle();

      const modoAtividades = config?.modo_atividades || data.modo_atividades || 'manual';

      if (data.id) {
        // Update
        const { error } = await supabase
          .from('rdo_reports')
          .update({
            ...data,
            modo_atividades: modoAtividades,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);
        
        if (error) throw error;
        return data.id;
      } else {
        // Insert - buscar próximo numero_seq
        const { data: lastReport } = await supabase
          .from('rdo_reports')
          .select('numero_seq')
          .eq('obra_id', obraId)
          .order('numero_seq', { ascending: false })
          .limit(1)
          .maybeSingle();

        const numero_seq = (lastReport?.numero_seq || 0) + 1;

        const { data: newReport, error } = await supabase
          .from('rdo_reports')
          .insert({
            ...data,
            numero_seq,
            modo_atividades: modoAtividades,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        return newReport.id;
      }
    },
    onSuccess: (reportId) => {
      queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
      queryClient.invalidateQueries({ queryKey: ['rdo-calendar'] });
      setHasChanges(false);
      
      if (!formData.id) {
        setFormData(prev => ({ ...prev, id: reportId }));
      }
    },
    onError: (error) => {
      console.error('Erro ao salvar RDO:', error);
      toast.error('Erro ao salvar RDO');
    },
  });

  // Autosave
  useEffect(() => {
    if (hasChanges && debouncedFormData.id) {
      saveMutation.mutate(debouncedFormData);
    }
  }, [debouncedFormData, hasChanges]);

  const updateField = useCallback((field: keyof RdoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const saveNow = useCallback(async () => {
    await saveMutation.mutateAsync(formData);
    toast.success('RDO salvo com sucesso');
  }, [formData, saveMutation]);

  const validateMinimum = useCallback(() => {
    // Validação mínima: clima manhã + condição manhã
    if (!formData.clima_manha || !formData.cond_manha) {
      toast.error('Preencha pelo menos o clima e condição da manhã');
      return false;
    }
    return true;
  }, [formData]);

  const conclude = useCallback(async () => {
    if (!validateMinimum()) return;
    
    // Obter role do usuário para determinar qual campo atualizar
    const { data: roleData } = await supabase.rpc('get_user_role', { user_uuid: user?.id });
    const userRole = roleData;
    
    const now = new Date().toISOString();
    const updatedFields: Partial<RdoFormData> = {};
    
    // Atualizar campo apropriado baseado no role
    if (userRole === 'contratada') {
      updatedFields.contratada_concluido_em = now;
    } else {
      // Fiscal, admin, editor, etc
      updatedFields.fiscal_concluido_em = now;
    }
    
    // Verificar se AMBOS concluíram para mudar status
    const otherPartyConcluded = userRole === 'contratada' 
      ? formData.fiscal_concluido_em 
      : formData.contratada_concluido_em;
    
    if (otherPartyConcluded) {
      updatedFields.status = 'concluido' as const;
    }
    
    const updatedData = { ...formData, ...updatedFields };
    await saveMutation.mutateAsync(updatedData);
    setFormData(updatedData);
    
    if (otherPartyConcluded) {
      toast.success('RDO concluído por ambas as partes e pronto para aprovação');
    } else {
      toast.success('Conclusão registrada. Aguardando conclusão da outra parte.');
    }
  }, [formData, validateMinimum, saveMutation, user]);

  const sendForApproval = useCallback(async () => {
    if (!formData.id) {
      toast.error('Salve o RDO antes de enviar para aprovação');
      return;
    }

    if (formData.status !== 'concluido' && formData.status !== 'preenchendo') {
      toast.error('RDO precisa estar concluído para enviar para aprovação');
      return;
    }

    const updatedData = { ...formData, status: 'concluido' as const };
    await saveMutation.mutateAsync(updatedData);
    setFormData(updatedData);
    toast.success('RDO enviado para aprovação');
  }, [formData, saveMutation]);

  const approve = useCallback(async (observacao?: string) => {
    if (!formData.id) return;

    // Verificar se ambos concluíram antes de aprovar
    if (!formData.fiscal_concluido_em || !formData.contratada_concluido_em) {
      toast.error('Ambas as partes devem concluir o RDO antes da aprovação');
      return;
    }

    const updatedData = { 
      ...formData, 
      status: 'aprovado' as const,
      aprovacao_observacao: observacao || null,
    };
    await saveMutation.mutateAsync(updatedData);
    setFormData(updatedData);
    toast.success('RDO aprovado com sucesso');
  }, [formData, saveMutation]);

  const reject = useCallback(async (observacao: string) => {
    if (!formData.id) return;
    if (!observacao) {
      toast.error('Informe o motivo da reprovação');
      return;
    }

    const updatedData = { 
      ...formData, 
      status: 'reprovado' as const,
      aprovacao_observacao: observacao,
    };
    await saveMutation.mutateAsync(updatedData);
    setFormData(updatedData);
    toast.success('RDO reprovado');
  }, [formData, saveMutation]);

  const reopen = useCallback(async () => {
    if (!formData.id) return;

    const updatedData = { 
      ...formData, 
      status: 'preenchendo' as const,
      aprovacao_observacao: null,
    };
    await saveMutation.mutateAsync(updatedData);
    setFormData(updatedData);
    toast.success('RDO reaberto para edição');
  }, [formData, saveMutation]);

  const deleteRdo = useCallback(async () => {
    if (!formData.id) return;

    try {
      // Deletar atividades
      await supabase
        .from('rdo_activities')
        .delete()
        .eq('report_id', formData.id);

      // Deletar notas de atividades
      await supabase
        .from('rdo_activity_notes')
        .delete()
        .eq('report_id', formData.id);

      // Deletar audit logs
      await supabase
        .from('rdo_audit_log')
        .delete()
        .eq('report_id', formData.id);

      // Deletar o RDO
      const { error: deleteError } = await supabase
        .from('rdo_reports')
        .delete()
        .eq('id', formData.id);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['rdo-report', obraId, data] });
      queryClient.invalidateQueries({ queryKey: ['rdo-calendar'] });
      toast.success('RDO excluído com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao excluir RDO:', error);
      toast.error('Erro ao excluir RDO');
      return false;
    }
  }, [formData.id, queryClient, obraId, data]);

  return {
    formData,
    updateField,
    saveNow,
    conclude,
    sendForApproval,
    approve,
    reject,
    reopen,
    deleteRdo,
    isLoading,
    isSaving: saveMutation.isPending,
    hasChanges,
  };
}
