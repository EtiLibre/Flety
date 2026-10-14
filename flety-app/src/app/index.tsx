import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { PublicOnly } from '@/components/Guards';
import { colors, fonts } from '@/theme';

export default function Bienvenida() {
  return (
    <PublicOnly dark>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <BrandMark tone="dark" />

        <View style={styles.art}>
          <RouteIllustration />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title} accessibilityRole="header">
            Mové lo que necesites, <Text style={{ color: colors.accent }}>cuando lo necesites.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Fletes y mudanzas con empresas verificadas, seguimiento en vivo y el precio antes de confirmar.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Crear cuenta" onPress={() => router.push('/registro')} />
          <Text style={styles.footnote}>
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" style={styles.link}>
              Iniciar sesión
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            ¿Sos chofer o empresa de mudanzas?{' '}
            <Link href="/registro" style={styles.link}>
              Creá tu cuenta
            </Link>{' '}
            y te sumamos a la red.
          </Text>
        </View>
      </SafeAreaView>
    </PublicOnly>
  );
}

function RouteIllustration() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 342 300" preserveAspectRatio="xMidYMid meet">
      <G stroke="#222933" strokeWidth={1}>
        <Path d="M0 40H342M0 100H342M0 160H342M0 220H342M0 280H342" />
        <Path d="M24 0V300M94 0V300M164 0V300M234 0V300M304 0V300" />
      </G>
      <Path d="M-10 214 C 80 196 130 120 352 88" stroke="#262E39" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M-10 120 C 120 140 200 230 352 250" stroke="#1E252E" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path
        d="M60 236 C 110 230 122 172 168 152 S 250 96 280 84"
        stroke={colors.accent}
        strokeWidth={4}
        strokeDasharray="2 10"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={60} cy={236} r={18} fill={colors.ink} stroke={colors.white} strokeWidth={3} />
      <Circle cx={60} cy={236} r={6} fill={colors.white} />
      <Circle cx={282} cy={56} r={20} fill={colors.accent} />
      <Path d="M270 68 L282 90 L294 68 Z" fill={colors.accent} />
      <Circle cx={282} cy={56} r={7} fill={colors.ink} />
      <Rect x={144} y={132} width={48} height={36} rx={12} fill={colors.white} />
      <G x={156} y={138} stroke={colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 6h12v10H2z" />
        <Path d="M14 10h4l4 4v2h-8z" />
        <Circle cx={6.5} cy={17.5} r={2} />
        <Circle cx={17.5} cy={17.5} r={2} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 24,
  },
  art: { flex: 1, minHeight: 160 },
  copy: { gap: 12 },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.white,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.mutedOnInk,
  },
  actions: { gap: 14 },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.mutedOnInk,
    textAlign: 'center',
  },
  smallNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.faintOnInk,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.semibold,
    color: colors.white,
    textDecorationLine: 'underline',
  },
});
