import { useEffect, useState } from 'react';
import {
  Wrench, Droplets, Zap, Wind, Shield, PaintRoller,
  Hammer, Cog, Package, AlertCircle, Flame, Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const ICON_MAP: Record<string, LucideIcon> = {
  Wrench, Droplets, Zap, Wind, Shield, PaintRoller,
  Hammer, Cog, Package, AlertCircle, Flame, Lightbulb,
};

export interface MaintenanceType {
  id: string;
  nome: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  icon: LucideIcon;
}

export function useMaintenanceTypes(onlyActive = true) {
  const [types, setTypes] = useState<MaintenanceType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('maintenance_types' as any)
      .select('*')
      .order('ordem', { ascending: true })
      .limit(10000);
    if (onlyActive) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (!error && data) {
      setTypes(
        (data as any[]).map((t) => ({
          ...t,
          icon: ICON_MAP[t.icone] ?? Wrench,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [onlyActive]);

  return { types, loading, refetch: load };
}

export function getIconForType(icone?: string): LucideIcon {
  if (!icone) return Wrench;
  return ICON_MAP[icone] ?? Wrench;
}
