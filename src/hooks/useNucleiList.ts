import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NucleoItem {
  id: string;
  name: string;
}

export function useNucleiList() {
  const [nuclei, setNuclei] = useState<NucleoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNuclei = async () => {
    try {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('nuclei')
        .select('id, name')
        .order('name', { ascending: true });

      if (dbError) throw dbError;

      setNuclei(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar núcleos');
      console.error('Error fetching nuclei list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNuclei();
  }, []);

  return { nuclei, loading, error, refetch: fetchNuclei };
}
