import { createContext, useContext, useEffect, useState } from 'react';

import type { LatLng } from '@/components/map/types';
import { fotosDelPedido, PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

// SOLO DESARROLLO: pedido de ejemplo para las vistas previas (sin Supabase).
export const PedidoPreviewContext = createContext<{ pedido: Pedido; chofer: LatLng | null; fotos: string[] } | null>(
  null
);

// Un pedido con sus fotos y la ubicación del chofer, actualizados en vivo
// (Supabase Realtime sobre orders y drivers). Lo usan el seguimiento del
// cliente y el detalle del panel de empresas.
export function usePedidoEnVivo(id: string | undefined) {
  const preview = useContext(PedidoPreviewContext);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [chofer, setChofer] = useState<LatLng | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);

  useEffect(() => {
    if (!id || preview) return;
    let cancelled = false;
    supabase
      .from('orders')
      .select(PEDIDO_COLUMNS)
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setPedido(data as Pedido);
        else setNotFound(true);
      });
    fotosDelPedido(id).then((urls) => !cancelled && setFotos(urls));

    const channel = supabase
      .channel(`pedido-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setPedido((prev) => (prev ? { ...prev, ...(payload.new as Partial<Pedido>) } : prev));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, preview]);

  const driverId = pedido?.driver_id ?? null;
  useEffect(() => {
    if (!driverId || preview) return;
    let cancelled = false;
    const read = (row: { ubicacion_actual?: LatLng | null }) => setChofer(row.ubicacion_actual ?? null);

    supabase
      .from('drivers')
      .select('ubicacion_actual')
      .eq('id', driverId)
      .maybeSingle()
      .then(({ data }) => !cancelled && data && read(data));

    const channel = supabase
      .channel(`chofer-${driverId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` }, (payload) =>
        read(payload.new as { ubicacion_actual?: LatLng | null })
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId, preview]);

  if (preview) return { pedido: preview.pedido, setPedido, notFound: false, chofer: preview.chofer, fotos: preview.fotos };
  return { pedido, setPedido, notFound, chofer: driverId ? chofer : null, fotos };
}
