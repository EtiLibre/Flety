import { StyleSheet, View } from 'react-native';

import type { GeoPoint } from '@/lib/types';
import { colors, radius } from '@/theme';

import { AddressField } from './AddressField';

// Origen y destino en una sola tarjeta con el riel (punto, línea punteada y
// cuadrado), como en Pedir mudanza o flete. Lo usan Mudanzas y Grúas.
export function RutaCampos({
  origen,
  destino,
  onOrigen,
  onDestino,
  labelOrigen,
  labelDestino,
  placeholderOrigen,
  placeholderDestino,
  acentoDestino = colors.accent,
  sobreVidrio,
}: {
  origen: GeoPoint | null;
  destino: GeoPoint | null;
  onOrigen: (p: GeoPoint | null) => void;
  onDestino: (p: GeoPoint | null) => void;
  labelOrigen: string;
  labelDestino: string;
  placeholderOrigen: string;
  placeholderDestino: string;
  acentoDestino?: string;
  // Sobre el panel de vidrio (mapa arriba) va en blanco para que resalte.
  sobreVidrio?: boolean;
}) {
  return (
    <View style={[styles.route, sobreVidrio && styles.blanca]}>
      <View style={styles.routeRail}>
        <View style={styles.dotOrigen} />
        <View style={styles.railLine} />
        <View style={[styles.dotDestino, { backgroundColor: acentoDestino }]} />
      </View>
      <View style={styles.routeFields}>
        <AddressField
          label={labelOrigen}
          placeholder={placeholderOrigen}
          value={origen}
          onChange={onOrigen}
          allowCurrentLocation
          tipo="origen"
        />
        <View style={styles.divider} />
        <AddressField label={labelDestino} placeholder={placeholderDestino} value={destino} onChange={onDestino} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  route: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  blanca: { backgroundColor: colors.white, boxShadow: '0px 8px 22px -14px rgba(18,22,28,0.35)' },
  routeRail: { width: 12, alignItems: 'center', paddingTop: 34, paddingBottom: 30 },
  dotOrigen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#8B95A1', marginVertical: 6 },
  dotDestino: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  routeFields: { flex: 1, minWidth: 0 },
  divider: { height: 1, backgroundColor: colors.line },
});
