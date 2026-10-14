import { useEffect, useState } from 'react';

import type { LatLng } from '@/components/map/types';
import { obtenerRuta, rutaKey, type Ruta } from '@/lib/routing';

// Ruta por calles entre los puntos dados (null mientras carga o si falta algún punto).
export function useRuta(puntos: (LatLng | null | undefined)[]) {
  const validos = puntos.filter((p): p is LatLng => !!p);
  const key = validos.length === puntos.length && validos.length >= 2 ? rutaKey(validos) : null;
  const [resultado, setResultado] = useState<{ key: string; ruta: Ruta | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const puntosKey = key.split(';').map((par) => {
      const [lng, lat] = par.split(',').map(Number);
      return { lat, lng };
    });
    obtenerRuta(puntosKey, controller.signal)
      .then((ruta) => setResultado({ key, ruta }))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setResultado({ key, ruta: null });
      });
    return () => controller.abort();
  }, [key]);

  const actual = resultado && resultado.key === key ? resultado : null;
  return { ruta: actual?.ruta ?? null, cargando: !!key && !actual };
}
