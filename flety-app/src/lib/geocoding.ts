import { MENDOZA } from '@/components/map/types';

import type { GeoPoint } from './types';

// Búsqueda de direcciones con Photon (geocodificador gratuito sobre
// OpenStreetMap, pensado para autocompletar). Sin API key. Cuando haya key de
// Google Maps se reemplaza por Places.
const PHOTON = 'https://photon.komoot.io';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    countrycode?: string;
  };
};

function toGeoPoint(feature: PhotonFeature): GeoPoint {
  const p = feature.properties;
  const calle = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}` : undefined;
  const principal = calle ?? p.name ?? 'Ubicación';
  const zona = p.city ?? p.district ?? p.state;
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng, direccion: zona && zona !== principal ? `${principal}, ${zona}` : principal };
}

export async function buscarDirecciones(query: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&lat=${MENDOZA.lat}&lon=${MENDOZA.lng}&limit=8`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = (await res.json()) as { features: PhotonFeature[] };
  const seen = new Set<string>();
  return json.features
    .filter((f) => f.properties.countrycode === 'AR')
    .map(toGeoPoint)
    .filter((point) => {
      // Photon a veces devuelve el mismo lugar varias veces (distintos objetos de OSM).
      if (seen.has(point.direccion)) return false;
      seen.add(point.direccion);
      return true;
    })
    .slice(0, 5);
}

export async function direccionDeCoordenadas(lat: number, lng: number): Promise<GeoPoint> {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}`);
    if (res.ok) {
      const json = (await res.json()) as { features: PhotonFeature[] };
      if (json.features[0]) return { ...toGeoPoint(json.features[0]), lat, lng };
    }
  } catch {
    // Sin conexión con el geocodificador: usamos un texto genérico.
  }
  return { lat, lng, direccion: 'Mi ubicación actual' };
}
