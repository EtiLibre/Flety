import type { LatLng } from '@/components/map/types';

// Ruteo por calles con OSRM sobre OpenStreetMap (servidor público de FOSSGIS,
// gratis, sin API key, uso razonable). Antes de escalar conviene pasar a un
// servicio con SLA (Google Directions, Mapbox o un OSRM propio): solo cambia este archivo.
const OSRM = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';

export type Ruta = {
  coords: LatLng[];
  distanciaKm: number;
  duracionMin: number;
};

const cache = new Map<string, Ruta>();

export function rutaKey(puntos: LatLng[], decimales = 5): string {
  return puntos.map((p) => `${p.lng.toFixed(decimales)},${p.lat.toFixed(decimales)}`).join(';');
}

export async function obtenerRuta(puntos: LatLng[], signal?: AbortSignal): Promise<Ruta | null> {
  if (puntos.length < 2) return null;
  const key = rutaKey(puntos);
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(`${OSRM}/${key}?overview=full&geometries=geojson`, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  const route = json.code === 'Ok' ? json.routes?.[0] : undefined;
  if (!route) return null;

  const ruta: Ruta = {
    coords: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanciaKm: Math.round((route.distance / 1000) * 10) / 10,
    duracionMin: Math.max(1, Math.round(route.duration / 60)),
  };
  cache.set(key, ruta);
  return ruta;
}
