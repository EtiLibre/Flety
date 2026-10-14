import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';

// Tarjeta gris con retiro → entrega y chips del pedido.
export function RouteSummary({ origen, destino, chips }: { origen: string; destino: string; chips: string[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.dotOrigen} />
        <Text style={styles.address} numberOfLines={2}>
          {origen}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.dotDestino} />
        <Text style={styles.address} numberOfLines={2}>
          {destino}
        </Text>
      </View>
      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Text key={chip} style={styles.chip}>
              {chip}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: radius.xl, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dotOrigen: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white },
  dotDestino: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink },
  address: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  chip: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#3A3F45',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
