import { Check, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { TruckSprite } from '@/components/map/TruckSprite';
import { TRUCK_SIZE } from '@/components/map/truck-sprite';
import { colors, fonts } from '@/theme';

// Mapa animado del hero: la camioneta recorre la ruta, el tiempo de llegada
// baja y aparecen los avisos del pedido (ilustrativo, no son datos reales).
const VB = { w: 560, h: 460 };
const RUTA = [
  { x: 112, y: 340 },
  { x: 118, y: 226 },
  { x: 262, y: 214 },
  { x: 256, y: 104 },
  { x: 420, y: 92 },
];
const DURACION = 9000;

// Avance (0..1) en cada vértice, proporcional a la longitud de cada tramo.
const largos = RUTA.slice(1).map((p, i) => Math.hypot(p.x - RUTA[i].x, p.y - RUTA[i].y));
const total = largos.reduce((a, b) => a + b, 0);
const HITOS = RUTA.map((_, i) => largos.slice(0, i).reduce((a, b) => a + b, 0) / total);
const RUMBOS = RUTA.slice(1).map((p, i) => (Math.atan2(p.x - RUTA[i].x, RUTA[i].y - p.y) * 180) / Math.PI);

const ESCALA_CAMION = 0.62;

export function HeroMap({ height }: { height: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [t] = useState(() => new Animated.Value(0));
  const [eta, setEta] = useState(12);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: DURACION,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(1200),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    const id = t.addListener(({ value }) => setEta(Math.max(1, Math.round(12 * (1 - value)))));
    return () => {
      loop.stop();
      t.removeListener(id);
    };
  }, [t]);

  // El SVG cubre el recuadro ("slice"): misma cuenta para ubicar la camioneta encima.
  const k = size.w ? Math.max(size.w / VB.w, size.h / VB.h) : 0;
  const ox = (size.w - VB.w * k) / 2;
  const oy = (size.h - VB.h * k) / 2;
  const tw = TRUCK_SIZE.width;
  const th = TRUCK_SIZE.height;

  const x = t.interpolate({ inputRange: HITOS, outputRange: RUTA.map((p) => ox + p.x * k - tw / 2) });
  const y = t.interpolate({ inputRange: HITOS, outputRange: RUTA.map((p) => oy + p.y * k - th / 2) });
  // Gira en cada esquina (casi de golpe, como en el mapa real).
  const rotInput: number[] = [];
  const rotOutput: string[] = [];
  RUMBOS.forEach((r, i) => {
    rotInput.push(HITOS[i] + (i ? 0.012 : 0), HITOS[i + 1] - (i < RUMBOS.length - 1 ? 0.012 : 0));
    rotOutput.push(`${r}deg`, `${r}deg`);
  });
  const rotate = t.interpolate({ inputRange: rotInput, outputRange: rotOutput });
  const barra = t.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });
  const toast = t.interpolate({ inputRange: [0, 0.04, 0.3, 0.36, 1], outputRange: [0, 1, 1, 0, 0] });

  function onLayout(e: LayoutChangeEvent) {
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  }

  return (
    <View style={[styles.card, { height }]} onLayout={onLayout}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}>
        <Rect width={VB.w} height={VB.h} fill="#141920" />
        <Rect x={350} y={40} width={150} height={110} rx={16} fill="#16241D" />
        <Rect x={40} y={300} width={130} height={100} rx={16} fill="#16241D" />
        <G stroke="#232A34" fill="none" strokeLinecap="round">
          <Path d="M-10 110 L570 80" strokeWidth={9} />
          <Path d="M-10 230 L570 190" strokeWidth={16} />
          <Path d="M-10 350 L570 320" strokeWidth={9} />
          <Path d="M100 -10 L120 470" strokeWidth={9} />
          <Path d="M250 -10 L276 470" strokeWidth={16} />
          <Path d="M420 -10 L436 470" strokeWidth={9} />
        </G>
        <Path
          d={`M${RUTA.map((p) => `${p.x} ${p.y}`).join(' L')}`}
          stroke={colors.accent}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={112} cy={340} r={11} fill="#F2F4F7" stroke="#141920" strokeWidth={4} />
        <Rect x={408} y={80} width={24} height={24} rx={6} fill={colors.accent} stroke="#141920" strokeWidth={3} />
      </Svg>

      {k ? (
        <Animated.View
          style={[
            styles.truck,
            {
              width: tw,
              height: th,
              transform: [{ translateX: x }, { translateY: y }, { rotate }, { scale: ESCALA_CAMION }],
            },
          ]}>
          <TruckSprite />
        </Animated.View>
      ) : null}

      <View style={styles.nearby}>
        <View style={styles.avatars}>
          {['MG', 'LF', 'DS'].map((ini, i) => (
            <View key={ini} style={[styles.avatar, { marginLeft: i ? -8 : 0 }]}>
              <Text style={styles.avatarText}>{ini}</Text>
            </View>
          ))}
        </View>
        <View>
          <Text style={styles.nearbyTitle}>3 fleteros cerca</Text>
          <Text style={styles.nearbySub}>disponibles ahora</Text>
        </View>
      </View>

      {size.w > 480 ? (
        <View style={styles.verified}>
          <ShieldCheck size={16} color={colors.success} strokeWidth={2.2} />
          <Text style={styles.verifiedText}>Empresa verificada</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.toast, { opacity: toast }]}>
        <View style={styles.toastIcon}>
          <Check size={14} color={colors.white} strokeWidth={3} />
        </View>
        <Text style={styles.toastText}>Martín aceptó tu pedido</Text>
      </Animated.View>

      <View style={styles.status}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Tu fletero está en camino</Text>
          <Text style={styles.eta}>{eta} min</Text>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, { width: barra }]} />
        </View>
        <Text style={styles.statusDetail}>Martín · Camioneta · Mudanza mediana</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#141920',
    borderWidth: 1,
    borderColor: '#262D37',
    boxShadow: '0 40px 90px rgba(0, 0, 0, 0.45)',
  },
  truck: { position: 'absolute', left: 0, top: 0 },
  nearby: {
    position: 'absolute',
    top: 18,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(26,31,38,0.92)',
    borderWidth: 1,
    borderColor: '#2A313B',
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#1A1F26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink },
  nearbyTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  nearbySub: { fontFamily: fonts.regular, fontSize: 11, color: '#9AA4B1' },
  verified: {
    position: 'absolute',
    top: 20,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  verifiedText: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  toast: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
  },
  toastIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22A06B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  status: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    maxWidth: 380,
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  eta: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  track: { height: 5, borderRadius: 3, backgroundColor: '#ECEEF1', overflow: 'hidden' },
  trackFill: { height: 5, borderRadius: 3, backgroundColor: colors.ink },
  statusDetail: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
