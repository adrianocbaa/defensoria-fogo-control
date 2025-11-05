import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CronogramaItem {
  id?: string;
  item_numero: number;
  descricao: string;
  total_etapa: number;
  periodos: {
    periodo: number;
    valor: number;
    percentual: number;
  }[];
}

export interface CronogramaFinanceiro {
  id?: string;
  obra_id: string;
  nome: string;
  items: CronogramaItem[];
  created_at?: string;
  updated_at?: string;
}

export function useCronogramaFinanceiro() {
  const [loading, setLoading] = useState(false);

  const fetchCronograma = async (obraId: string): Promise<CronogramaFinanceiro | null> => {
    try {
      setLoading(true);

      // Buscar cronograma da obra
      const { data: cronograma, error: cronogramaError } = await supabase
        .from('cronograma_financeiro')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cronogramaError) {
        if (cronogramaError.code === 'PGRST116') {
          // No data found
          return null;
        }
        throw cronogramaError;
      }

      if (!cronograma) return null;

      // Buscar items do cronograma
      const { data: items, error: itemsError } = await supabase
        .from('cronograma_items')
        .select('*')
        .eq('cronograma_id', cronograma.id)
        .order('item_numero', { ascending: true });

      if (itemsError) throw itemsError;

      // Buscar períodos de cada item
      const itemsComPeriodos = await Promise.all(
        (items || []).map(async (item) => {
          const { data: periodos, error: periodosError } = await supabase
            .from('cronograma_periodos')
            .select('*')
            .eq('item_id', item.id)
            .order('periodo', { ascending: true });

          if (periodosError) throw periodosError;

          return {
            id: item.id,
            item_numero: item.item_numero,
            descricao: item.descricao,
            total_etapa: parseFloat(item.total_etapa.toString()),
            periodos: (periodos || []).map((p) => ({
              periodo: p.periodo,
              valor: parseFloat(p.valor.toString()),
              percentual: parseFloat(p.percentual.toString()),
            })),
          };
        })
      );

      return {
        id: cronograma.id,
        obra_id: cronograma.obra_id,
        nome: cronograma.nome,
        items: itemsComPeriodos,
        created_at: cronograma.created_at,
        updated_at: cronograma.updated_at,
      };
    } catch (error) {
      console.error('Erro ao buscar cronograma:', error);
      toast.error('Erro ao carregar cronograma financeiro');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveCronograma = async (cronograma: CronogramaFinanceiro): Promise<boolean> => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já existe cronograma para esta obra
      const { data: existing } = await supabase
        .from('cronograma_financeiro')
        .select('id')
        .eq('obra_id', cronograma.obra_id)
        .single();

      let cronogramaId: string;

      if (existing) {
        // Atualizar cronograma existente
        const { error: updateError } = await supabase
          .from('cronograma_financeiro')
          .update({
            nome: cronograma.nome,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        // Deletar items e períodos antigos
        const { error: deleteItemsError } = await supabase
          .from('cronograma_items')
          .delete()
          .eq('cronograma_id', existing.id);

        if (deleteItemsError) throw deleteItemsError;

        cronogramaId = existing.id;
        toast.info('Cronograma anterior substituído');
      } else {
        // Criar novo cronograma
        const { data: newCronograma, error: insertError } = await supabase
          .from('cronograma_financeiro')
          .insert([{
            obra_id: cronograma.obra_id,
            nome: cronograma.nome,
            user_id: user.id,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        cronogramaId = newCronograma.id;
      }

      // Inserir items
      for (const item of cronograma.items) {
        const { data: newItem, error: itemError } = await supabase
          .from('cronograma_items')
          .insert([{
            cronograma_id: cronogramaId,
            item_numero: item.item_numero,
            descricao: item.descricao,
            total_etapa: item.total_etapa,
          }])
          .select()
          .single();

        if (itemError) throw itemError;

        // Inserir períodos
        if (item.periodos && item.periodos.length > 0) {
          const periodosToInsert = item.periodos.map((p) => ({
            item_id: newItem.id,
            periodo: p.periodo,
            valor: p.valor,
            percentual: p.percentual,
          }));

          const { error: periodosError } = await supabase
            .from('cronograma_periodos')
            .insert(periodosToInsert);

          if (periodosError) throw periodosError;
        }
      }

      toast.success('Cronograma financeiro salvo com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar cronograma:', error);
      toast.error('Erro ao salvar cronograma financeiro');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCronograma = async (cronogramaId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('cronograma_financeiro')
        .delete()
        .eq('id', cronogramaId);

      if (error) throw error;

      toast.success('Cronograma removido com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao deletar cronograma:', error);
      toast.error('Erro ao remover cronograma');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchCronograma,
    saveCronograma,
    deleteCronograma,
  };
}
