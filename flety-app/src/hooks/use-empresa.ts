import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import {
  CHOFER_COLUMNS,
  choferDeRow,
  contarFotos,
  nombresDeClientes,
  type Chofer,
  type ChoferRow,
  type Empresa,
} from '@/lib/empresa';
import { PEDIDO_COLUMNS, type Pedido } from '@/lib/orders';
import { canal } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';

export type DatosEmpresa = {
  empresa: Empresa | null;
  // En cola: buscando empresa. Al superadmin también le llegan los pendientes de pago.
  cola: Pedido[];
  // Pedidos tomados por la empresa (superadmin/contabilidad: todos los tomados).
  pedidos: Pedido[];
  choferes: Chofer[];
  fotos: Record<string, number>;
  clientes: Record<string, string>;
};

const VACIO: DatosEmpresa = {
  empresa: null,
  cola: [],
  pedidos: [],
  choferes: [],
  fotos: {},
  clientes: {},
};
// Respaldo por si se pierde algún evento en vivo (p. ej. un pedido de la cola
// que tomó otra empresa deja de ser visible y no llega su UPDATE).
const REFRESCO_MS = 30_000;

// SOLO DESARROLLO: datos de ejemplo para /preview-empresa (sin Supabase).
export const EmpresaPreviewContext = createContext<DatosEmpresa | null>(null);

export function useEmpresa() {
  const { role, companyId } = useAuth();
  const preview = useContext(EmpresaPreviewContext);
  const [datos, setDatos] = useState<DatosEmpresa>(VACIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  const esAdmin = role === 'superadmin' || role === 'contabilidad';

  useEffect(() => {
    if (!role || preview) return;
    let cancelled = false;

    async function cargar() {
      const empresaQuery = companyId
        ? supabase.from('companies').select('id, nombre, estado_aprobacion').eq('id', companyId).maybeSingle()
        : Promise.resolve({ data: null });

      // Contabilidad no opera la cola.
      const colaQuery =
        role === 'contabilidad'
          ? Promise.resolve({ data: [] })
          : supabase
              .from('orders')
              .select(PEDIDO_COLUMNS)
              .is('company_id', null)
              .in('estado', role === 'superadmin' ? ['pendiente', 'buscando_asignacion'] : ['buscando_asignacion'])
              .order('created_at', { ascending: true });

      let pedidosQuery = supabase
        .from('orders')
        .select(PEDIDO_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(200);
      pedidosQuery = esAdmin
        ? pedidosQuery.not('company_id', 'is', null)
        : pedidosQuery.eq('company_id', companyId ?? '');

      let choferesQuery = supabase.from('drivers').select(CHOFER_COLUMNS).order('created_at');
      if (!esAdmin) choferesQuery = choferesQuery.eq('company_id', companyId ?? '');

      const [empresaRes, colaRes, pedidosRes, choferesRes] = await Promise.all([
        empresaQuery,
        colaQuery,
        pedidosQuery,
        choferesQuery,
      ]);
      // Una consulta que falla (p. ej. faltan migraciones en la base) se avisa en
      // pantalla en vez de dejarla cargando.
      const fallo = [colaRes, pedidosRes, choferesRes].find((r) => 'error' in r && r.error);
      const detalle = fallo && 'error' in fallo ? fallo.error?.message : null;
      if (!cancelled) {
        setError(
          detalle
            ? detalle.includes('does not exist') || detalle.includes('schema cache')
              ? 'Falta actualizar la base de datos: corré las migraciones pendientes en Supabase (SQL Editor).'
              : 'No pudimos cargar todos los datos. Probá de nuevo en un momento.'
            : null
        );
      }
      const cola = (colaRes.data as Pedido[] | null) ?? [];
      const pedidos = (pedidosRes.data as Pedido[] | null) ?? [];
      const [fotos, clientes] = await Promise.all([
        contarFotos([...cola, ...pedidos].map((p) => p.id)),
        nombresDeClientes(pedidos.map((p) => p.cliente_id)),
      ]);
      if (cancelled) return;
      setDatos({
        empresa: (empresaRes.data as Empresa | null) ?? null,
        cola,
        pedidos,
        choferes: ((choferesRes.data as unknown as ChoferRow[] | null) ?? []).map(choferDeRow),
        fotos,
        clientes,
      });
      setLoading(false);
    }

    cargar().catch(() => {
      if (cancelled) return;
      setError('No pudimos conectarnos. Revisá tu conexión y volvé a intentar.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [role, companyId, esAdmin, version, preview]);

  // En vivo: cualquier cambio en pedidos o choferes visibles vuelve a cargar.
  useEffect(() => {
    if (!role || preview) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pedirRecarga = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(recargar, 400);
    };
    const channel = supabase
      .channel(canal(`empresa-${companyId ?? role}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, pedirRecarga)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, pedirRecarga)
      .subscribe();
    const interval = setInterval(recargar, REFRESCO_MS);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [role, companyId, recargar, preview]);

  if (preview) return { ...preview, loading: false, error: null, recargar, esAdmin };
  return { ...datos, loading, error, recargar, esAdmin };
}
