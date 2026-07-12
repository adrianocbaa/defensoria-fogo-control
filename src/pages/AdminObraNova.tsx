import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { WorksPageHeader } from '@/components/obras/WorksPageHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ObraForm } from '@/components/ObraForm';

export function AdminObraNova() {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');

  const handleSuccess = () => navigate('/admin/obras');
  const handleCancel = () => navigate('/admin/obras');

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <WorksPageHeader
          onOpenMenu={openMenu}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          breadcrumb="Dashboard / Obras / Nova Obra"
          title="Nova Obra"
          subtitle="Cadastre uma nova obra pública"
        />
      )}
    >
      <PermissionGuard requiresEdit>
        <div className="mx-auto w-full max-w-[1280px]">
          <ObraForm
            obraId="nova"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </PermissionGuard>
    </ObrasLayout>
  );
}
