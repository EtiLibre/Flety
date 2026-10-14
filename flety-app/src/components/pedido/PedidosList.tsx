import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { Pedido } from '@/lib/orders';
import { ESTADO_LABELS, TERMINAL_ESTADOS } from '@/lib/state-machine';
import { TIPO_LABEL } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

export function PedidosList({ pedidos, emptyText }: { pedidos: Pedido[]; emptyText: string }) {
  if (!pedidos.length) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View style={styles.list}>
      {pedidos.map((p) => {
        const activo = !TERMINAL_ESTADOS.includes(p.estado);
        return (
          <Link key={p.id} href={`/cliente/pedidos/${p.id}`} style={styles.item}>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{TIPO_LABEL[p.tipo]}</Text>
              <Text style={styles.itemDetail} numberOfLines={1}>
                {p.destino?.direccion ?? 'Sin destino'}
              </Text>
            </View>
            <Text style={[styles.estado, activo ? styles.estadoActivo : null]}>{ESTADO_LABELS[p.estado]}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  list: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemText: { flex: 1, minWidth: 0, gap: 2 },
  itemTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  itemDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  estado: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  estadoActivo: { color: colors.success },
});
