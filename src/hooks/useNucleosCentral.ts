import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NucleoCentral {
  id: string;
  nome: string;
  cidade: string;
  endereco: string;
  telefones?: string;
  email?: string;
  lat?: number;
  lng?: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  key: string;
  name: string;
  has_map: boolean;
}

export interface ModuleVisibility {
  id: string;
  nucleo_id: string;
  module_key: string;
}

export function useNucleosCentral() {
  const [nucleos, setNucleos] = useState<NucleoCentral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNucleos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('nucleos_central')
        .select('*')
        .order('nome');

      if (fetchError) throw fetchError;

      setNucleos(data || []);
    } catch (err: any) {
      console.error('Error fetching nucleos:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar núcleos',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addNucleo = async (nucleo: Omit<NucleoCentral, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('nucleos_central')
        .insert([nucleo])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Núcleo criado',
        description: 'O núcleo foi criado com sucesso.',
      });

      await fetchNucleos();
      return data;
    } catch (err: any) {
      console.error('Error adding nucleo:', err);
      toast({
        title: 'Erro ao criar núcleo',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateNucleo = async (id: string, nucleo: Partial<NucleoCentral>) => {
    try {
      const { error: updateError } = await supabase
        .from('nucleos_central')
        .update(nucleo)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: 'Núcleo atualizado',
        description: 'O núcleo foi atualizado com sucesso.',
      });

      await fetchNucleos();
    } catch (err: any) {
      console.error('Error updating nucleo:', err);
      toast({
        title: 'Erro ao atualizar núcleo',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteNucleo = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('nucleos_central')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Núcleo excluído',
        description: 'O núcleo foi excluído com sucesso.',
      });

      await fetchNucleos();
    } catch (err: any) {
      console.error('Error deleting nucleo:', err);
      toast({
        title: 'Erro ao excluir núcleo',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getNucleoById = (id: string) => {
    return nucleos.find((n) => n.id === id);
  };

  useEffect(() => {
    fetchNucleos();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('nucleos_central_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nucleos_central',
        },
        () => {
          fetchNucleos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    nucleos,
    loading,
    error,
    addNucleo,
    updateNucleo,
    deleteNucleo,
    getNucleoById,
    refetch: fetchNucleos,
  };
}

export function useModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('has_map', true)
        .order('name');

      if (error) throw error;
      setModules(data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return { modules, loading };
}

export function useModuleVisibility(nucleoId: string) {
  const [visibility, setVisibility] = useState<ModuleVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('nucleo_module_visibility')
        .select('*')
        .eq('nucleo_id', nucleoId);

      if (error) throw error;
      setVisibility(data || []);
    } catch (err: any) {
      console.error('Error fetching visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (moduleKey: string) => {
    try {
      const existing = visibility.find((v) => v.module_key === moduleKey);

      if (existing) {
        const { error } = await supabase
          .from('nucleo_module_visibility')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;

        toast({
          title: 'Visibilidade atualizada',
          description: 'O núcleo foi removido do módulo.',
        });
      } else {
        const { error } = await supabase
          .from('nucleo_module_visibility')
          .insert([{ nucleo_id: nucleoId, module_key: moduleKey }]);

        if (error) throw error;

        toast({
          title: 'Visibilidade atualizada',
          description: 'O núcleo foi adicionado ao módulo.',
        });
      }

      await fetchVisibility();
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
      toast({
        title: 'Erro ao atualizar visibilidade',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const isVisibleIn = (moduleKey: string) => {
    return visibility.some((v) => v.module_key === moduleKey);
  };

  useEffect(() => {
    if (nucleoId) {
      fetchVisibility();

      // Subscribe to realtime changes
      const channel = supabase
        .channel('visibility_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nucleo_module_visibility',
            filter: `nucleo_id=eq.${nucleoId}`,
          },
          () => {
            fetchVisibility();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [nucleoId]);

  return {
    visibility,
    loading,
    toggleVisibility,
    isVisibleIn,
    refetch: fetchVisibility,
  };
}
