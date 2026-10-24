import { createContext, useContext, useEffect, useState } from 'react';

import { PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

// Historial del chofer: todos sus viajes, más recientes primero.

// SOLO DEMO: viajes de ejemplo para /preview-chofer.
export const ViajesPreviewContext = createContext<Pedido[] | null>(null);

export function useMisViajes(driverId: string | null) {
  const preview = useContext(ViajesPreviewContext);
  const [res, setRes] = useState<{ id: string; viajes: Pedido[]; error: string | null } | null>(null);

  useEffect(() => {
    if (!driverId || preview) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select(PEDIDO_COLUMNS)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        setRes({
          id: driverId,
          viajes: (data as Pedido[]) ?? [],
          error: error ? 'No pudimos cargar tus viajes.' : null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [driverId, preview]);

  if (preview) return { viajes: preview, loading: false, error: null };
  const actual = res?.id === driverId ? res : null;
  return { viajes: actual?.viajes ?? [], loading: !!driverId && !actual, error: actual?.error ?? null };
}

export const HECHOS = ['entregado', 'confirmado', 'liquidado'];

export type Periodo = 'hoy' | 'semana' | 'mes';

export function desdePeriodo(p: Periodo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // desde el lunes
  if (p === 'mes') d.setDate(1);
  return d;
}

export function resumen(viajes: Pedido[], p: Periodo) {
  const desde = desdePeriodo(p).getTime();
  const hechos = viajes.filter(
    (v) => HECHOS.includes(v.estado) && new Date(v.programado_para ?? v.created_at).getTime() >= desde
  );
  return {
    viajes: hechos.length,
    total: hechos.reduce((t, v) => t + (v.precio_estimado ?? 0), 0),
    km: hechos.reduce((t, v) => t + (v.distancia_km ?? 0), 0),
  };
}
