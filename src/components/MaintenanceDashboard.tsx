import { KanbanBoard } from '@/components/KanbanBoard';
import { TravelCalendar } from '@/components/TravelCalendar';
import { MaintenanceSettings } from '@/components/MaintenanceSettings';
import { MaintenanceReports } from '@/components/MaintenanceReports';
import { MaintenanceOverview } from '@/components/maintenance/MaintenanceOverview';
import { MaintenanceHistory } from '@/components/maintenance/MaintenanceHistory';
import { PlaceholderModule } from '@/components/maintenance/PlaceholderModule';

interface MaintenanceDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function MaintenanceDashboard({
  activeSection = 'overview',
  onSectionChange,
}: MaintenanceDashboardProps) {
  if (activeSection === 'tickets') {
    return <KanbanBoard />;
  }

  if (activeSection === 'travel') {
    return <TravelCalendar />;
  }

  if (activeSection === 'reports') {
    return <MaintenanceReports />;
  }

  if (activeSection === 'settings') {
    return <MaintenanceSettings />;
  }

  if (activeSection === 'history') {
    return <MaintenanceHistory />;
  }

  if (activeSection === 'preventive') {
    return (
      <PlaceholderModule
        title="Manutenções Preventivas"
        description="Módulo em desenvolvimento. Em breve será possível cadastrar periodicidades, equipamentos e agendas de manutenção preventiva."
      />
    );
  }

  if (activeSection === 'service-orders') {
    return (
      <PlaceholderModule
        title="Ordens de Serviço"
        description="Módulo em desenvolvimento."
      />
    );
  }

  if (activeSection === 'contracts') {
    return (
      <PlaceholderModule
        title="Contratos e Fornecedores"
        description="Módulo em desenvolvimento."
      />
    );
  }

  if (activeSection === 'inventory') {
    return (
      <PlaceholderModule
        title="Inventário e Estoque"
        description="Módulo em desenvolvimento. Será integrado ao Almoxarifado em etapa futura."
      />
    );
  }

  // overview
  return <MaintenanceOverview onNavigate={onSectionChange} />;
}
