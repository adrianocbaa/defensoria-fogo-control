import { useState, useEffect } from 'react';
import { obrasSimuladas, type Obra } from '@/data/mockObras';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseObrasDataReturn {
  obras: Obra[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useObrasData(): UseObrasDataReturn {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        // Para usuários não autenticados, mostrar apenas obras de exemplo
        await new Promise(resolve => setTimeout(resolve, 800));
        setObras(obrasSimuladas);
        return;
      }
      
      // Para usuários autenticados, buscar obras reais do Supabase
      const { data, error: supabaseError } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        throw new Error('Erro ao carregar obras: ' + supabaseError.message);
      }
      
      // Converter dados do Supabase para o formato esperado
      const obrasFormatadas: Obra[] = (data || []).map(obra => ({
        id: obra.id,
        nome: obra.nome,
        municipio: obra.municipio,
        status: obra.status as any,
        coordenadas: [Number(obra.coordinates_lat), Number(obra.coordinates_lng)] as [number, number],
        tipo: obra.tipo,
        valor: Number(obra.valor_total),
        valorExecutado: Number(obra.valor_executado || 0),
        porcentagemExecucao: obra.porcentagem_execucao || 0,
        dataInicio: obra.data_inicio || '',
        previsaoTermino: obra.previsao_termino || '',
        empresaResponsavel: obra.empresa_responsavel || 'Não informado',
        secretariaResponsavel: obra.secretaria_responsavel || 'Não informado',
        fotos: Array.isArray(obra.fotos) ? obra.fotos as any[] : [],
        documentos: Array.isArray(obra.documentos) ? obra.documentos.filter((doc): doc is { nome: string; tipo: string } => 
          typeof doc === 'object' && doc !== null && 'nome' in doc && 'tipo' in doc) : [],
        // Incluir campos específicos do banco
        n_contrato: obra.n_contrato,
        valor_aditivado: Number(obra.valor_aditivado || 0)
      }));
      
      // Se não há obras reais, mostrar obra de exemplo + mensagem
      if (obrasFormatadas.length === 0) {
        setObras(obrasSimuladas);
      } else {
        setObras(obrasFormatadas);
      }
      
    } catch (err) {
      console.error('Erro ao buscar obras:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      // Em caso de erro, mostrar obras de exemplo
      setObras(obrasSimuladas);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, [user]); // Re-fetch when user authentication status changes

  const refetch = () => {
    fetchObras();
  };

  return {
    obras,
    loading,
    error,
    refetch
  };
}