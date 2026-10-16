import { MapPin, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts } from '@/theme';

import { DotCanvas } from './DotCanvas';

// Ilustración animada del encabezado de las pantallas de cuenta: un camioncito
// recorre la ruta punteada del retiro a la entrega, entre dos tarjetitas flotantes.
const W = 400;
const H = 160;
const P0 = { x: 62, y: 116 };
const C1 = { x: 150, y: 124 };
const C2 = { x: 190, y: 56 };
const P3 = { x: 334, y: 66 };
const PATH = `M${P0.x} ${P0.y} C ${C1.x} ${C1.y}, ${C2.x} ${C2.y}, ${P3.x} ${P3.y}`;

function bezier(t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * C1.x + 3 * u * t * t * C2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * C1.y + 3 * u * t * t * C2.y + t * t * t * P3.y,
  };
}

const SAMPLES = Array.from({ length: 21 }, (_, i) => i / 20);
// El camioncito frena un poco antes del pin de entrega.
const PUNTOS = SAMPLES.map((t) => bezier(t * 0.9));
const nativeDriver = Platform.OS !== 'web';

export function AuthIllustration() {
  const [width, setWidth] = useState(0);
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(t, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: nativeDriver,
        }),
        Animated.delay(900),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const k = width / W;
  const TRUCK = 34;
  const translateX = t.interpolate({ inputRange: SAMPLES, outputRange: PUNTOS.map((p) => p.x * k - TRUCK / 2) });
  const translateY = t.interpolate({ inputRange: SAMPLES, outputRange: PUNTOS.map((p) => p.y * k - TRUCK / 2) });
  const pulse = t.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 1.25] });

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} aria-hidden>
      <DotCanvas id="auth-dots" color="#DEDED9" gap={18} />
      {width ? (
        <>
          <Svg width={width} height={width * (H / W)} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
            <Path d={PATH} stroke="#E4E4DF" strokeWidth={10} fill="none" strokeLinecap="round" />
            <Path
              d={PATH}
              stroke={colors.accent}
              strokeWidth={3}
              strokeDasharray="2 9"
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx={P0.x} cy={P0.y} r={9} fill={colors.white} stroke={colors.ink} strokeWidth={4} />
          </Svg>

          <View style={[styles.chip, { left: P0.x * k - 30, top: P0.y * k + 14 }]}>
            <Text style={styles.chipText}>Retiro</Text>
          </View>

          <Animated.View
            style={[styles.pin, { left: P3.x * k - 16, top: P3.y * k - 34, transform: [{ scale: pulse }] }]}>
            <MapPin size={30} color={colors.ink} fill={colors.accent} strokeWidth={1.8} />
          </Animated.View>
          <View style={[styles.chip, { left: P3.x * k - 30, top: P3.y * k + 8 }]}>
            <Text style={styles.chipText}>Entrega</Text>
          </View>

          <Animated.View
            style={[styles.truck, { width: TRUCK, height: TRUCK, transform: [{ translateX }, { translateY }] }]}>
            <Truck size={18} color={colors.ink} strokeWidth={2.2} />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: W / H, overflow: 'hidden', backgroundColor: '#FAFAF8' },
  chip: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  pin: { position: 'absolute' },
  truck: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6E6E1',
    boxShadow: '0 4px 12px rgba(18, 22, 28, 0.14)',
  },
});
