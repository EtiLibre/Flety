import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '@/components/map/types';
import { supabase } from '@/lib/supabase';

export type VehiculoCerca = { servicio: 'mudanzas' | 'gruas'; lat: number; lng: number };

// Última ubicación conocida, solo si el permiso ya estaba dado (el inicio no
// pide permisos).
export function useUltimaPosicion() {
  const [pos, setPos] = useState<LatLng | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const p = await Location.getLastKnownPositionAsync();
        if (!cancelled && p) setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      } catch {
        // Sin ubicación: se usa el centro de Mendoza.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return pos;
}

// Fletes y grúas disponibles cerca (migración 0026). Posiciones reales
// redondeadas a ~100 m; se actualizan cada 20 s para verlos moverse.
export function useVehiculosCerca(centro: LatLng) {
  const [res, setRes] = useState<{ clave: string; vehiculos: VehiculoCerca[] } | null>(null);
  const clave = `${centro.lat.toFixed(3)},${centro.lng.toFixed(3)}`;
  useEffect(() => {
    let cancelled = false;
    const [lat, lng] = clave.split(',').map(Number);
    async function cargar() {
      const { data, error } = await supabase.rpc('vehiculos_cerca', { p_lat: lat, p_lng: lng });
      if (cancelled) return;
      setRes({ clave, vehiculos: error ? [] : ((data ?? []) as VehiculoCerca[]) });
    }
    cargar();
    const id = setInterval(cargar, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clave]);
  return res?.clave === clave ? res.vehiculos : null;
}
