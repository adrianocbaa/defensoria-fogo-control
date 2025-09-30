import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NucleoCentral } from './useNucleosCentral';

export function useNucleosByModule(moduleKey: string) {
  const [nucleos, setNucleos] = useState<NucleoCentral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNucleosByModule = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar IDs de núcleos visíveis no módulo específico
      const { data: visibilityData, error: visibilityError } = await supabase
        .from('nucleo_module_visibility')
        .select('nucleo_id')
        .eq('module_key', moduleKey);

      if (visibilityError) throw visibilityError;

      const nucleoIds = visibilityData?.map(v => v.nucleo_id) || [];

      if (nucleoIds.length === 0) {
        setNucleos([]);
        setLoading(false);
        return;
      }

      // Buscar dados dos núcleos usando os IDs
      const { data, error: fetchError } = await supabase
        .from('vw_nucleos_public')
        .select('*')
        .in('id', nucleoIds)
        .order('nome');

      if (fetchError) throw fetchError;

      setNucleos(data || []);
    } catch (err: any) {
      console.error('Error fetching nucleos by module:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleKey) {
      fetchNucleosByModule();

      // Subscribe to realtime changes
      const nucleosChannel = supabase
        .channel(`nucleos_${moduleKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nucleos_central',
          },
          () => {
            fetchNucleosByModule();
          }
        )
        .subscribe();

      const visibilityChannel = supabase
        .channel(`visibility_${moduleKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nucleo_module_visibility',
          },
          () => {
            fetchNucleosByModule();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(nucleosChannel);
        supabase.removeChannel(visibilityChannel);
      };
    }
  }, [moduleKey]);

  return {
    nucleos,
    loading,
    error,
    refetch: fetchNucleosByModule,
  };
}
