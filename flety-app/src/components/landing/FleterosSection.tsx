import { router } from 'expo-router';
import { Camera, KeyRound, MapPin, Navigation, ToggleRight, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CANVAS_BG, DotCanvas } from '@/components/DotCanvas';
import { colors, fonts } from '@/theme';

import { Reveal } from './Reveal';

const PASOS = [
  { Icon: UserPlus, titulo: 'Creá tu cuenta', texto: 'Con tu email, en un minuto.' },
  { Icon: KeyRound, titulo: 'Escribí el código de tu empresa', texto: 'Te suma a su flota en Flety.' },
  { Icon: ToggleRight, titulo: 'Marcate disponible', texto: 'Y recibí viajes asignados cerca tuyo.' },
];

const d = colors.dark;

// Tarjetita que flota suave (sube y baja) alrededor del celular.
function Flotante({ children, delay, style }: { children: React.ReactNode; delay: number; style?: object }) {
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(y, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, y]);
  return (
    <Animated.View
      style={[
        styles.flotante,
        style,
        { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] },
      ]}>
      {children}
    </Animated.View>
  );
}

export function FleterosSection({ isWide, onEmpresas }: { isWide: boolean; onEmpresas: () => void }) {
  return (
    <View style={styles.band}>
      <DotCanvas id="fleteros-dots" />
      <View style={[styles.container, { flexDirection: isWide ? 'row' : 'column', paddingVertical: isWide ? 96 : 56 }]}>
        <View style={[styles.copy, isWide && { flex: 1 }]}>
          <Reveal>
            <Text style={styles.eyebrow}>Para fleteros y choferes</Text>
          </Reveal>
          <Reveal delay={80}>
            <Text
              style={[styles.h2, { fontSize: isWide ? 44 : 32, lineHeight: isWide ? 48 : 36 }]}
              accessibilityRole="header">
              Sumate como fletero y recibí viajes en tu celular
            </Text>
          </Reveal>
          <Reveal delay={160}>
            <Text style={styles.lead}>
              Si manejás para una empresa de fletes, pedile tu código y empezá a recibir viajes con navegación, fotos de
              la carga y el recorrido en el mapa.
            </Text>
          </Reveal>

          <View style={styles.pasos}>
            {PASOS.map(({ Icon, titulo, texto }, i) => (
              <Reveal key={titulo} delay={220 + i * 90}>
                <View style={styles.paso}>
                  <View style={styles.pasoIcon}>
                    <Icon size={20} color={colors.ink} strokeWidth={2.1} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pasoTitle}>
                      {i + 1}. {titulo}
                    </Text>
                    <Text style={styles.pasoText}>{texto}</Text>
                  </View>
                </View>
              </Reveal>
            ))}
          </View>

          <Reveal delay={520}>
            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/registro', params: { next: '/unirse' } })}
                style={({ pressed }) => [styles.primary, pressed && { transform: [{ scale: 0.98 }] }]}>
                <Text style={styles.primaryText}>Quiero ser fletero</Text>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={onEmpresas} style={styles.secondary}>
                <Text style={styles.secondaryText}>¿Trabajás por tu cuenta? Registrá tu empresa</Text>
              </Pressable>
            </View>
          </Reveal>
        </View>

        <Reveal delay={150} style={[styles.visual, isWide ? { flex: 1, minHeight: 560 } : { gap: 20 }]}>
          <View style={styles.phone}>
            <View style={styles.notch} />
            <View style={styles.phoneTop}>
              <Text style={styles.phoneToggle}>Estás disponible</Text>
              <View style={styles.switch}>
                <View style={styles.knob} />
              </View>
            </View>
            <Svg width="100%" height={130} viewBox="0 0 260 130" preserveAspectRatio="xMidYMid slice">
              <Path d="M0 30 H260 M0 92 H260 M70 0 V130 M180 0 V130" stroke="#222831" strokeWidth={10} />
              <Path
                d="M40 112 L70 92 L180 92 L180 30 L226 18"
                stroke={colors.accent}
                strokeWidth={4}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Circle cx={40} cy={112} r={6} fill={d.text} stroke={d.bg} strokeWidth={3} />
              <Rect x={219} y={11} width={14} height={14} rx={4} fill={colors.accent} stroke={d.bg} strokeWidth={3} />
              <Circle cx={125} cy={92} r={14} fill={colors.accent} fillOpacity={0.25} />
              <Circle cx={125} cy={92} r={7} fill={colors.accent} />
            </Svg>
            <View style={styles.phoneCard}>
              <Text style={styles.phoneBadge}>Nuevo viaje</Text>
              <Text style={styles.phoneTitle}>Mudanza · Mediano</Text>
              <View style={styles.phoneChips}>
                <Text style={styles.phoneChip}>1 ayudante</Text>
                <Text style={styles.phoneChip}>Camioneta</Text>
                <Text style={styles.phoneChip}>4,2 km</Text>
              </View>
              <View style={styles.phoneRoute}>
                <View style={styles.rail}>
                  <View style={styles.dotA} />
                  <View style={styles.railLine} />
                  <View style={styles.dotB} />
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={styles.phoneDir}>San Martín 1200</Text>
                  <Text style={styles.phoneDir}>Arístides Villanueva 300</Text>
                </View>
              </View>
              <View style={styles.phoneBtn}>
                <Text style={styles.phoneBtnText}>Salir hacia el retiro</Text>
              </View>
            </View>
          </View>

          {/* En desktop flotan alrededor del celular; en pantallas angostas, debajo. */}
          <View style={isWide ? StyleSheet.absoluteFill : styles.chipsRow} pointerEvents="none">
            <Flotante delay={0} style={isWide ? styles.f1 : styles.fInline}>
              <Navigation size={16} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.fText}>Navegación al retiro</Text>
            </Flotante>
            <Flotante delay={600} style={isWide ? styles.f2 : styles.fInline}>
              <Camera size={16} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.fText}>Fotos de la carga</Text>
            </Flotante>
            <Flotante delay={1200} style={isWide ? styles.f3 : styles.fInline}>
              <MapPin size={16} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.fText}>GPS en vivo</Text>
            </Flotante>
          </View>
        </Reveal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: CANVAS_BG, overflow: 'hidden' },
  container: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 48,
    alignItems: 'center',
  },
  copy: { gap: 18, width: '100%' },
  eyebrow: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7A4F00',
  },
  h2: { fontFamily: fonts.display, letterSpacing: -0.8, color: colors.ink },
  lead: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, color: colors.muted, maxWidth: 520 },
  pasos: { gap: 10, paddingTop: 4 },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    boxShadow: '0 4px 14px rgba(18, 22, 28, 0.04)',
    maxWidth: 480,
  },
  pasoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  pasoText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', paddingTop: 6 },
  primary: {
    height: 54,
    paddingHorizontal: 26,
    borderRadius: 16,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  secondary: { paddingVertical: 10 },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
  visual: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  phone: {
    width: 290,
    padding: 14,
    paddingTop: 34,
    gap: 12,
    borderRadius: 44,
    backgroundColor: d.bg,
    borderWidth: 8,
    borderColor: '#1F252D',
    boxShadow: '0 40px 80px rgba(18, 22, 28, 0.25)',
  },
  notch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 90,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1F252D',
  },
  phoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    paddingLeft: 16,
    paddingRight: 7,
    borderRadius: 23,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: '#22A06B',
  },
  phoneToggle: { fontFamily: fonts.bold, fontSize: 14, color: d.text },
  switch: { width: 44, height: 28, borderRadius: 14, backgroundColor: '#22A06B', padding: 3, alignItems: 'flex-end' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  phoneCard: {
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: d.surface,
    borderWidth: 1,
    borderColor: d.line,
  },
  phoneBadge: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  phoneTitle: { fontFamily: fonts.display, fontSize: 22, color: d.text },
  phoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  phoneChip: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#D5DBE3',
    backgroundColor: d.chip,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  phoneRoute: { flexDirection: 'row', gap: 10 },
  rail: { width: 10, alignItems: 'center', paddingVertical: 4 },
  dotA: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: d.text },
  railLine: { flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: '#5B6470', marginVertical: 3 },
  dotB: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.accent },
  phoneDir: { fontFamily: fonts.semibold, fontSize: 13, color: d.text },
  phoneBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBtnText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  flotante: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    boxShadow: '0 12px 30px rgba(18, 22, 28, 0.12)',
  },
  fText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  fInline: { position: 'relative' },
  f1: { top: 70, left: '4%' },
  f2: { top: 220, right: '2%' },
  f3: { bottom: 80, left: '8%' },
});
