import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AbrangenciaGeografica = 'municipal' | 'estadual' | 'nacional';

export interface OrganizationScope {
  abrangencia_geografica: AbrangenciaGeografica | null;
  uf: string | null;
  municipio_ibge: string | null;
  municipio_nome: string | null;
}

/**
 * Retorna o escopo territorial da organização do usuário logado.
 * Usuário anônimo ou organização sem escopo configurado retorna null
 * (o chamador deve aplicar o fallback legado).
 */
export function useOrganizationScope() {
  const { user } = useAuth();
  const [scope, setScope] = useState<OrganizationScope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchScope = async () => {
      if (!user) {
        setScope(null);
        setLoading(false);
        return;
      }
      try {
        const { data: orgId, error: orgErr } = await supabase.rpc('user_organization_id', {
          _user_id: user.id,
        });
        if (orgErr || !orgId) {
          setScope(null);
          return;
        }
        const { data, error } = await (supabase.from('organizations') as any)
          .select('abrangencia_geografica, uf, municipio_ibge, municipio_nome')
          .eq('id', orgId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setScope(null);
        } else {
          setScope({
            abrangencia_geografica: data.abrangencia_geografica ?? null,
            uf: data.uf ?? null,
            municipio_ibge: data.municipio_ibge ?? null,
            municipio_nome: data.municipio_nome ?? null,
          });
        }
      } catch {
        if (!cancelled) setScope(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchScope();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { scope, loading };
}
