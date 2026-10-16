import { useAuth } from '@/lib/auth';
import { aceptarPedido, simularPago, type Empresa } from '@/lib/empresa';
import { liberarSolicitud } from '@/lib/marketplace';
import type { Pedido } from '@/lib/orders';

import { Badge, BotonChico } from './ui';

// Acción de un pedido en la cola: la empresa (aprobada) lo acepta; el
// superadmin pasa a la cola los pendientes de pago (pago simulado).
export function AccionCola({
  pedido,
  empresa,
  pendiente,
  ejecutar,
}: {
  pedido: Pedido;
  empresa: Empresa | null;
  pendiente: string | null;
  ejecutar: (key: string, fn: () => Promise<void>) => void;
}) {
  const { role } = useAuth();

  if (role === 'superadmin' && pedido.estado === 'pendiente') {
    return (
      <BotonChico
        title="Simular pago"
        variant="dark"
        loading={pendiente === `pago-${pedido.id}`}
        onPress={() => ejecutar(`pago-${pedido.id}`, () => simularPago(pedido.id))}
      />
    );
  }
  if (role === 'empresa' && empresa?.estado_aprobacion === 'aprobada' && pedido.estado === 'buscando_asignacion') {
    // Si el cliente eligió a esta empresa (o a uno de sus choferes), también puede liberarlo a la cola abierta.
    const elegida = pedido.company_solicitada === empresa.id;
    return (
      <>
        {elegida ? (
          <BotonChico
            title="Liberar"
            variant="outline"
            loading={pendiente === `liberar-${pedido.id}`}
            onPress={() => ejecutar(`liberar-${pedido.id}`, () => liberarSolicitud(pedido.id))}
          />
        ) : null}
        <BotonChico
          title="Aceptar"
          loading={pendiente === `aceptar-${pedido.id}`}
          onPress={() => ejecutar(`aceptar-${pedido.id}`, () => aceptarPedido(pedido.id, empresa.id))}
        />
      </>
    );
  }
  return <Badge label={pedido.estado === 'pendiente' ? 'Sin pagar' : 'En cola'} tone="neutral" />;
}
