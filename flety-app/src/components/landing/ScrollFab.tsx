import { ArrowUp } from 'lucide-react-native';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

const transition = {
  transitionProperty: 'opacity, transform',
  transitionDuration: '300ms',
  transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
} as unknown as ViewStyle;

// Flecha flotante abajo a la derecha: no se ve arriba de todo; aparece al
// bajar y lleva de vuelta al inicio.
export function ScrollFab({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver arriba"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      pointerEvents={visible ? 'auto' : 'none'}
      onPress={onPress}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.fab,
        transition,
        visible ? (hovered ? styles.hover : styles.shown) : styles.hidden,
      ]}>
      <ArrowUp size={22} color={colors.ink} strokeWidth={2.4} />
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
  shown: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  hover: { opacity: 1, transform: [{ translateY: -2 }, { scale: 1.06 }] },
  hidden: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.8 }] },
});
