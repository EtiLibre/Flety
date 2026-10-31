import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Degrade, SOMBRAS, type NombreDegrade } from '@/plataforma/estilo';
import { colors, fonts, radius } from '@/theme';

type Variant = 'accent' | 'dark' | 'light' | 'outline' | 'danger' | 'grua' | 'oscuro';

// Los botones de color llevan degradé, un brillo arriba y una sombra de su
// mismo tono (canvas "color con volumen").
const VARIANTS: Record<
  Variant,
  { bg: string; fg: string; border?: string; degrade?: NombreDegrade; sombra?: string; brillo?: string }
> = {
  accent: {
    bg: colors.accent,
    fg: colors.ink,
    degrade: 'sol',
    sombra: SOMBRAS.sol,
    brillo: 'inset 0px 1px 0px rgba(255,255,255,0.65), inset 0px -2px 0px rgba(180,110,0,0.25)',
  },
  dark: {
    bg: colors.ink,
    fg: colors.white,
    degrade: 'grafito',
    sombra: SOMBRAS.grafito,
    brillo: 'inset 0px 1px 0px rgba(255,255,255,0.12)',
  },
  light: { bg: colors.white, fg: colors.ink, sombra: '0px 6px 16px -8px rgba(18,22,28,0.25)' },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.line },
  danger: { bg: colors.dangerBg, fg: colors.danger, degrade: 'peligro', sombra: SOMBRAS.peligro },
  // Grúas: naranja del servicio.
  grua: {
    bg: '#FF6B1A',
    fg: colors.white,
    degrade: 'fuego',
    sombra: SOMBRAS.fuego,
    brillo: 'inset 0px 1px 0px rgba(255,255,255,0.35), inset 0px -2px 0px rgba(120,30,0,0.25)',
  },
  // Secundario sobre fondo oscuro.
  oscuro: { bg: colors.dark.chip, fg: colors.dark.text, border: 'rgba(255,255,255,0.08)' },
};

export function Button({
  title,
  onPress,
  variant = 'accent',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.degrade ? 'transparent' : v.bg,
          borderColor: v.border ?? 'transparent',
          opacity: inactive ? 0.55 : 1,
          boxShadow: inactive ? undefined : v.sombra,
        },
        pressed && !inactive && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {v.degrade ? (
        <Degrade nombre={v.degrade} style={[StyleSheet.absoluteFill, styles.fondo, { boxShadow: v.brillo }]} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  fondo: { borderRadius: radius.lg - 1 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
});
