import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';
import { paleta, type Tema } from '@/theme/tema';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  // Globito con un número (p. ej. fletes en curso).
  badge?: number;
};

// Barra de navegación de abajo, como en las apps actuales: va en el flujo (no
// flota sobre el contenido), así nunca tapa botones de la pantalla.
export function BarraInferior<T extends string>({
  items,
  activo,
  onIr,
  tema,
}: {
  items: TabItem<T>[];
  activo: T | null;
  onIr: (id: T) => void;
  tema: Tema;
}) {
  const insets = useSafeAreaInsets();
  const p = paleta(tema);
  const oscuro = tema === 'oscuro';
  return (
    <View
      role="navigation"
      aria-label="Menú principal"
      style={[
        styles.barra,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: oscuro ? '#12161C' : colors.white,
          borderTopColor: oscuro ? colors.dark.line : '#E3E6EA',
        },
      ]}>
      {items.map(({ id, label, Icon, badge }) => {
        const on = id === activo;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${label}, ${badge} pendientes` : label}
            onPress={() => onIr(id)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
            <View style={[styles.icono, on && styles.iconoOn]}>
              <Icon size={22} color={on ? colors.ink : p.muted} strokeWidth={on ? 2.4 : 2} />
              {badge ? (
                <View style={[styles.badge, { borderColor: oscuro ? '#12161C' : colors.white }]}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: on ? p.text : p.muted }, on && styles.labelOn]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    zIndex: 900,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minWidth: 0 },
  icono: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconoOn: { backgroundColor: colors.accent },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  labelOn: { fontFamily: fonts.bold },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
