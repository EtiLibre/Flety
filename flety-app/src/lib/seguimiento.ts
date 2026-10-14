import type { LatLng } from '@/components/map/types';

import type { OrderEstado } from './state-machine';

// Estados en los que el chofer está en viaje y se muestra en el mapa en vivo.
export const EN_VIAJE: OrderEstado[] = ['en_camino_origen', 'cargando', 'en_camino_destino'];

export type Tramo = {
  puntos: (LatLng | null)[];
  // Hay chofer en viaje: la ruta sale de su posición actual.
  conChofer: boolean;
  etaLabel: string | null;
};

// Qué recorrido dibujar según el estado del pedido (como en Uber): mientras el
// chofer va al retiro, del chofer al retiro; después de cargar, del chofer a la
// entrega; antes o después del viaje, retiro → entrega.
export function tramoSeguimiento(
  estado: OrderEstado,
  origen: LatLng | null,
  destino: LatLng | null,
  chofer: LatLng | null
): Tramo {
  if (chofer && estado === 'en_camino_origen') {
    return { puntos: [redondear(chofer), origen], conChofer: true, etaLabel: 'Llega al retiro en' };
  }
  if (chofer && (estado === 'cargando' || estado === 'en_camino_destino')) {
    return { puntos: [redondear(chofer), destino], conChofer: true, etaLabel: 'Llega a la entrega en' };
  }
  return { puntos: [origen, destino], conChofer: false, etaLabel: null };
}

// La posición del chofer se redondea a ~100 m para recalcular la ruta solo
// cuando realmente avanzó (y no con cada actualización de GPS).
function redondear(p: LatLng): LatLng {
  return { lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 };
}
