import type { GeoPoint } from './types';

// Factor para pasar de línea recta a recorrido por calles. Es una aproximación
// para el precio *estimado*; la ruta real llega con Google Directions.
const ROAD_FACTOR = 1.3;

export function distanciaEstimadaKm(a: Pick<GeoPoint, 'lat' | 'lng'>, b: Pick<GeoPoint, 'lat' | 'lng'>): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const lineaRecta = 2 * R * Math.asin(Math.sqrt(h));
  return Math.round(lineaRecta * ROAD_FACTOR * 10) / 10;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
