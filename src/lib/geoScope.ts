// Centros e limites aproximados das 27 UFs e do Brasil, para enquadramento
// inicial do mapa conforme o escopo territorial da organização.
// Fonte: limites geográficos aproximados (sem dependência de API externa).

export type LatLng = [number, number];
export type LatLngBounds = [LatLng, LatLng]; // [sul-oeste, norte-leste]

export interface UfGeo {
  center: LatLng;
  bounds: LatLngBounds;
}

export const BRASIL_GEO: UfGeo = {
  center: [-14.235, -51.9253],
  bounds: [
    [-33.75, -73.99],
    [5.27, -34.79],
  ],
};

export const UF_GEO: Record<string, UfGeo> = {
  AC: { center: [-9.02, -70.81], bounds: [[-11.15, -73.99], [-7.11, -66.62]] },
  AL: { center: [-9.62, -36.82], bounds: [[-10.50, -38.24], [-8.81, -35.15]] },
  AM: { center: [-3.47, -65.10], bounds: [[-9.82, -73.80], [2.24, -56.10]] },
  AP: { center: [1.41, -51.77], bounds: [[-1.60, -54.88], [4.44, -49.87]] },
  BA: { center: [-13.29, -41.71], bounds: [[-18.35, -46.62], [-8.53, -37.34]] },
  CE: { center: [-5.20, -39.53], bounds: [[-8.87, -41.42], [-2.78, -37.25]] },
  DF: { center: [-15.79, -47.88], bounds: [[-16.05, -48.29], [-15.50, -47.31]] },
  ES: { center: [-19.19, -40.31], bounds: [[-21.30, -41.88], [-17.89, -39.69]] },
  GO: { center: [-15.98, -49.86], bounds: [[-19.50, -53.25], [-12.39, -45.91]] },
  MA: { center: [-5.42, -45.44], bounds: [[-10.36, -48.76], [-1.04, -41.80]] },
  MG: { center: [-18.10, -44.38], bounds: [[-22.91, -51.05], [-14.23, -39.86]] },
  MS: { center: [-20.51, -54.54], bounds: [[-24.06, -58.17], [-17.17, -50.92]] },
  MT: { center: [-12.64, -55.42], bounds: [[-18.04, -61.63], [-7.35, -50.22]] },
  PA: { center: [-3.79, -52.48], bounds: [[-9.98, -58.90], [2.59, -46.06]] },
  PB: { center: [-7.28, -36.72], bounds: [[-8.30, -38.77], [-6.02, -34.79]] },
  PE: { center: [-8.38, -37.86], bounds: [[-10.97, -41.36], [-7.03, -34.81]] },
  PI: { center: [-6.60, -42.28], bounds: [[-10.93, -45.99], [-2.74, -40.37]] },
  PR: { center: [-24.89, -51.55], bounds: [[-26.72, -54.62], [-22.52, -48.02]] },
  RJ: { center: [-22.25, -42.66], bounds: [[-23.37, -44.89], [-20.76, -40.96]] },
  RN: { center: [-5.81, -36.59], bounds: [[-6.98, -38.61], [-4.83, -34.97]] },
  RO: { center: [-10.83, -63.34], bounds: [[-13.69, -66.81], [-7.97, -59.77]] },
  RR: { center: [1.99, -61.33], bounds: [[-1.59, -64.83], [5.27, -58.88]] },
  RS: { center: [-30.17, -53.50], bounds: [[-33.75, -57.64], [-27.08, -49.69]] },
  SC: { center: [-27.45, -50.95], bounds: [[-29.35, -53.84], [-25.95, -48.35]] },
  SE: { center: [-10.57, -37.45], bounds: [[-11.57, -38.25], [-9.52, -36.39]] },
  SP: { center: [-22.19, -48.79], bounds: [[-25.31, -53.11], [-19.78, -44.16]] },
  TO: { center: [-9.41, -48.33], bounds: [[-13.47, -50.74], [-5.17, -45.70]] },
};

export function ufGeo(uf: string | null | undefined): UfGeo | null {
  if (!uf) return null;
  return UF_GEO[uf.toUpperCase().trim()] ?? null;
}
