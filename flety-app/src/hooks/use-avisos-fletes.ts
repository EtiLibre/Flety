import { useEffect, useState } from 'react';

import type { Pedido } from '@/lib/orders';
import { ESTADOS_PAGABLES, fletesCalificados, pagosDeFletes, type Pago } from '@/lib/pagos';

const CALIFICABLES = ['entregado', 'confirmado', 'liquidado'];

// Qué le falta al cliente en cada flete: calificar y/o pagar.
export function useAvisosFletes(pedidos: Pedido[]) {
  const calificables = pedidos.filter((p) => CALIFICABLES.includes(p.estado) && p.driver_id).map((p) => p.id);
  const pagables = pedidos.filter((p) => ESTADOS_PAGABLES.includes(p.estado) && p.company_id).map((p) => p.id);
  const clave = `${calificables.join(',')}|${pagables.join(',')}`;
  const [res, setRes] = useState<{ clave: string; calificados: Set<string>; pagos: Record<string, Pago> } | null>(null);

  useEffect(() => {
    if (clave === '|') return;
    let cancelled = false;
    const [cal, pag] = clave.split('|').map((x) => (x ? x.split(',') : []));
    Promise.all([fletesCalificados(cal), pagosDeFletes(pag)]).then(
      ([calificados, pagos]) => !cancelled && setRes({ clave, calificados, pagos })
    );
    return () => {
      cancelled = true;
    };
  }, [clave]);

  const actual = res?.clave === clave ? res : null;
  const porCalificar = actual ? calificables.filter((id) => !actual.calificados.has(id)) : [];
  // Sin pago confirmado (ni informado): pendiente.
  const porPagar = actual ? pagables.filter((id) => !actual.pagos[id] || actual.pagos[id].estado === 'rechazado') : [];
  return { porCalificar: new Set(porCalificar), porPagar: new Set(porPagar), pagos: actual?.pagos ?? {} };
}
