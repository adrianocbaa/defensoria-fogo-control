import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SidifPublicStats {
  obras_ativas: number;
  medicoes_mes: number;
  nucleos: number;
}

/**
 * Fetches aggregate public stats used on the login screen.
 * Uses a SECURITY DEFINER RPC that returns only counts (no PII).
 */
export function useSidifPublicStats() {
  const [stats, setStats] = useState<SidifPublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_sidif_public_stats' as never);
      if (cancelled) return;
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as any;
        setStats({
          obras_ativas: Number(row.obras_ativas) || 0,
          medicoes_mes: Number(row.medicoes_mes) || 0,
          nucleos: Number(row.nucleos) || 0,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}

/**
 * Animates from 0 to `target` over `duration` ms with ease-out.
 * Restarts whenever `target` changes.
 */
export function useCountUp(target: number | null | undefined, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
