import { BRASIL_GEO, ufGeo, type LatLng, type LatLngBounds } from './geoScope';
import { getUfBoundary, type UfBoundary } from './ufBoundary';

interface Scope {
  abrangencia_geografica: 'municipal' | 'estadual' | 'nacional' | null;
  uf: string | null;
  municipio_ibge?: string | null;
}
interface CoordinateObra { coordenadas?: unknown }
export interface MapView {
  bounds: LatLngBounds | null;
  navigationBounds: LatLngBounds | null;
  center: LatLng;
  zoom: number;
  minZoom: number;
  boundary: UfBoundary | null;
}
const MT_CENTER: LatLng = [-12.64, -55.42];
const MT_BOUNDS: LatLngBounds = [[-18.4, -62.2], [-6.8, -49.6]];

function withMargin(bounds: LatLngBounds): LatLngBounds {
  const lat = (bounds[1][0] - bounds[0][0]) * 0.05;
  const lng = (bounds[1][1] - bounds[0][1]) * 0.05;
  return [[bounds[0][0] - lat, bounds[0][1] - lng], [bounds[1][0] + lat, bounds[1][1] + lng]];
}

export function resolveMapView(scope: Scope | null, _obras: CoordinateObra[], municipalityBoundary: UfBoundary | null = null): MapView {
  if (scope?.abrangencia_geografica === 'nacional') {
    return { bounds: BRASIL_GEO.bounds, navigationBounds: BRASIL_GEO.bounds, center: BRASIL_GEO.center, zoom: 4, minZoom: 4, boundary: null };
  }
  if (scope?.abrangencia_geografica === 'estadual') {
    const geo = ufGeo(scope.uf);
    const boundary = getUfBoundary(scope.uf);
    const bounds = boundary?.bounds ?? geo?.bounds ?? MT_BOUNDS;
    return { bounds, navigationBounds: withMargin(bounds), center: geo?.center ?? MT_CENTER, zoom: 6, minZoom: 5, boundary };
  }
  if (scope?.abrangencia_geografica === 'municipal') {
    const geo = ufGeo(scope.uf);
    // The registered municipality, never project coordinates, defines the territory.
    // Missing geometry falls back to UF framing without an unintended state mask.
    const bounds = municipalityBoundary?.bounds ?? getUfBoundary(scope.uf)?.bounds ?? geo?.bounds ?? MT_BOUNDS;
    const center: LatLng = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
    return { bounds, navigationBounds: withMargin(bounds), center, zoom: municipalityBoundary ? 10 : 6, minZoom: municipalityBoundary ? 8 : 4, boundary: municipalityBoundary };
  }
  // Legacy / no scope: retain the MT framing, now using the shared geometry.
  return { bounds: MT_BOUNDS, navigationBounds: MT_BOUNDS, center: MT_CENTER, zoom: 6, minZoom: 6, boundary: getUfBoundary('MT') };
}