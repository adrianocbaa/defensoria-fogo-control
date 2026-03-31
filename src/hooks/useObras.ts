import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type Obra, type ObraStatus } from '@/data/mockObras';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

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
  const { user } = useAuth();
  const { isContratada, loading: roleLoading } = useUserRole();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = async () => {
    if (roleLoading) return;
    
    try {
      setLoading(true);
      setError(null);

      // For contratada users, first get their allowed obra IDs
      let allowedObraIds: string[] | null = null;
      if (isContratada && user) {
        const { data: accessData } = await supabase
          .from('user_obra_access')
          .select('obra_id')
          .eq('user_id', user.id);
        allowedObraIds = (accessData || []).map(a => a.obra_id);
        if (allowedObraIds.length === 0) {
          setObras([]);
          setLoading(false);
          return;
        }
      }
      
      let query = supabase
        .from('obras')
        .select('*, empresas(razao_social)')
        .order('created_at', { ascending: false });

      // Client-side filter for contratada (RLS also enforces this)
      if (allowedObraIds) {
        query = query.in('id', allowedObraIds);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw new Error('Erro ao carregar obras: ' + supabaseError.message);
      }

      // Buscar todos os profiles para fazer o mapeamento
      const userIds = (data || [])
        .flatMap(obra => [obra.fiscal_id, obra.responsavel_projeto_id])
        .filter(Boolean) as string[];
      
      const uniqueUserIds = [...new Set(userIds)];
      
      let profilesMap: Record<string, string> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', uniqueUserIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.display_name || '';
          return acc;
        }, {} as Record<string, string>);
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
        secretariaResponsavel: (obra.fiscal_id && profilesMap[obra.fiscal_id]) || obra.secretaria_responsavel || 'Não informado',
        responsavelProjeto: (obra.responsavel_projeto_id && profilesMap[obra.responsavel_projeto_id]) || undefined,
        fotos: Array.isArray(obra.fotos) ? obra.fotos as any[] : [],
        documentos: Array.isArray(obra.documentos) ? obra.documentos.filter((doc): doc is { nome: string; tipo: string } => 
          typeof doc === 'object' && doc !== null && 'nome' in doc && 'tipo' in doc) : [],
        // Incluir campos específicos do banco
        n_contrato: obra.n_contrato,
        valor_aditivado: Number(obra.valor_aditivado || 0),
        data_termino_real: obra.data_termino_real || undefined,
        tempo_obra: obra.tempo_obra || undefined,
        aditivo_prazo: obra.aditivo_prazo || undefined
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