import { useState } from 'react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { MaterialsList } from '@/components/inventory/MaterialsList';
import { MaterialForm } from '@/components/inventory/MaterialForm';
import { StockMovement } from '@/components/inventory/StockMovement';
import { StockReport } from '@/components/inventory/StockReport';
import { AdvancedReports } from '@/components/inventory/AdvancedReports';
import { InventoryNotifications } from '@/components/inventory/InventoryNotifications';
import { UserManagement } from '@/components/inventory/UserManagement';
import { PageHeader } from '@/components/PageHeader';
import { useUserRole } from '@/hooks/useUserRole';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { role, canEdit, isAdmin } = useUserRole();

  return (
    <SimpleHeader>
      <div className="container mx-auto p-6 space-y-6">
      <PageHeader 
        title="Sistema de Almoxarifado" 
        subtitle="Controle completo de materiais e movimentações"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <PermissionGuard requiresEdit>
            <TabsTrigger value="add-material">Novo Material</TabsTrigger>
          </PermissionGuard>
          <PermissionGuard requiresAdmin>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
          <MaterialsList />
        </TabsContent>

        <TabsContent value="movements" className="mt-6">
          <StockMovement />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <AdvancedReports />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <InventoryNotifications />
        </TabsContent>

        <PermissionGuard requiresEdit>
          <TabsContent value="add-material" className="mt-6">
            <MaterialForm />
          </TabsContent>
        </PermissionGuard>

        <PermissionGuard requiresAdmin>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
        </PermissionGuard>
      </Tabs>
      </div>
    </SimpleHeader>
  );
}