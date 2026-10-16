import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/components/map/types';
import { enviarUbicacion } from '@/lib/chofer';
import { metrosEntre } from '@/lib/geo';

type Estado = 'apagado' | 'pidiendo' | 'activo' | 'denegado' | 'error';

// Cada cuánto se manda la ubicación a Supabase (el cliente y la empresa la ven en vivo).
const MIN_MS = 8_000;
const MIN_METROS = 15;
const MAX_MS = 60_000;

// Mientras `activo` sea true, sigue el GPS del chofer y lo publica en
// drivers.ubicacion_actual. Por ahora solo con la app abierta (en primer plano).
export function useCompartirUbicacion(driverId: string | null, activo: boolean) {
  const [estado, setEstado] = useState<Estado>('apagado');
  const [posicion, setPosicion] = useState<LatLng | null>(null);
  const ultimoEnvio = useRef<{ at: number; pos: LatLng } | null>(null);

  useEffect(() => {
    if (!driverId || !activo) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      setEstado('pidiendo');
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setEstado('denegado');
          return;
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 },
          (loc) => {
            const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            setPosicion(pos);
            setEstado('activo');
            const ultimo = ultimoEnvio.current;
            const ahora = Date.now();
            const toca =
              !ultimo ||
              ahora - ultimo.at >= MAX_MS ||
              (ahora - ultimo.at >= MIN_MS && metrosEntre(ultimo.pos, pos) >= MIN_METROS);
            if (toca) {
              ultimoEnvio.current = { at: ahora, pos };
              enviarUbicacion(driverId, pos);
            }
          }
        );
        if (cancelled) sub.remove();
      } catch {
        if (!cancelled) setEstado('error');
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      ultimoEnvio.current = null;
    };
  }, [driverId, activo]);

  return { estado: activo ? estado : 'apagado', posicion: activo ? posicion : null };
}
