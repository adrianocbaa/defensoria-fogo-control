import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type Obra, type ObraStatus } from '@/data/mockObras';
import { toast } from 'sonner';

interface UseObrasReturn {
  obras: Obra[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const normalizeStatus = (s: string): ObraStatus => {
  const val = (s || '').toLowerCase();
  if (val === 'planejamento' || val === 'planejada') return 'planejada';
  if (val === 'em_andamento' || val === 'andamento') return 'em_andamento';
  if (val === 'concluida' || val === 'concluído' || val === 'concluido') return 'concluida';
  if (val === 'paralisada' || val === 'paralizada') return 'paralisada';
  // Fallback seguro
  return 'em_andamento';
};

export function useObras(): UseObrasReturn {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('obras')
        .select('*, empresas(razao_social), fiscal_profile:profiles!fiscal_id(display_name), responsavel_projeto_profile:profiles!responsavel_projeto_id(display_name)')
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        throw new Error('Erro ao carregar obras: ' + supabaseError.message);
      }
      
      // Converter dados do Supabase para o formato esperado
      const obrasFormatadas: Obra[] = (data || []).map(obra => ({
        id: obra.id,
        nome: obra.nome,
        municipio: obra.municipio,
        status: normalizeStatus(obra.status as string),
        coordenadas: [Number(obra.coordinates_lat), Number(obra.coordinates_lng)] as [number, number],
        tipo: obra.tipo,
        valor: Number(obra.valor_total),
        valorExecutado: Number(obra.valor_executado || 0),
        porcentagemExecucao: obra.porcentagem_execucao || 0,
        dataInicio: obra.data_inicio || '',
        previsaoTermino: obra.previsao_termino || '',
        empresaResponsavel: (obra.empresas as any)?.razao_social || obra.empresa_responsavel || 'Não informado',
        secretariaResponsavel: (obra.fiscal_profile as any)?.display_name || obra.secretaria_responsavel || 'Não informado',
        responsavelProjeto: (obra.responsavel_projeto_profile as any)?.display_name || undefined,
        fotos: Array.isArray(obra.fotos) ? obra.fotos as any[] : [],
        documentos: Array.isArray(obra.documentos) ? obra.documentos.filter((doc): doc is { nome: string; tipo: string } => 
          typeof doc === 'object' && doc !== null && 'nome' in doc && 'tipo' in doc) : [],
        // Incluir campos específicos do banco
        n_contrato: obra.n_contrato,
        valor_aditivado: Number(obra.valor_aditivado || 0)
      }));
      
      setObras(obrasFormatadas);
      
    } catch (err) {
      console.error('Erro ao buscar obras:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar obras';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, []);

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