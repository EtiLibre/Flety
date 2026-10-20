import { Check, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { iniciales } from '@/lib/empresa';
import { minutosHasta, type Fletero } from '@/lib/marketplace';
import { formatARS } from '@/lib/pricing';
import { VEHICULO_LABEL } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

// Un fletero disponible en el marketplace: quién es, con qué vehículo, a cuánto
// está del retiro y cuánto cobra su empresa por este viaje.
export function FleteroOption({
  fletero,
  selected,
  onPress,
}: {
  fletero: Fletero;
  selected: boolean;
  onPress: () => void;
}) {
  const min = minutosHasta(fletero.distancia_km);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${fletero.nombre}, ${fletero.empresa}, ${VEHICULO_LABEL[fletero.vehiculo].titulo}, a ${min} minutos${
        fletero.precio != null ? `, ${formatARS(fletero.precio)}` : ''
      }`}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.option,
        selected ? styles.selected : styles.idle,
        !selected && hovered && styles.hover,
        pressed && { opacity: 0.9 },
      ]}>
      <View style={[styles.avatar, selected && styles.avatarOn]}>
        <Text style={styles.avatarText}>{iniciales(fletero.nombre)}</Text>
        <View style={styles.online} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {fletero.nombre} <Text style={styles.empresa}>· {fletero.empresa}</Text>
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {VEHICULO_LABEL[fletero.vehiculo].titulo} · a {min} min del retiro
        </Text>
        <View style={styles.rating}>
          {fletero.calificaciones ? (
            <>
              <Star size={12} color="#E8A400" fill="#FFC233" strokeWidth={2} />
              <Text style={styles.ratingText}>
                {fletero.estrellas?.toFixed(1)} <Text style={styles.ratingMuted}>({fletero.calificaciones})</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.nuevo}>Nuevo en Flety</Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{fletero.precio != null ? formatARS(fletero.precio) : '—'}</Text>
        {selected ? (
          <View style={styles.check}>
            <Check size={12} color={colors.white} strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  idle: { borderWidth: 1, borderColor: colors.line, margin: 1 },
  hover: { backgroundColor: '#FAFAF8' },
  selected: { borderWidth: 2, borderColor: colors.ink },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { backgroundColor: colors.accent },
  avatarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  online: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.white,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  empresa: { fontFamily: fonts.medium, color: colors.muted },
  detail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  right: { alignItems: 'flex-end', gap: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  ratingMuted: { fontFamily: fonts.regular, color: colors.muted },
  nuevo: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#2F45B5',
    backgroundColor: '#E8EEFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  price: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
