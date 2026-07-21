import { useState } from 'react';
import { ObrasLayout } from '@/components/obras/ObrasLayout';
import { MaintenanceHeader } from '@/components/maintenance/MaintenanceHeader';
import { MaintenanceDashboard } from '@/components/MaintenanceDashboard';

export default function Maintenance() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <MaintenanceHeader
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onOpenMenu={openMenu}
        />
      )}
    >
      <MaintenanceDashboard
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </ObrasLayout>
  );
}
