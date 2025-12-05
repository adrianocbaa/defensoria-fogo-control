import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ObraForm } from '@/components/ObraForm';
import * as LoadingStates from '@/components/LoadingStates';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ObraData {
  id: string;
  nome: string;
  municipio: string;
  n_contrato?: string;
  status: string;
  tipo: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado: number;
  data_inicio: string | null;
  previsao_termino: string | null;
  empresa_responsavel: string | null;
  secretaria_responsavel: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  fotos: any;
  documentos: any;
}

export function AdminObraEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [obra, setObra] = useState<ObraData | null>(null);
  const [loading, setLoading] = useState(true);

  const isNewObra = id === 'nova';

  useEffect(() => {
    if (isNewObra) {
      setLoading(false);
      return;
    }

    const fetchObra = async () => {
      try {
        const { data, error } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setObra(data);
      } catch (error) {
        console.error('Erro ao carregar obra:', error);
        toast.error('Erro ao carregar dados da obra');
        navigate('/admin/obras');
      } finally {
        setLoading(false);
      }
    };

    fetchObra();
  }, [id, isNewObra, navigate]);

  const handleSuccess = () => {
    navigate('/admin/obras');
  };

  const handleCancel = () => {
    navigate('/admin/obras');
  };

  if (loading) {
    return <LoadingStates.FormSkeleton />;
  }

  return (
    <SimpleHeader>
      <PermissionGuard requiresEdit>
        <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/obras')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNewObra ? 'Nova Obra' : 'Editar Obra'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isNewObra 
                ? 'Cadastre uma nova obra pública' 
                : 'Edite as informações da obra'
              }
            </p>
          </div>
        </div>

        <div className="max-w-4xl">
          <ObraForm
            obraId={id}
            initialData={obra ? {
              ...obra,
              status: obra.status as any,
              tipo: (obra.tipo === 'Reforma' || obra.tipo === 'Construção' || obra.tipo === 'Adequações') ? obra.tipo : 'Reforma',
              fotos: Array.isArray(obra.fotos) ? obra.fotos : [],
              documentos: Array.isArray(obra.documentos) ? obra.documentos : [],
            } : undefined}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
        </div>
      </PermissionGuard>
    </SimpleHeader>
  );
}