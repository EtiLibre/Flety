import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadow } from '@/theme';

// Botón circular flotante (sobre el mapa) o en superficie gris (pantallas sin mapa).
export function IconButton({
  label,
  onPress,
  children,
  tone = 'floating',
  size = 48,
  style,
}: {
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
  tone?: 'floating' | 'surface';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.8 : 1 },
        tone === 'floating' ? styles.floating : styles.surface,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  floating: { backgroundColor: colors.white, ...shadow.floating },
  surface: { backgroundColor: colors.surface },
});
