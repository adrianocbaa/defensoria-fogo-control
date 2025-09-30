/**
 * Hook para gerenciar os setores/módulos disponíveis no sistema
 * 
 * COMO ADICIONAR UM NOVO MÓDULO:
 * 
 * 1. Adicionar o novo valor ao enum 'sector_type' no banco de dados via migration
 * 2. Adicionar o novo setor ao tipo 'Sector' em useUserSectors.ts
 * 3. Adicionar o label do módulo em 'sectorLabels' abaixo
 * 4. Adicionar o ícone do módulo em 'sectorIcons' abaixo (importar de lucide-react se necessário)
 * 
 * O módulo aparecerá automaticamente no Painel Administrativo e no Dashboard principal
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sector } from './useUserSectors';
import { 
  Shield, 
  Wrench, 
  Wind, 
  HardHat, 
  FolderKanban, 
  Package, 
  Laptop,
  Building2
} from 'lucide-react';

export interface SectorInfo {
  id: Sector;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Adicione novos módulos aqui com seus labels
const sectorLabels: Record<string, string> = {
  'preventivos': 'Preventivos',
  'manutencao': 'Manutenção',
  'ar_condicionado': 'Ar Condicionado',
  'obra': 'Obra',
  'projetos': 'Projetos',
  'almoxarifado': 'Almoxarifado',
  'nucleos': 'Teletrabalho',
  'nucleos_central': 'Núcleos - Cadastro',
};

// Adicione os ícones dos novos módulos aqui
const sectorIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'preventivos': Shield,
  'manutencao': Wrench,
  'ar_condicionado': Wind,
  'obra': HardHat,
  'projetos': FolderKanban,
  'almoxarifado': Package,
  'nucleos': Laptop,
  'nucleos_central': Building2,
};

export function useAvailableSectors() {
  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableSectors();
  }, []);

  const fetchAvailableSectors = async () => {
    try {
      // Construir lista de setores baseada nos labels configurados
      // Esta lista é automaticamente atualizada quando novos setores são adicionados ao sectorLabels
      const allSectors = Object.keys(sectorLabels) as Sector[];
      const sectorsInfo: SectorInfo[] = allSectors.map(sector => ({
        id: sector as Sector,
        label: sectorLabels[sector] || sector,
        icon: sectorIcons[sector] || Shield,
      }));
      
      setSectors(sectorsInfo);
    } catch (error) {
      console.error('Error loading sectors:', error);
    } finally {
      setLoading(false);
    }
  };

  return { sectors, loading };
}
