import { useEffect, useState } from 'react';

import type { LatLng, MapMarker } from '@/components/map/types';

// Vehículos en movimiento para que los mapas se vean vivos (como los autitos
// de DiDi): circulan en cuadrícula, como las calles de Mendoza, alrededor de
// un punto. Son solo visuales: no son la posición en tiempo real.
//   · useFlotaAmbiente: camionetas y grúas de ambiente en el inicio.
//   · useFlotaAlrededor: cada fletero del marketplace dando vueltas cerca de
//     su ubicación aproximada.

type Kind = 'flotaFlete' | 'flotaGrua';

type Vehiculo = {
  id: string;
  kind: Kind;
  label?: string;
  lat: number;
  lng: number;
  base: LatLng;
  radio: number;
  rumbo: number;
  metros: number; // por tick
  pausa: number; // ticks detenido ("semáforo")
};

const M_POR_GRADO = 111320;
const TICK_MS = 1000;
const RUMBOS = [0, 90, 180, 270];

function mover(lat: number, lng: number, rumbo: number, m: number) {
  const r = (rumbo * Math.PI) / 180;
  return {
    lat: lat + (Math.cos(r) * m) / M_POR_GRADO,
    lng: lng + (Math.sin(r) * m) / (M_POR_GRADO * Math.cos((lat * Math.PI) / 180)),
  };
}

function nuevo(v: Omit<Vehiculo, 'rumbo' | 'metros' | 'pausa'>, metros: [number, number]): Vehiculo {
  return {
    ...v,
    rumbo: RUMBOS[Math.floor(Math.random() * 4)],
    metros: metros[0] + Math.random() * (metros[1] - metros[0]),
    pausa: Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0,
  };
}

function avanzar(lista: Vehiculo[]): Vehiculo[] {
  return lista.map((v) => {
    if (v.pausa > 0) return { ...v, pausa: v.pausa - 1 };
    let rumbo = v.rumbo;
    const r = Math.random();
    if (r < 0.04) return { ...v, pausa: 2 + Math.floor(Math.random() * 4) };
    if (r < 0.16) rumbo = (rumbo + (Math.random() < 0.5 ? 90 : 270)) % 360;
    // Si se alejó de su zona, dobla hacia ella.
    const dy = (v.base.lat - v.lat) * M_POR_GRADO;
    const dx = (v.base.lng - v.lng) * M_POR_GRADO * Math.cos((v.lat * Math.PI) / 180);
    if (Math.hypot(dx, dy) > v.radio) {
      rumbo = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 0 : 180) : dx > 0 ? 90 : 270;
    }
    return { ...v, rumbo, ...mover(v.lat, v.lng, rumbo, v.metros) };
  });
}

// Corre la simulación mientras `activo`; se reinicia cuando cambia `clave`.
function useSimulacion(clave: string, activo: boolean, crear: () => Vehiculo[]): MapMarker[] {
  const [flota, setFlota] = useState<{ clave: string; lista: Vehiculo[] } | null>(null);

  useEffect(() => {
    if (!activo) return;
    let lista = crear();
    const inicio = setTimeout(() => setFlota({ clave, lista }), 0);
    const id = setInterval(() => {
      lista = avanzar(lista);
      setFlota({ clave, lista });
    }, TICK_MS);
    return () => {
      clearTimeout(inicio);
      clearInterval(id);
    };
    // `crear` se arma en cada render; la simulación depende solo de la clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, activo]);

  if (!activo || flota?.clave !== clave) return [];
  return flota.lista.map((v) => ({
    id: v.id,
    kind: v.kind,
    position: { lat: v.lat, lng: v.lng },
    heading: v.rumbo,
    label: v.label,
  }));
}

const RADIO_INICIO_M = 1400;

export function useFlotaAmbiente(centro: LatLng, activo: boolean): MapMarker[] {
  const clave = `${centro.lat.toFixed(4)},${centro.lng.toFixed(4)}`;
  return useSimulacion(clave, activo, () => {
    const tipos: Kind[] = [...Array(7).fill('flotaFlete'), ...Array(4).fill('flotaGrua')];
    return tipos.map((kind, i) => {
      const dist = 200 + Math.random() * (RADIO_INICIO_M - 200);
      const p = mover(centro.lat, centro.lng, Math.random() * 360, dist);
      return nuevo({ id: `amb-${i}`, kind, ...p, base: centro, radio: RADIO_INICIO_M }, [30, 55]);
    });
  });
}

export function useFlotaAlrededor(
  bases: { id: string; kind: Kind; position: LatLng; label?: string }[],
  activo: boolean,
  radioM = 450
): MapMarker[] {
  const clave = bases.map((b) => `${b.id}:${b.position.lat.toFixed(4)},${b.position.lng.toFixed(4)}`).join('|');
  return useSimulacion(clave, activo && bases.length > 0, () =>
    bases.map((b) =>
      nuevo({ id: b.id, kind: b.kind, label: b.label, ...b.position, base: b.position, radio: radioM }, [12, 22])
    )
  );
}
