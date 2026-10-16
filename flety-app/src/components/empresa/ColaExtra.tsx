import { StyleSheet, Text, View } from 'react-native';

import { useAhora } from '@/hooks/use-ahora';
import type { Empresa } from '@/lib/empresa';
import { formatoCuenta, reservaVigente, segundosRestantes } from '@/lib/marketplace';
import type { Pedido } from '@/lib/orders';
import { formatARS } from '@/lib/pricing';
import { colors, fonts } from '@/theme';

import { Badge } from './ui';

// Columna de la cola: precio, y si un cliente eligió a esta empresa (o a uno de
// sus choferes), "Te eligieron" con lo que queda de la reserva.
export function ColaExtra({ pedido, empresa }: { pedido: Pedido; empresa: Empresa | null }) {
  const paraMi = !!empresa && pedido.company_solicitada === empresa.id;
  const ahora = useAhora(paraMi);
  const vigente = paraMi && reservaVigente(pedido, ahora);
  return (
    <View style={styles.wrap}>
      {pedido.precio_estimado != null ? (
        <Text style={styles.precio}>{formatARS(Number(pedido.precio_estimado))}</Text>
      ) : null}
      {vigente ? (
        <Badge
          label={`Te eligieron · ${formatoCuenta(segundosRestantes(pedido.solicitado_hasta, ahora))}`}
          tone="warn"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  precio: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
