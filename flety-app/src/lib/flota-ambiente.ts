import { useEffect, useState } from 'react';

import type { LatLng, MapMarker } from '@/components/map/types';
import { metrosEntre, rumbo as rumboEntre } from '@/lib/geo';
import { obtenerRuta } from '@/lib/routing';

// Vehículos en movimiento para que los mapas se vean vivos (como los autitos
// de DiDi). Circulan POR LA CALLE: se pide a OSRM un recorrido cerrado por
// calles reales y cada vehículo avanza sobre él. Son solo visuales: no son la
// posición en tiempo real de nadie.
//   · useFlotaAmbiente: camionetas y/o grúas repartidas en tres anillos
//     (cerca, medio y lejos), así se ven andando también con el mapa alejado.
//   · useFlotaAlrededor: cada fletero o grúa del listado yendo y viniendo por
//     las calles cerca de su ubicación aproximada.
// Si el ruteo falla, se mueven en cuadrícula (respaldo).

type Kind = 'flotaFlete' | 'flotaGrua';

const TICK_MS = 1000;
const M_POR_GRADO = 111320;

function mover(p: LatLng, rumbo: number, m: number): LatLng {
  const r = (rumbo * Math.PI) / 180;
  return {
    lat: p.lat + (Math.cos(r) * m) / M_POR_GRADO,
    lng: p.lng + (Math.sin(r) * m) / (M_POR_GRADO * Math.cos((p.lat * Math.PI) / 180)),
  };
}

const azar = (min: number, max: number) => min + Math.random() * (max - min);

// ── Recorridos por calle ────────────────────────────────────────────────
type Recorrido = { pts: LatLng[]; acum: number[]; total: number };

function armarRecorrido(pts: LatLng[]): Recorrido {
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + metrosEntre(pts[i - 1], pts[i]));
  return { pts, acum, total: acum[acum.length - 1] };
}

