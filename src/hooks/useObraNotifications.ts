import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export interface ObraNotification {
  id: string;
  obra_id: string;
  obra_nome: string;
  action_type: string;
  action_description: string;
  user_email: string; // quem fez a alteração
  created_at: string;
  is_read: boolean;
}

// Ações que a contratada recebe (feitas pelo fiscal)
const CONTRATADA_ALLOWED_ACTIONS = ['rdo_reprovado', 'rdo_comentario', 'rdo_excluido'];
const CONTRATADA_ALLOWED_RDO_ACOES = ['REPROVAR'];

// Ações que o fiscal recebe (feitas pela contratada)
const FISCAL_ALLOWED_ACTIONS = ['rdo_assinado', 'rdo_comentario', 'rdo_excluido'];

/**
 * Hook para buscar notificações de alterações nas obras do usuário logado
 * Filtrado por papel: Contratada recebe notificações específicas do Fiscal e vice-versa
 */
export function useObraNotifications() {
  const { user } = useAuth();
  const { isContratada } = useUserRole();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['obra-notifications', user?.id, isContratada],
    queryFn: async (): Promise<ObraNotification[]> => {
      if (!user) return [];

      // Buscar obras onde o usuário é fiscal titular
      const { data: obrasTitular } = await supabase
        .from('obras')
        .select('id, nome')
        .eq('fiscal_id', user.id);

      // Buscar obras onde o usuário é fiscal substituto
      const { data: substitutos } = await supabase
        .from('obra_fiscal_substitutos')
        .select('obra_id')
        .eq('substitute_user_id', user.id);

      const substituteIds = substitutos?.map(s => s.obra_id) || [];
      
      // Buscar obras de substituto
      let obrasSubstituto: { id: string; nome: string }[] = [];
      if (substituteIds.length > 0) {
        const { data } = await supabase
          .from('obras')
          .select('id, nome')
          .in('id', substituteIds);
        obrasSubstituto = data || [];
      }

      // Buscar obras onde o usuário tem acesso (contratadas)
      const { data: acessoObras } = await supabase
        .from('user_obra_access')
        .select('obra_id')
        .eq('user_id', user.id);

      const acessoIds = acessoObras?.map(a => a.obra_id) || [];
      
      let obrasAcesso: { id: string; nome: string }[] = [];
      if (acessoIds.length > 0) {
        const { data } = await supabase
          .from('obras')
          .select('id, nome')
          .in('id', acessoIds);
        obrasAcesso = data || [];
      }

      // Combinar e criar mapa de obras (titular + substituto + acesso contratada)
      const allObras = [...(obrasTitular || []), ...obrasSubstituto, ...obrasAcesso];
      const obraIds = [...new Set(allObras.map(o => o.id))];
      const obraMap = new Map(allObras.map(o => [o.id, o.nome]));

      if (obraIds.length === 0) return [];

      // Buscar notificações lidas pelo usuário (usando any para bypass de tipos)
      const { data: readNotifications } = await (supabase as any)
        .from('user_read_notifications')
        .select('notification_id')
        .eq('user_id', user.id);

      const readSet = new Set((readNotifications || []).map((n: any) => n.notification_id));

      // Buscar logs de ações das últimas 72 horas (não feitas pelo próprio usuário)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 72);

      // Filtrar por tipo de ação baseado no papel do usuário
      const allowedActionTypes = isContratada ? CONTRATADA_ALLOWED_ACTIONS : FISCAL_ALLOWED_ACTIONS;

      const { data: actionLogs } = await supabase
        .from('obra_action_logs')
        .select('id, obra_id, action_type, action_description, user_email, created_at, user_id')
        .in('obra_id', obraIds)
        .in('action_type', allowedActionTypes)
        .gte('created_at', cutoffDate.toISOString())
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const notifications: ObraNotification[] = [];

      // Converter action logs para notificações
      (actionLogs || []).forEach(log => {
        notifications.push({
          id: log.id,
          obra_id: log.obra_id,
          obra_nome: obraMap.get(log.obra_id) || 'Obra',
          action_type: log.action_type,
          action_description: log.action_description,
          user_email: log.user_email || 'Usuário',
          created_at: log.created_at,
          is_read: readSet.has(log.id),
        });
      });

      // Para contratada: também buscar reprovações do rdo_audit_log
      if (isContratada) {
        const { data: rdoLogs } = await supabase
          .from('rdo_audit_log')
          .select('id, obra_id, acao, detalhes, actor_nome, created_at, actor_id')
          .in('obra_id', obraIds)
          .in('acao', CONTRATADA_ALLOWED_RDO_ACOES)
          .gte('created_at', cutoffDate.toISOString())
          .neq('actor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Converter RDO logs para notificações
        (rdoLogs || []).forEach(log => {
          const actionMap: Record<string, string> = {
            'REPROVAR': 'RDO reprovado',
          };
          
          notifications.push({
            id: `rdo-${log.id}`,
            obra_id: log.obra_id,
            obra_nome: obraMap.get(log.obra_id) || 'Obra',
            action_type: `rdo_${log.acao.toLowerCase()}`,
            action_description: actionMap[log.acao] || log.acao,
            user_email: log.actor_nome || 'Usuário',
            created_at: log.created_at,
            is_read: readSet.has(`rdo-${log.id}`),
          });
        });
      }

      // Ordenar por data
      notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return notifications.slice(0, 30);
    },
    enabled: !!user,
    staleTime: 60000, // 1 minuto
    refetchInterval: 120000, // Atualizar a cada 2 minutos
  });

  // Marcar notificação como lida
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      await (supabase as any)
        .from('user_read_notifications')
        .upsert({
          user_id: user.id,
          notification_id: notificationId,
        }, { onConflict: 'user_id,notification_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-notifications', user?.id] });
    },
  });

  // Marcar todas como lidas
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user || !notifications) throw new Error('User not authenticated');
      
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const inserts = unreadIds.map(id => ({
        user_id: user.id,
        notification_id: id,
      }));

      await (supabase as any)
        .from('user_read_notifications')
        .upsert(inserts, { onConflict: 'user_id,notification_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-notifications', user?.id] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
