import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Medicao {
  id?: string;
  obra_id: string;
  servico_codigo: string;
  servico_descricao: string;
  unidade: string;
  quantidade_projeto: number;
  preco_unitario: number;
  valor_total: number;
  quantidade_executada: number;
  valor_executado: number;
  mes_execucao: number;
  ano_execucao: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Aditivo {
  id?: string;
  obra_id: string;
  servico_codigo: string;
  servico_descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  tipo: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const useMedicoes = () => {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedicoes = async (obraId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medicoes')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedicoes(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar medições:', error);
      toast.error('Erro ao carregar medições');
    } finally {
      setLoading(false);
    }
  };

  const fetchAditivos = async (obraId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aditivos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAditivos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar aditivos:', error);
      toast.error('Erro ao carregar aditivos');
    } finally {
      setLoading(false);
    }
  };

  const saveMedicao = async (medicao: Omit<Medicao, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('medicoes')
        .insert([medicao])
        .select()
        .single();

      if (error) throw error;
      
      setMedicoes(prev => [...prev, data]);
      toast.success('Medição salva com sucesso');
      return data;
    } catch (error: any) {
      console.error('Erro ao salvar medição:', error);
      toast.error('Erro ao salvar medição');
      throw error;
    }
  };

  const updateMedicao = async (id: string, updates: Partial<Medicao>) => {
    try {
      const { data, error } = await supabase
        .from('medicoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setMedicoes(prev => prev.map(m => m.id === id ? data : m));
      toast.success('Medição atualizada com sucesso');
      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar medição:', error);
      toast.error('Erro ao atualizar medição');
      throw error;
    }
  };

  const deleteMedicao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('medicoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMedicoes(prev => prev.filter(m => m.id !== id));
      toast.success('Medição excluída com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir medição:', error);
      toast.error('Erro ao excluir medição');
      throw error;
    }
  };

  const saveAditivo = async (aditivo: Omit<Aditivo, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('aditivos')
        .insert([aditivo])
        .select()
        .single();

      if (error) throw error;
      
      setAditivos(prev => [...prev, data]);
      toast.success('Aditivo salvo com sucesso');
      return data;
    } catch (error: any) {
      console.error('Erro ao salvar aditivo:', error);
      toast.error('Erro ao salvar aditivo');
      throw error;
    }
  };

  const updateAditivo = async (id: string, updates: Partial<Aditivo>) => {
    try {
      const { data, error } = await supabase
        .from('aditivos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setAditivos(prev => prev.map(a => a.id === id ? data : a));
      toast.success('Aditivo atualizado com sucesso');
      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar aditivo:', error);
      toast.error('Erro ao atualizar aditivo');
      throw error;
    }
  };

  const deleteAditivo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('aditivos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAditivos(prev => prev.filter(a => a.id !== id));
      toast.success('Aditivo excluído com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir aditivo:', error);
      toast.error('Erro ao excluir aditivo');
      throw error;
    }
  };

  return {
    medicoes,
    aditivos,
    loading,
    fetchMedicoes,
    fetchAditivos,
    saveMedicao,
    updateMedicao,
    deleteMedicao,
    saveAditivo,
    updateAditivo,
    deleteAditivo,
  };
};