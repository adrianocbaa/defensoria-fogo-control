import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export type ActionType = 
  | 'medicao_salva'
  | 'medicao_reaberta'
  | 'medicao_bloqueada'
  | 'medicao_excluida'
  | 'aditivo_criado'
  | 'aditivo_bloqueado'
  | 'aditivo_reaberto'
  | 'cronograma_atualizado'
  | 'cronograma_importado'
  | 'planilha_importada'
  | 'planilha_exportada'
  | 'relatorio_exportado'
  | 'rdo_criado'
  | 'rdo_aprovado'
  | 'rdo_excluido'
  | 'itens_alterados';

interface LogActionParams {
  obraId: string;
  actionType: ActionType;
  description: string;
  metadata?: Record<string, unknown>;
}

export function useObraActionLogs() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name);
      }
    };
    fetchDisplayName();
  }, [user]);

  const logAction = async ({ obraId, actionType, description, metadata = {} }: LogActionParams) => {
    if (!user) {
      console.warn('Cannot log action: user not authenticated');
      return;
    }

    try {
      // Use direct insert with explicit typing to bypass generated types
      const { error } = await (supabase as any)
        .from('obra_action_logs')
        .insert({
          obra_id: obraId,
          user_id: user.id,
          user_email: displayName || user.email || 'Usuário',
          action_type: actionType,
          action_description: description,
          metadata
        });

      if (error) {
        console.error('Error logging action:', error);
      }
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  };

  // Helper functions for common actions
  const logMedicaoSalva = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'medicao_salva',
      description: `Medição #${sequencia} salva`,
      metadata: { sequencia }
    });
  };

  const logMedicaoReaberta = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'medicao_reaberta',
      description: `Medição #${sequencia} reaberta para edição`,
      metadata: { sequencia }
    });
  };

  const logMedicaoBloqueada = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'medicao_bloqueada',
      description: `Medição #${sequencia} bloqueada`,
      metadata: { sequencia }
    });
  };

  const logMedicaoExcluida = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'medicao_excluida',
      description: `Medição #${sequencia} excluída`,
      metadata: { sequencia }
    });
  };

  const logAditivoCriado = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'aditivo_criado',
      description: `Aditivo #${sequencia} criado`,
      metadata: { sequencia }
    });
  };

  const logAditivoBloqueado = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'aditivo_bloqueado',
      description: `Aditivo #${sequencia} bloqueado`,
      metadata: { sequencia }
    });
  };

  const logAditivoReaberto = (obraId: string, sequencia: number) => {
    return logAction({
      obraId,
      actionType: 'aditivo_reaberto',
      description: `Aditivo #${sequencia} reaberto para edição`,
      metadata: { sequencia }
    });
  };

  const logCronogramaAtualizado = (obraId: string) => {
    return logAction({
      obraId,
      actionType: 'cronograma_atualizado',
      description: 'Cronograma financeiro atualizado'
    });
  };

  const logCronogramaImportado = (obraId: string, totalPeriodos: number) => {
    return logAction({
      obraId,
      actionType: 'cronograma_importado',
      description: `Cronograma importado com ${totalPeriodos} períodos`,
      metadata: { totalPeriodos }
    });
  };

  const logPlanilhaImportada = (obraId: string, totalItens: number) => {
    return logAction({
      obraId,
      actionType: 'planilha_importada',
      description: `Planilha importada com ${totalItens} itens`,
      metadata: { totalItens }
    });
  };

  const logPlanilhaExportada = (obraId: string, formato: string) => {
    return logAction({
      obraId,
      actionType: 'planilha_exportada',
      description: `Planilha exportada em formato ${formato.toUpperCase()}`,
      metadata: { formato }
    });
  };

  const logRelatorioExportado = (obraId: string, tipo: string, formato: string) => {
    return logAction({
      obraId,
      actionType: 'relatorio_exportado',
      description: `Relatório de ${tipo} exportado em ${formato.toUpperCase()}`,
      metadata: { tipo, formato }
    });
  };

  const logRdoCriado = (obraId: string, data: string) => {
    return logAction({
      obraId,
      actionType: 'rdo_criado',
      description: `RDO criado para ${data}`,
      metadata: { data }
    });
  };

  const logRdoAprovado = (obraId: string, data: string) => {
    return logAction({
      obraId,
      actionType: 'rdo_aprovado',
      description: `RDO de ${data} aprovado`,
      metadata: { data }
    });
  };

  const logRdoExcluido = (obraId: string, data: string) => {
    return logAction({
      obraId,
      actionType: 'rdo_excluido',
      description: `RDO de ${data} excluído`,
      metadata: { data }
    });
  };

  const logItensAlterados = (obraId: string, contexto: string, quantidade: number) => {
    return logAction({
      obraId,
      actionType: 'itens_alterados',
      description: `${quantidade} item(ns) alterado(s) em ${contexto}`,
      metadata: { contexto, quantidade }
    });
  };

  return {
    logAction,
    logMedicaoSalva,
    logMedicaoReaberta,
    logMedicaoBloqueada,
    logMedicaoExcluida,
    logAditivoCriado,
    logAditivoBloqueado,
    logAditivoReaberto,
    logCronogramaAtualizado,
    logCronogramaImportado,
    logPlanilhaImportada,
    logPlanilhaExportada,
    logRelatorioExportado,
    logRdoCriado,
    logRdoAprovado,
    logRdoExcluido,
    logItensAlterados
  };
}
