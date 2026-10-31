import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { canal } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

import {
  catalogo,
  gruaAsignada,
  miGruista,
  misSolicitudes,
  ofertasVigentes,
  revisar,
  serviciosDelGruista,
  solicitud,
  type MiGruista,
} from './api';
import { ESTADOS_EN_SERVICIO } from './estados';
import type { Catalogo, GruaAsignada, Oferta, Solicitud } from './tipos';

export function useCatalogoGruas() {
  const [res, setRes] = useState<{ catalogo: Catalogo | null; error: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    catalogo()
      .then((c) => !cancelled && setRes({ catalogo: c, error: null }))
      .catch((e: Error) => !cancelled && setRes({ catalogo: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, []);
  return { catalogo: res?.catalogo ?? null, error: res?.error ?? null, cargando: !res };
}

// Una solicitud en vivo: cambios por tiempo real y, mientras busca, empuja el
// despacho cada pocos segundos (por si el reloj automático no está activo).
// Con grúa asignada, actualiza su posición.
export function useSolicitudGrua(id: string | undefined) {
  const [s, setS] = useState<{ id: string; data: Solicitud | null; noExiste: boolean } | null>(null);
  const [grua, setGrua] = useState<{ id: string; data: GruaAsignada | null } | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    solicitud(id).then((data) => !cancelled && setS({ id, data, noExiste: !data }));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(canal(`grua-sol-${id}`))
      .on('postgres_changes', { event: '*', schema: 'gruas', table: 'solicitudes', filter: `id=eq.${id}` }, () =>
        setVersion((v) => v + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const data = s && s.id === id ? s.data : null;
  const estado = data?.estado;

  // Mientras busca: revisar cada 6 s (vence ofertas y sigue con la próxima grúa).
  useEffect(() => {
    if (!id || estado !== 'buscando') return;
    const t = setInterval(() => {
      revisar(id).then(() => setVersion((v) => v + 1));
    }, 6000);
    return () => clearInterval(t);
  }, [id, estado]);

  // Con grúa asignada: datos y posición cada 5 s.
  useEffect(() => {
    if (!id || !estado || !(ESTADOS_EN_SERVICIO.includes(estado) || estado === 'finalizada')) return;
    let cancelled = false;
    const cargar = () => gruaAsignada(id).then((g) => !cancelled && setGrua({ id, data: g }));
    cargar();
    const t = ESTADOS_EN_SERVICIO.includes(estado) ? setInterval(cargar, 5000) : null;
    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [id, estado]);

  return {
    solicitud: data,
    noExiste: s && s.id === id ? s.noExiste : false,
    cargando: !s || s.id !== id,
    grua: grua && grua.id === id ? grua.data : null,
    recargar,
  };
}

export function useMisSolicitudesGrua() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [res, setRes] = useState<{ id: string; lista: Solicitud[]; error: string | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    misSolicitudes(userId)
      .then((lista) => !cancelled && setRes({ id: userId, lista, error: null }))
      .catch((e: Error) => !cancelled && setRes({ id: userId, lista: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const actual = res?.id === userId ? res : null;
  return { solicitudes: actual?.lista ?? [], error: actual?.error ?? null, cargando: !!userId && !actual };
}

// Cuenta de gruista del usuario (null si no se dio de alta).
export function useMiGruista() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState<{ clave: string; data: MiGruista | null; error: string | null } | null>(null);
  const clave = `${userId}:${version}`;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    miGruista(userId)
      .then((data) => !cancelled && setRes({ clave, data, error: null }))
      .catch((e: Error) => !cancelled && setRes({ clave, data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [userId, clave]);
  const actual = res?.clave === clave ? res : null;
  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  // Al recargar se muestran los datos anteriores hasta que llegan los nuevos.
  const ultimo = actual ?? (res && res.clave.startsWith(`${userId}:`) ? res : null);
  return {
    gruista: ultimo?.data ?? null,
    error: ultimo?.error ?? null,
    cargando: !!userId && !ultimo,
    recargar,
  };
}

// Ofertas que le llegan al gruista (tiempo real + revisión cada 8 s).
export function useOfertasGruista(prestadorId: string | null, activo: boolean) {
  const [ofertas, setOfertas] = useState<{ id: string; lista: Oferta[] } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!prestadorId || !activo) return;
    let cancelled = false;
    ofertasVigentes(prestadorId).then((lista) => !cancelled && setOfertas({ id: prestadorId, lista }));
    return () => {
      cancelled = true;
    };
  }, [prestadorId, activo, version]);

  useEffect(() => {
    if (!prestadorId || !activo) return;
    const ch = supabase
      .channel(canal(`grua-ofertas-${prestadorId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'gruas', table: 'ofertas', filter: `prestador_id=eq.${prestadorId}` },
        () => setVersion((v) => v + 1)
      )
      .subscribe();
    const t = setInterval(() => setVersion((v) => v + 1), 8000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, [prestadorId, activo]);

  return {
    ofertas: activo && ofertas?.id === prestadorId ? ofertas.lista : [],
    recargar: () => setVersion((v) => v + 1),
  };
}

// Servicios del gruista (activo + historial), en vivo.
export function useServiciosGruista(prestadorId: string | null) {
  const [res, setRes] = useState<{ id: string; lista: Solicitud[]; error: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!prestadorId) return;
    let cancelled = false;
    serviciosDelGruista(prestadorId)
      .then((lista) => !cancelled && setRes({ id: prestadorId, lista, error: null }))
      .catch((e: Error) => !cancelled && setRes({ id: prestadorId, lista: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [prestadorId, version]);

  useEffect(() => {
    if (!prestadorId) return;
    const ch = supabase
      .channel(canal(`grua-serv-${prestadorId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'gruas', table: 'solicitudes', filter: `prestador_id=eq.${prestadorId}` },
        () => setVersion((v) => v + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [prestadorId]);

  const actual = res && res.id === prestadorId ? res : null;
  const lista = actual?.lista ?? [];
  return {
    servicios: lista,
    activo: lista.find((s) => ESTADOS_EN_SERVICIO.includes(s.estado)) ?? null,
    error: actual?.error ?? null,
    cargando: !!prestadorId && !actual,
    recargar,
  };
}
