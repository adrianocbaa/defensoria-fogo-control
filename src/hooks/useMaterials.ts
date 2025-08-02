import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Material {
  id: string;
  code: string;
  description: string;
  unit: 'KG' | 'M' | 'LITRO' | 'PC' | 'CX';
  current_stock: number;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  material_id: string;
  type: 'ENTRADA' | 'SAIDA' | 'DESCARTE';
  quantity: number;
  date: string;
  description?: string;
  user_id?: string;
  created_at: string;
  materials?: {
    code: string;
    description: string;
    unit: 'KG' | 'M' | 'LITRO' | 'PC' | 'CX';
  };
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
    fetchMovements();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('code');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar materiais',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          materials (
            code,
            description,
            unit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const createMaterial = async (material: Omit<Material, 'id' | 'created_at' | 'updated_at' | 'current_stock'>) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert([material])
        .select()
        .single();

      if (error) throw error;

      setMaterials(prev => [...prev, data]);
      toast({
        title: 'Sucesso',
        description: 'Material criado com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Error creating material:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar material',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setMaterials(prev => prev.map(m => m.id === id ? data : m));
      toast({
        title: 'Sucesso',
        description: 'Material atualizado com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar material',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMaterials(prev => prev.filter(m => m.id !== id));
      toast({
        title: 'Sucesso',
        description: 'Material removido com sucesso',
      });
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover material',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const createMovement = async (movement: Omit<StockMovement, 'id' | 'created_at' | 'materials'>) => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert([movement])
        .select(`
          *,
          materials (
            code,
            description,
            unit
          )
        `)
        .single();

      if (error) throw error;

      setMovements(prev => [data, ...prev]);
      await fetchMaterials(); // Atualiza estoque
      toast({
        title: 'Sucesso',
        description: 'Movimentação registrada com sucesso',
      });
      return data;
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar movimentação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getLowStockMaterials = () => {
    return materials.filter(m => m.current_stock <= m.minimum_stock);
  };

  return {
    materials,
    movements,
    loading,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    createMovement,
    getLowStockMaterials,
    refetch: () => {
      fetchMaterials();
      fetchMovements();
    }
  };
}