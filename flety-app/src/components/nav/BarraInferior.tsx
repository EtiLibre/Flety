import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Degrade, SOMBRAS, Vidrio, type NombreDegrade } from '@/plataforma/estilo';
import { colors, fonts } from '@/theme';
import { paleta, type Tema } from '@/theme/tema';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  // Globito con un número (p. ej. fletes en curso).
  badge?: number;
};

// Barra de navegación de abajo: una cápsula de vidrio que flota sobre el
// fondo, con la pestaña activa en degradé. Va en el flujo (no tapa botones de
// la pantalla).
export function BarraInferior<T extends string>({
  items,
  activo,
  onIr,
  tema,
  acento,
}: {
  items: TabItem<T>[];
  activo: T | null;
  onIr: (id: T) => void;
  tema: Tema;
  // Pestaña activa: degradé y color del ícono (por defecto, el amarillo de Flety).
  acento?: { fondo?: string; icono: string; degrade?: NombreDegrade };
}) {
  const insets = useSafeAreaInsets();
  const p = paleta(tema);
  const oscuro = tema === 'oscuro';
  const degrade = acento?.degrade ?? 'sol';
  const colorActivo = acento?.icono ?? colors.ink;
  const sombraActiva = degrade === 'fuego' ? SOMBRAS.fuego : SOMBRAS.sol;

  return (
    <View
      role="navigation"
      aria-label="Menú principal"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: p.bg }]}>
      <Vidrio
        oscuro={oscuro}
        style={[styles.barra, { boxShadow: oscuro ? '0px 18px 40px -12px rgba(0,0,0,0.8)' : SOMBRAS.flotante }]}>
        {items.map(({ id, label, Icon, badge }) => {
          const on = id === activo;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badge ? `${label}, ${badge} pendientes` : label}
              onPress={() => onIr(id)}
              style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && { opacity: 0.75 }]}>
              {on ? (
                <Degrade
                  nombre={degrade}
                  style={[StyleSheet.absoluteFill, styles.pastilla, { boxShadow: sombraActiva }]}
                />
              ) : null}
              <View>
                <Icon size={on ? 19 : 22} color={on ? colorActivo : p.muted} strokeWidth={on ? 2.4 : 2} />
                {badge ? (
                  <View style={[styles.badge, { borderColor: oscuro ? '#1A1F26' : colors.white }]}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              {on ? (
                <Text style={[styles.label, { color: colorActivo }]} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </Vidrio>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 8, zIndex: 900 },
  barra: { flexDirection: 'row', gap: 4, padding: 8, borderRadius: 24 },
  item: {
    flex: 1,
    height: 48,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  itemOn: { flex: 1.6 },
  pastilla: { borderRadius: 17 },
  label: { fontFamily: fonts.extrabold, fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
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
