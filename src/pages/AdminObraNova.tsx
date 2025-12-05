import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ObraForm } from '@/components/ObraForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function AdminObraNova() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/admin/obras');
  };

  const handleCancel = () => {
    navigate('/admin/obras');
  };

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
              <h1 className="text-3xl font-bold">Nova Obra</h1>
              <p className="text-muted-foreground mt-2">
                Cadastre uma nova obra pública
              </p>
            </div>
          </div>

          <div className="max-w-4xl">
            <ObraForm
              obraId="nova"
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </PermissionGuard>
    </SimpleHeader>
  );
}