// Posición y rumbo a `s` metros del inicio del recorrido.
function puntoEn(r: Recorrido, s: number, sentido: 1 | -1): { pos: LatLng; rumbo: number } {
  let lo = 0;
  let hi = r.acum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (r.acum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = r.pts[lo];
  const b = r.pts[hi];
  const largo = r.acum[hi] - r.acum[lo] || 1;
  const t = Math.min(1, Math.max(0, (s - r.acum[lo]) / largo));
  const pos = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  const rumbo = rumboEntre(a, b);
  return { pos, rumbo: sentido === 1 ? rumbo : (rumbo + 180) % 360 };
}

function sMasCercano(r: Recorrido, p: LatLng) {
  let mejor = 0;
  let dist = Infinity;
  r.pts.forEach((q, i) => {
    const d = metrosEntre(p, q);
    if (d < dist) {
      dist = d;
      mejor = r.acum[i];
    }
  });
  return mejor;
}

// Vuelta cerrada por calles que pasa por puntos al azar alrededor de `centro`,
// entre `rMin` y `rMax` metros (ordenados por ángulo: queda un anillo).
async function anilloPorCalle(centro: LatLng, rMin: number, rMax: number, puntos: number) {
  const angulos = Array.from({ length: puntos }, (_, i) => (360 / puntos) * i + azar(-12, 12));
  const wps = angulos.map((a) => mover(centro, a, azar(rMin, rMax)));
  const ruta = await obtenerRuta([...wps, wps[0]]);
  if (!ruta || ruta.coords.length < 2) return null;
  const r = armarRecorrido(ruta.coords);
  // Si algún punto cayó lejos de las calles (cerros, campo), OSRM da vueltas
  // enormes: ese anillo no se usa.
  const perimetro = 2 * Math.PI * ((rMin + rMax) / 2);
  return r.total > perimetro * 3 ? null : r;
}

// Recorridos guardados por clave (no se vuelven a pedir al volver a la pantalla).
const cacheRecorridos = new Map<string, (Recorrido | null)[]>();

function useRecorridos(
  clave: string,
  activo: boolean,
  armar: () => Promise<(Recorrido | null)[]>
): (Recorrido | null)[] | 'error' | null {
  const [res, setRes] = useState<{ clave: string; r: (Recorrido | null)[] | 'error' } | null>(null);
  useEffect(() => {
    if (!activo) return;
    let cancelled = false;
    const guardado = cacheRecorridos.get(clave);
    if (guardado) {
      const t = setTimeout(() => !cancelled && setRes({ clave, r: guardado }), 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    armar()
      .then((r) => {
        if (r.every((x) => !x)) throw new Error('sin recorridos');
        cacheRecorridos.set(clave, r);
        if (!cancelled) setRes({ clave, r });
      })
      .catch(() => !cancelled && setRes({ clave, r: 'error' }));
    return () => {
      cancelled = true;
    };
    // `armar` se arma en cada render; los recorridos dependen solo de la clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, activo]);
  return activo && res?.clave === clave ? res.r : null;
}

// ── Simulación sobre los recorridos ─────────────────────────────────────
type EnRuta = {
  id: string;
  kind: Kind;
  label?: string;
  ruta: number; // índice del recorrido
  s: number;
  sentido: 1 | -1;
  metros: number;
  pausa: number;
  // Ida y vuelta entre estos metros (fletero/grúa del listado); si no, da la vuelta completa.
  tramo?: [number, number];
};

function avanzarEnRuta(lista: EnRuta[], recorridos: (Recorrido | null)[]): EnRuta[] {
  return lista.map((v) => {
    const r = recorridos[v.ruta];
    if (!r) return v;
    if (v.pausa > 0) return { ...v, pausa: v.pausa - 1 };
    if (Math.random() < 0.025) return { ...v, pausa: 2 + Math.floor(Math.random() * 3) }; // "semáforo"
    let s = v.s + v.sentido * v.metros;
    let sentido = v.sentido;
    if (v.tramo) {
      if (s > v.tramo[1] || s < v.tramo[0]) {
        sentido = -sentido as 1 | -1;
        s = Math.min(v.tramo[1], Math.max(v.tramo[0], s));
      }
    } else {
      s = ((s % r.total) + r.total) % r.total;
    }
    return { ...v, s, sentido };
  });
}

function useSimulacionEnRuta(
  clave: string,
  recorridos: (Recorrido | null)[] | null,
  crear: (r: (Recorrido | null)[]) => EnRuta[]
): MapMarker[] {
  const [flota, setFlota] = useState<{ clave: string; lista: EnRuta[] } | null>(null);
  useEffect(() => {
    if (!recorridos) return;
    let lista = crear(recorridos);
    const inicio = setTimeout(() => setFlota({ clave, lista }), 0);
    const id = setInterval(() => {
      lista = avanzarEnRuta(lista, recorridos);
      setFlota({ clave, lista });
    }, TICK_MS);
    return () => {
      clearTimeout(inicio);
      clearInterval(id);
    };
    // `crear` se arma en cada render; la simulación depende de la clave y los recorridos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, recorridos]);

  if (!recorridos || flota?.clave !== clave) return [];
  return flota.lista.flatMap((v) => {
    const r = recorridos[v.ruta];
    if (!r) return [];
    const { pos, rumbo } = puntoEn(r, v.s, v.sentido);
    return [{ id: v.id, kind: v.kind, position: pos, heading: rumbo, label: v.label }];
  });
}

// ── Respaldo: cuadrícula (si el ruteo no anda) ──────────────────────────
type EnGrilla = {
  id: string;
  kind: Kind;
  label?: string;
  pos: LatLng;
  base: LatLng;
  radio: number;
  rumbo: number;
  metros: number;
};

function avanzarEnGrilla(lista: EnGrilla[]): EnGrilla[] {
  return lista.map((v) => {
    let rumbo = v.rumbo;
    if (Math.random() < 0.12) rumbo = (rumbo + (Math.random() < 0.5 ? 90 : 270)) % 360;
    if (metrosEntre(v.pos, v.base) > v.radio) {
      const dy = v.base.lat - v.pos.lat;
      const dx = v.base.lng - v.pos.lng;
      rumbo = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 0 : 180) : dx > 0 ? 90 : 270;
    }
    return { ...v, rumbo, pos: mover(v.pos, rumbo, v.metros) };
  });
}

function useSimulacionEnGrilla(clave: string, activo: boolean, crear: () => EnGrilla[]): MapMarker[] {
  const [flota, setFlota] = useState<{ clave: string; lista: EnGrilla[] } | null>(null);
  useEffect(() => {
    if (!activo) return;
    let lista = crear();
    const inicio = setTimeout(() => setFlota({ clave, lista }), 0);
    const id = setInterval(() => {
      lista = avanzarEnGrilla(lista);
      setFlota({ clave, lista });
    }, TICK_MS);
    return () => {
      clearTimeout(inicio);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, activo]);
  if (!activo || flota?.clave !== clave) return [];
  return flota.lista.map((v) => ({ id: v.id, kind: v.kind, position: v.pos, heading: v.rumbo, label: v.label }));
}

// ── Inicio / Mudanzas / Grúas: flota de ambiente ────────────────────────
// Tres anillos: cerca (denso, se ve con el mapa cerca), medio y lejos (se ven
// al alejar el mapa). Los de lejos van más rápido para que se note el movimiento.
const ANILLOS = [
  { rMin: 500, rMax: 2600, puntos: 9, metros: [30, 50] },
  { rMin: 3000, rMax: 6500, puntos: 10, metros: [55, 85] },
  { rMin: 7000, rMax: 13000, puntos: 12, metros: [85, 130] },
] as const;

const CANTIDADES = { todos: [10, 8, 8], fletes: [10, 8, 8], gruas: [8, 6, 6] } as const;

// mezcla: el inicio muestra los dos servicios; Mudanzas solo camionetas y Grúas solo grúas.
export function useFlotaAmbiente(
  centro: LatLng,
  activo: boolean,
  mezcla: 'todos' | 'fletes' | 'gruas' = 'todos'
): MapMarker[] {
  // ~100 m: moverse un poco no vuelve a pedir los recorridos.
  const lugar = `${centro.lat.toFixed(3)},${centro.lng.toFixed(3)}`;
  const recorridos = useRecorridos(`anillos:${lugar}`, activo, () =>
    Promise.all(ANILLOS.map((a) => anilloPorCalle(centro, a.rMin, a.rMax, a.puntos).catch(() => null)))
  );
  const kindDe = (i: number): Kind =>
    mezcla === 'gruas' ? 'flotaGrua' : mezcla === 'fletes' ? 'flotaFlete' : i % 3 === 2 ? 'flotaGrua' : 'flotaFlete';

  const enRuta = useSimulacionEnRuta(`${mezcla}:${lugar}`, Array.isArray(recorridos) ? recorridos : null, (rs) =>
    ANILLOS.flatMap((a, ri) => {
      const r = rs[ri];
      if (!r) return [];
      const n = CANTIDADES[mezcla][ri];
      // Repartidos a lo largo de todo el anillo, cada uno en un sentido.
      return Array.from({ length: n }, (_, i) => ({
        id: `amb-${ri}-${i}`,
        kind: kindDe(ri * 10 + i),
        ruta: ri,
        s: ((i + Math.random() * 0.6) / n) * r.total,
        sentido: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        metros: azar(a.metros[0], a.metros[1]),
        pausa: Math.random() < 0.25 ? Math.floor(Math.random() * 3) : 0,
      }));
    })
  );

  const enGrilla = useSimulacionEnGrilla(`grilla:${mezcla}:${lugar}`, activo && recorridos === 'error', () =>
    Array.from({ length: CANTIDADES[mezcla][0] }, (_, i) => ({
      id: `amb-g-${i}`,
      kind: kindDe(i),
      pos: mover(centro, Math.random() * 360, azar(300, 2400)),
      base: centro,
      radio: 2400,
      rumbo: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
      metros: azar(30, 50),
    }))
  );

  if (!activo) return [];
  return recorridos === 'error' ? enGrilla : enRuta;
}

// ── Elegir fletero / grúa: cada uno cerca de su ubicación ───────────────
export function useFlotaAlrededor(
  bases: { id: string; kind: Kind; position: LatLng; label?: string }[],
  activo: boolean,
  radioM = 500
): MapMarker[] {
  const clave = bases.map((b) => `${b.id}:${b.position.lat.toFixed(3)},${b.position.lng.toFixed(3)}`).join('|');
  const hay = activo && bases.length > 0;

  // Un solo recorrido que pasa por todas las ubicaciones (y un punto cerca de cada una).
  const recorridos = useRecorridos(`alrededor:${clave}`, hay, async () => {
    const lat = bases.reduce((t, b) => t + b.position.lat, 0) / bases.length;
    const lng = bases.reduce((t, b) => t + b.position.lng, 0) / bases.length;
    const centro = { lat, lng };
    const wps = bases
      .flatMap((b) => [b.position, mover(b.position, Math.random() * 360, radioM)])
      .sort((a, b) => rumboEntre(centro, a) - rumboEntre(centro, b));
    if (wps.length < 3) wps.push(mover(centro, 90, radioM));
    const ruta = await obtenerRuta([...wps, wps[0]]);
    return [ruta && ruta.coords.length > 1 ? armarRecorrido(ruta.coords) : null];
  });

  const enRuta = useSimulacionEnRuta(clave, Array.isArray(recorridos) ? recorridos : null, (rs) => {
    const r = rs[0];
    if (!r) return [];
    return bases.map((b) => {
      const s0 = sMasCercano(r, b.position);
      return {
        id: b.id,
        kind: b.kind,
        label: b.label,
        ruta: 0,
        s: s0,
        sentido: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
        metros: azar(12, 22),
        pausa: 0,
        tramo: [Math.max(0, s0 - radioM), Math.min(r.total, s0 + radioM)] as [number, number],
      };
    });
  });

  const enGrilla = useSimulacionEnGrilla(`grilla:${clave}`, hay && recorridos === 'error', () =>
    bases.map((b) => ({
      id: b.id,
      kind: b.kind,
      label: b.label,
      pos: b.position,
      base: b.position,
      radio: radioM,
      rumbo: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
      metros: azar(12, 22),
    }))
  );

  if (!hay) return [];
  return recorridos === 'error' ? enGrilla : enRuta;
}
