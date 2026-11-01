import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { colors, fonts, radius } from '@/theme';

// Opción seleccionable (tamaño, día, franja...). Seleccionada = degradé amarillo
// con sombra del mismo tono.
export function Choice({
  title,
  detail,
  selected,
  onPress,
  style,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {selected ? <Degrade nombre="sol" diagonal style={[StyleSheet.absoluteFill, styles.fondo]} /> : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={[styles.detail, selected && { color: '#3D2C00' }]}>{detail}</Text> : null}
    </Pressable>
  );
}

// Control segmentado de 2+ opciones (Ahora / Programar).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tema = 'claro',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tema?: 'claro' | 'oscuro';
}) {
  const oscuro = tema === 'oscuro';
  return (
    <View style={[styles.segmented, oscuro && styles.segmentedOscuro]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && (oscuro ? styles.segmentActiveOscuro : styles.segmentActive)]}>
            <Text
              style={[
                styles.segmentText,
                oscuro && { color: colors.dark.muted },
                active &&
                  (oscuro ? { color: colors.dark.text, fontFamily: fonts.extrabold } : styles.segmentTextActive),
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
    backgroundColor: colors.white,
  },
  idle: { boxShadow: '0px 4px 12px -6px rgba(18,22,28,0.25)' },
  selected: { boxShadow: `${SOMBRAS.sol}, inset 0px 1px 0px rgba(255,255,255,0.6)` },
  fondo: { borderRadius: radius.md },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(18,22,28,0.06)',
  },
  segment: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.white, boxShadow: '0px 4px 10px -4px rgba(18,22,28,0.3)' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  segmentTextActive: { color: colors.ink, fontFamily: fonts.extrabold },
  segmentedOscuro: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  segmentActiveOscuro: {
    backgroundColor: '#2E3640',
    boxShadow: '0px 6px 12px -6px rgba(0,0,0,0.8), inset 0px 1px 0px rgba(255,255,255,0.1)',
  },
});
