import { ArrowDown } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

// Flecha flotante abajo a la derecha: arriba de todo invita a bajar (rebota);
// al bajar gira y lleva de vuelta al inicio.
export function ScrollFab({ arriba, onPress }: { arriba: boolean; onPress: () => void }) {
  const [bote] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (arriba) {
      bote.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bote, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(bote, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [arriba, bote]);

  const transition = {
    transitionProperty: 'transform, background-color',
    transitionDuration: '350ms',
  } as unknown as ViewStyle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={arriba ? 'Volver arriba' : 'Bajar a la siguiente sección'}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [styles.fab, arriba && styles.fabDark, hovered && styles.hover]}>
      <Animated.View
        style={[
          transition,
          {
            transform: [
              { translateY: bote.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) },
              { rotate: arriba ? '180deg' : '0deg' },
            ],
          },
        ]}>
        <ArrowDown size={22} color={arriba ? colors.accent : colors.ink} strokeWidth={2.4} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    zIndex: 40,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 28px rgba(18, 22, 28, 0.22)',
  },
  fabDark: { backgroundColor: colors.ink },
  hover: { transform: [{ scale: 1.06 }] },
});
