import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntensidadeRow {
  id: string;
  user_id: string;
  cidade: string;
  uf: string;
  intensidade_mm_h: number;
  tempo_retorno_anos: number;
  duracao_min: number;
  fonte: string;
  observacoes: string | null;
  created_at: string;
}

export function useIntensidadesPluviometricas(cidade?: string, uf?: string) {
  const [rows, setRows] = useState<IntensidadeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchByCidade = async () => {
    if (!cidade || !uf) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('dimensionamento_intensidades_pluviometricas')
      .select('*')
      .ilike('cidade', cidade.trim())
      .eq('uf', uf)
      .order('tempo_retorno_anos', { ascending: false })
      .limit(50);
    if (!error && data) setRows(data as IntensidadeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchByCidade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidade, uf]);

  const salvar = async (input: {
    cidade: string;
    uf: string;
    intensidade_mm_h: number;
    tempo_retorno_anos: number;
    duracao_min: number;
    fonte: string;
    observacoes?: string | null;
  }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Usuário não autenticado');
    const payload = { ...input, user_id: auth.user.id };
    const { error } = await supabase
      .from('dimensionamento_intensidades_pluviometricas')
      .upsert(payload, {
        onConflict: 'cidade,uf,tempo_retorno_anos,duracao_min',
      });
    if (error) throw error;
    await fetchByCidade();
  };

  return { rows, loading, salvar, refetch: fetchByCidade };
}
