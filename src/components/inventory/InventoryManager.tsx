import { useState } from 'react';
import { InventoryDashboard } from './InventoryDashboard';
import { MaterialsList } from './MaterialsList';
import { MaterialForm } from './MaterialForm';
import { StockReport } from './StockReport';
import { InventoryNotifications } from './InventoryNotifications';

type InventoryView = 'dashboard' | 'materials' | 'material-form' | 'report' | 'notifications';

interface Material {
  id?: string;
  code: string;
  description: string;
  unit: string;
  minimum_stock: number;
}

export function InventoryManager() {
  const [currentView, setCurrentView] = useState<InventoryView>('dashboard');
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>();

  const handleViewChange = (view: InventoryView) => {
    setCurrentView(view);
    setEditingMaterial(undefined);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setCurrentView('material-form');
  };

  const handleFormSave = () => {
    setEditingMaterial(undefined);
    setCurrentView('materials');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'materials':
        return <MaterialsList />;
      case 'material-form':
        return <MaterialForm />;
      case 'report':
        return <StockReport />;
      case 'notifications':
        return <InventoryNotifications />;
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="w-full">
      {/* Navigation Pills */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'materials', label: 'Materiais' },
              { id: 'material-form', label: 'Novo Material' },
              { id: 'report', label: 'Relatório' },
              { id: 'notifications', label: 'Notificações' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleViewChange(id as InventoryView)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {renderView()}
    </div>
  );
}