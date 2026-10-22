import { useEffect, useState } from 'react';
import { getMunicipalityBoundary } from '@/lib/municipalityBoundary';
import { municipioDaUf } from '@/lib/municipios';
import type { OrganizationScope } from './useOrganizationScope';
import type { UfBoundary } from '@/lib/ufBoundary';

export function useMunicipalityBoundary(scope: OrganizationScope | null) {
  const municipal = scope?.abrangencia_geografica === 'municipal';
  const uf = municipal ? scope.uf : null;
  const code = municipal ? scope.municipio_ibge : null;
  const key = municipal ? `${uf}:${code}` : '';
  const valid = municipal && Boolean(municipioDaUf(uf, code));
  const [result, setResult] = useState<{ key: string; boundary: UfBoundary | null }>({ key: '', boundary: null });
  useEffect(() => {
    let cancelled = false;
    if (!valid) return;
    getMunicipalityBoundary(uf, code).then(boundary => {
      if (!cancelled) setResult({ key, boundary });
    });
    return () => { cancelled = true; };
  }, [valid, uf, code, key]);
  const loading = valid && result.key !== key;
  return {
    boundary: !loading && result.key === key ? result.boundary : null,
    loading,
    warning: municipal && !loading && (!valid || !result.boundary),
  };
}