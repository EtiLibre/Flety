import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthIllustration } from '@/components/AuthIllustration';
import { CANVAS_BG, DotCanvas } from '@/components/DotCanvas';
import { colors, fonts } from '@/theme';

// Esqueleto de las pantallas de cuenta (login, registro, recuperar) y de los
// formularios sueltos: lienzo de puntos, barra flotante arriba y una tarjeta
// centrada que entra con una animación suave.
export function FormScreen({
  title,
  subtitle,
  children,
  footer,
  illustration = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // Camioncito animado arriba de la tarjeta.
  illustration?: boolean;
}) {
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(entrada, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrada]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <DotCanvas />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topBar}>
            <View style={styles.pill}>
              <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={volver} style={styles.backBtn}>
                <ChevronLeft size={20} color={colors.ink} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.pillDivider} />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Flety, inicio"
                onPress={() => router.replace('/')}
                style={styles.brand}>
                <View style={styles.brandMark}>
                  <Truck size={15} color={colors.ink} strokeWidth={2.2} />
                </View>
                <Text style={styles.brandWord}>flety</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: entrada,
                  transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                },
              ]}>
              {illustration ? (
                <View style={styles.art}>
                  <AuthIllustration />
                </View>
              ) : null}
              <View style={styles.body}>
                <View style={styles.titles}>
                  <Text style={styles.title} accessibilityRole="header">
                    {title}
                  </Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                {children}
                {footer ? <View style={styles.footer}>{footer}</View> : null}
              </View>
            </Animated.View>
            <Text style={styles.tagline}>Fletes y mudanzas con empresas verificadas · Mendoza</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS_BG },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 5,
    paddingRight: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    boxShadow: '0 2px 10px rgba(18, 22, 28, 0.05)',
  },
  backBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pillDivider: { width: 1, height: 18, backgroundColor: '#E8E8E3' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 4 },
  brandMark: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingBottom: 32, gap: 18 },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E3',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(18, 22, 28, 0.10), 0 2px 8px rgba(18, 22, 28, 0.04)',
  },
  art: { borderBottomWidth: 1, borderBottomColor: '#EFEFEA' },
  body: { padding: 26, gap: 18 },
  titles: { gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  footer: { paddingTop: 2 },
  tagline: { fontFamily: fonts.medium, fontSize: 13, color: '#8B9099', textAlign: 'center' },
});
