import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { ObraPermissionGuard, ObraPermissionRole } from '@/components/ObraPermissionGuard';
import { ObraForm } from '@/components/ObraForm';
import * as LoadingStates from '@/components/LoadingStates';
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
  fiscal_id: string | null;
  responsavel_projeto_id: string | null;
}

export function AdminObraEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [obra, setObra] = useState<ObraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

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

  const handleSuccess = () => navigate('/admin/obras');
  const handleCancel = () => navigate('/admin/obras');

  const title = isNewObra ? 'Nova Obra' : 'Editar Obra';
  const subtitle = isNewObra ? 'Cadastre uma nova obra pública' : 'Edite as informações da obra';
  const breadcrumb = `Dashboard / Obras / ${title}`;

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <WorksPageHeader
          onOpenMenu={openMenu}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          breadcrumb={breadcrumb}
          title={title}
          subtitle={subtitle}
        />
      )}
    >
      {loading ? (
        <LoadingStates.FormSkeleton />
      ) : (
        <ObraPermissionGuard obraId={isNewObra ? undefined : id} roleCheckOnly={isNewObra}>
          {(permissionRole: ObraPermissionRole) => {
            const canChangeFiscal = permissionRole === 'admin' || permissionRole === 'titular';

            return (
              <div className="mx-auto w-full max-w-[1280px]">
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
                  canChangeFiscal={canChangeFiscal}
                />
              </div>
            );
          }}
        </ObraPermissionGuard>
      )}
    </ObrasLayout>
  );
}
