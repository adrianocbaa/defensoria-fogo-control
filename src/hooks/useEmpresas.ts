import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  is_active: boolean;
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, cnpj, razao_social, nome_fantasia, email, telefone, is_active')
        .eq('is_active', true)
        .order('razao_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (err: any) {
      console.error('Error loading empresas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { empresas, loading, error, refetch: loadEmpresas };
}
