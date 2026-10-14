import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { PublicOnly } from '@/components/Guards';
import { RouteIllustration } from '@/components/RouteIllustration';
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
