import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InventoryContent } from '@/components/InventoryContent';

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const sectionFromQuery = searchParams.get('section') || 'dashboard';
  const [activeSection, setActiveSection] = useState(sectionFromQuery);

  useEffect(() => {
    const section = searchParams.get('section') || 'dashboard';
    setActiveSection(section);
  }, [searchParams]);

  return (
    <InventoryContent activeSection={activeSection} />
  );
}