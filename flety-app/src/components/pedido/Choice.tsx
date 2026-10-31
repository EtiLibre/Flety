import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

// Opción seleccionable (tamaño, día, franja...). Seleccionada = borde tinta de 2px.
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
        pressed && { opacity: 0.8 },
        style,
      ]}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
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
    <View style={[styles.segmented, oscuro && { backgroundColor: colors.dark.chip }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && (oscuro ? { backgroundColor: colors.dark.text } : styles.segmentActive)]}>
            <Text
              style={[
                styles.segmentText,
                oscuro && { color: colors.dark.text },
                active && (oscuro ? { color: colors.ink } : styles.segmentTextActive),
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
  idle: { borderWidth: 1, borderColor: colors.line, margin: 1 },
  selected: { borderWidth: 2, borderColor: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  segmented: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.md, backgroundColor: colors.surface },
  segment: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.ink },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  segmentTextActive: { color: colors.white },
});
