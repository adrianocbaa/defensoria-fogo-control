import { BRASIL_GEO, ufGeo, type LatLng, type LatLngBounds } from './geoScope';
import { getUfBoundary, type UfBoundary } from './ufBoundary';

interface Scope {
  abrangencia_geografica: 'municipal' | 'estadual' | 'nacional' | null;
  uf: string | null;
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

export function resolveMapView(scope: Scope | null, obras: CoordinateObra[]): MapView {
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
    // Preserve the existing municipal framing; no state-wide mask is inherited.
    const coordinates = obras.map((obra) => obra.coordenadas).filter(
      (coord): coord is unknown[] => Array.isArray(coord) && Number.isFinite(Number(coord[0])) && Number.isFinite(Number(coord[1]))
    );
    if (coordinates.length) {
      const lats = coordinates.map((coord) => Number(coord[0]));
      const lngs = coordinates.map((coord) => Number(coord[1]));
      const bounds: LatLngBounds = [[Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05], [Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05]];
      return { bounds, navigationBounds: bounds, center: MT_CENTER, zoom: 11, minZoom: 4, boundary: null };
    }
    const geo = ufGeo(scope.uf);
    return { bounds: null, navigationBounds: null, center: geo?.center ?? MT_CENTER, zoom: 10, minZoom: 4, boundary: null };
  }
  // Legacy / no scope: retain the MT framing, now using the shared geometry.
  return { bounds: MT_BOUNDS, navigationBounds: MT_BOUNDS, center: MT_CENTER, zoom: 6, minZoom: 6, boundary: getUfBoundary('MT') };
}