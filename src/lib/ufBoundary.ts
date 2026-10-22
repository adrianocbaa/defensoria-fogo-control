import datasetText from '@/data/brUfBoundaries.geojson?raw';
import type { LatLng, LatLngBounds } from './geoScope';

// Local IBGE Malhas v3, simplified by IBGE at intermediate quality.
// Provenance and download date are recorded in the GeoJSON's `source` member.
// No geographical API is contacted at runtime.
export type UfGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface UfBoundary {
  polygons: LatLng[][][];
  rings: LatLng[][];
  mask: LatLng[][];
  bounds: LatLngBounds;
}

// Web Mercator's supported latitude range, rather than the poles.
const WORLD_RING: LatLng[] = [
  [-85.05112878, -180], [-85.05112878, 180],
  [85.05112878, 180], [85.05112878, -180], [-85.05112878, -180],
];

export function boundaryFromGeometry(geometry: UfGeometry): UfBoundary | null {
  const coordinates = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const polygons: LatLng[][][] = [];
  for (const polygon of coordinates) {
    const converted: LatLng[][] = [];
    for (const ring of polygon) {
      if (ring.length < 4) return null;
      const result: LatLng[] = [];
      for (const point of ring) {
        const [lng, lat] = point;
        if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        result.push([lat, lng]);
      }
      const first = result[0];
      const last = result[result.length - 1];
      if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) return null;
      converted.push(result);
    }
    if (!converted.length) return null;
    polygons.push(converted);
  }
  const rings = polygons.flat();
  if (!rings.length) return null;
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  for (const ring of rings) for (const [lat, lng] of ring) {
    south = Math.min(south, lat); north = Math.max(north, lat);
    west = Math.min(west, lng); east = Math.max(east, lng);
  }
  // A SINGLE evenodd path: world + every exterior AND interior ring.
  // Exteriors become transparent; holes inside the UF become shaded again.
  // Drawing separate world masks per island would incorrectly shade other islands.
  return { polygons, rings, mask: [WORLD_RING, ...rings], bounds: [[south, west], [north, east]] };
}

let geometries: Map<string, UfGeometry> | undefined;
const cache = new Map<string, UfBoundary | null>();

export function getUfBoundary(uf: string | null | undefined): UfBoundary | null {
  const key = uf?.trim().toUpperCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    if (!geometries) {
      const dataset = JSON.parse(datasetText) as {
        features: { properties: { uf: string }; geometry: UfGeometry }[];
      };
      geometries = new Map(dataset.features.map((feature) => [feature.properties.uf, feature.geometry]));
    }
    const geometry = geometries.get(key);
    const boundary = geometry ? boundaryFromGeometry(geometry) : null;
    cache.set(key, boundary);
    return boundary;
  } catch {
    // A missing/bad dataset must not prevent the base map from rendering.
    cache.set(key, null);
    return null;
  }
}