import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { MaterialsList } from '@/components/inventory/MaterialsList';
import { MaterialForm } from '@/components/inventory/MaterialForm';
import { StockMovement } from '@/components/inventory/StockMovement';
import { AdvancedReports } from '@/components/inventory/AdvancedReports';
import { InventoryNotifications } from '@/components/inventory/InventoryNotifications';
import { PermissionGuard } from '@/components/PermissionGuard';

interface InventoryContentProps {
  activeSection: string;
}

export function InventoryContent({ activeSection }: InventoryContentProps) {
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'materials':
        return <MaterialsList />;
      case 'movements':
        return <StockMovement />;
      case 'reports':
        return <AdvancedReports />;
      case 'notifications':
        return <InventoryNotifications />;
      case 'add-material':
        return (
          <PermissionGuard requiresEdit>
            <MaterialForm />
          </PermissionGuard>
        );
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        {renderContent()}
      </div>
    </div>
  );
}