import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { IconButton } from '@/components/IconButton';
import { RouteIllustration } from '@/components/RouteIllustration';
import { useIsWide } from '@/hooks/use-is-wide';
import { colors, fonts } from '@/theme';

// Esqueleto de las pantallas de formulario (login, registro, etc.): volver + título + contenido.
// En pantallas anchas (web desktop) suma el panel oscuro de marca a la izquierda.
export function FormScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isWide = useIsWide();

  const form = (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <IconButton
          label="Volver"
          tone="surface"
          size={44}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
        {isWide && footer ? <View style={styles.inlineFooter}>{footer}</View> : null}
      </ScrollView>
      {!isWide && footer ? <View style={styles.footer}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );

  if (!isWide) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        {form}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.split}>
      <StatusBar style="dark" />
      <View style={styles.brandPanel}>
        <BrandMark tone="dark" />
        <View style={styles.brandArt}>
          <RouteIllustration />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>
            Mové lo que necesites, <Text style={{ color: colors.accent }}>cuando lo necesites.</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Empresas verificadas, precio antes de confirmar y seguimiento en vivo.</Text>
        </View>
      </View>
      <View style={styles.formPanel}>{form}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 20, width: '100%', maxWidth: 480, alignSelf: 'center' },
  contentWide: { maxWidth: 420, paddingTop: 40 },
  titles: { gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  footer: { paddingHorizontal: 20, paddingVertical: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
  inlineFooter: { paddingTop: 4 },
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.white },
  brandPanel: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 56, paddingVertical: 40, justifyContent: 'space-between', gap: 32 },
  brandArt: { flex: 1, maxHeight: 360 },
  brandCopy: { gap: 12, maxWidth: 480 },
  brandTitle: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1, color: colors.white },
  brandSubtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.mutedOnInk },
  formPanel: { flex: 1, paddingVertical: 24 },
});
