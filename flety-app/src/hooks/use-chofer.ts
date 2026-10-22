import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { ESTADOS_ACTIVOS_CHOFER, miChofer, type MiChofer } from '@/lib/chofer';
import { nombresDeClientes } from '@/lib/empresa';
import { PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { canal } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

export type DatosChofer = {
  chofer: MiChofer | null;
  // Asignados y en curso, el más avanzado primero.
  pedidos: Pedido[];
  // Pedidos donde un cliente lo eligió en el marketplace y esperan su respuesta.
  solicitudes: Pedido[];
  // Entregados hoy.
  hechosHoy: number;
  clientes: Record<string, string>;
};

const VACIO: DatosChofer = { chofer: null, pedidos: [], solicitudes: [], hechosHoy: 0, clientes: {} };

// SOLO DESARROLLO: datos de ejemplo para /preview-chofer (sin Supabase).
export const ChoferPreviewContext = createContext<DatosChofer | null>(null);

// El pedido en curso va primero; después los asignados por fecha.
function ordenar(a: Pedido, b: Pedido) {
  const ia = ESTADOS_ACTIVOS_CHOFER.indexOf(a.estado);
  const ib = ESTADOS_ACTIVOS_CHOFER.indexOf(b.estado);
  if (ia !== ib) return ib - ia;
  return (a.programado_para ?? a.created_at).localeCompare(b.programado_para ?? b.created_at);
}

// Vista previa (superadmin): "Mi perfil" se abre dentro de la demo en vez de navegar.
export const PerfilPreviewContext = createContext<(() => void) | null>(null);

export function useChofer() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const preview = useContext(ChoferPreviewContext);
  const [datos, setDatos] = useState<DatosChofer>(VACIO);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!userId || preview) return;
    let cancelled = false;
    (async () => {
      const chofer = await miChofer(userId);
      if (!chofer) {
        if (!cancelled) {
          setDatos(VACIO);
          setLoading(false);
        }
        return;
      }
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const [activosRes, hechosRes, solicitudesRes] = await Promise.all([
        supabase.from('orders').select(PEDIDO_COLUMNS).eq('driver_id', chofer.id).in('estado', ESTADOS_ACTIVOS_CHOFER),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', chofer.id)
          .in('estado', ['entregado', 'confirmado', 'liquidado'])
          .gte('created_at', hoy.toISOString()),
        supabase
          .from('orders')
          .select(PEDIDO_COLUMNS)
          .eq('driver_solicitado', chofer.id)
          .eq('estado', 'buscando_asignacion')
          .order('created_at'),
      ]);
      const pedidos = ((activosRes.data as Pedido[] | null) ?? []).sort(ordenar);
      const solicitudes = (solicitudesRes.data as Pedido[] | null) ?? [];
      const clientes = await nombresDeClientes(pedidos.map((p) => p.cliente_id));
      if (cancelled) return;
      setDatos({ chofer, pedidos, solicitudes, hechosHoy: hechosRes.count ?? 0, clientes });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, version, preview]);

  // En vivo: la empresa le asigna/cambia pedidos, o cambia algo de su fila.
  const driverId = datos.chofer?.id ?? null;
  useEffect(() => {
    if (!driverId || preview) return;
    const channel = supabase
      .channel(canal(`chofer-app-${driverId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${driverId}` },
        recargar
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `driver_solicitado=eq.${driverId}` },
        recargar
      )
      .subscribe();
    // Respaldo: si le sacan un pedido, el UPDATE puede no llegar (deja de ser visible).
    const interval = setInterval(recargar, 30_000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [driverId, recargar, preview]);

  if (preview) return { ...preview, loading: false, recargar };
  return { ...datos, loading, recargar };
}
