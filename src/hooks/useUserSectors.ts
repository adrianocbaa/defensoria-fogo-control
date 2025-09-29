import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Sector = 'manutencao' | 'obra' | 'preventivos' | 'ar_condicionado' | 'projetos' | 'almoxarifado';

export function useUserSectors() {
  const { user } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserSectors = async () => {
    if (!user) {
      setSectors([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sectors')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user sectors:', error);
        setSectors(['preventivos']); // Default fallback
      } else {
        setSectors(data?.sectors || ['preventivos']);
      }
    } catch (error) {
      console.error('Error:', error);
      setSectors(['preventivos']);
    } finally {
      setLoading(false);
    }
  };

  const updateUserSectors = async (newSectors: Sector[]) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sectors: newSectors })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user sectors:', error);
        return { error: error.message };
      }

      setSectors(newSectors);
      return { error: null };
    } catch (error) {
      console.error('Error:', error);
      return { error: 'Failed to update sectors' };
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserSectors();
    } else {
      setSectors([]);
      setLoading(false);
    }
  }, [user?.id]);

  const hasSector = (sector: Sector) => sectors.includes(sector);

  return {
    sectors,
    loading,
    hasSector,
    updateUserSectors,
    refreshSectors: fetchUserSectors
  };
}