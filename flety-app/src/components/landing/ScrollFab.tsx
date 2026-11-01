import { ArrowUp } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Degrade, SOMBRAS } from '@/plataforma/estilo';
import { colors } from '@/theme';

const transition = {
  transitionProperty: 'opacity, transform',
  transitionDuration: '300ms',
  transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
} as unknown as ViewStyle;

// Flecha flotante abajo a la derecha (botón con degradé): no se ve arriba de
// todo; aparece al bajar y lleva de vuelta al inicio.
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
      <Degrade nombre="sol" style={[StyleSheet.absoluteFill, styles.fondo]} />
      {/* En la web el ícono necesita su propia capa para quedar sobre el degradé. */}
      <View style={styles.icono}>
        <ArrowUp size={24} color={colors.ink} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    zIndex: 40,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `${SOMBRAS.sol}, inset 0px 1px 0px rgba(255,255,255,0.65)`,
  },
  fondo: { borderRadius: 24 },
  icono: { position: 'relative', zIndex: 1 },
  shown: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  hover: { opacity: 1, transform: [{ translateY: -2 }, { scale: 1.06 }] },
  hidden: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.8 }] },
});
