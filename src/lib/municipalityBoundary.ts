import { municipioDaUf } from './municipios';
import { boundaryFromGeometry, type UfBoundary, type UfGeometry } from './ufBoundary';

// Only same-origin static project files, never an IBGE request at runtime.
const stateLoads = new Map<string, Promise<Map<string, UfGeometry>>>();
const converted = new Map<string, UfBoundary | null>();
export async function getMunicipalityBoundary(uf: string | null | undefined, code: string | null | undefined): Promise<UfBoundary | null> {
  const state = uf?.trim().toUpperCase() ?? '';
  const municipality = municipioDaUf(state, code);
  if (!municipality) return null;
  if (converted.has(municipality.ibge)) return converted.get(municipality.ibge) ?? null;
  try {
    let loading = stateLoads.get(state);
    if (!loading) {
      loading = fetch(`${import.meta.env.BASE_URL}geo/municipios/${state}.geojson`).then(async response => {
        if (!response.ok) throw new Error('municipal_dataset_unavailable');
        const data = await response.json() as { features: { properties: { ibge: string }; geometry: UfGeometry }[] };
        return new Map(data.features.map(feature => [feature.properties.ibge, feature.geometry]));
      });
      stateLoads.set(state, loading);
    }
    const geometry = (await loading).get(municipality.ibge);
    const boundary = geometry ? boundaryFromGeometry(geometry) : null;
    converted.set(municipality.ibge, boundary);
    return boundary;
  } catch {
    // Sanitized fallback; no transport details or organization data in logs.
    stateLoads.delete(state);
    return null;
  }
}