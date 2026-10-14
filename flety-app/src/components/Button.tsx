import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Variant = 'accent' | 'dark' | 'light' | 'outline';

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  accent: { bg: colors.accent, fg: colors.ink },
  dark: { bg: colors.ink, fg: colors.white },
  light: { bg: colors.white, fg: colors.ink },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.line },
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
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}>
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
  label: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
});
