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
        .from('nucleos_central')
        .select('id, nome, cidade')
        .order('nome', { ascending: true })
        .limit(10000);

      if (dbError) throw dbError;

      setNuclei(
        (data || []).map((n: any) => ({
          id: n.id,
          name: n.cidade ? `${n.nome} - ${n.cidade}` : n.nome,
        }))
      );
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
