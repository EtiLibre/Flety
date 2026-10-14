import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { colors, fonts } from '@/theme';

// Esqueleto de las pantallas de formulario (login, registro, etc.): volver + título + contenido.
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
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 20, width: '100%', maxWidth: 480, alignSelf: 'center' },
  titles: { gap: 8 },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
  },
  footer: { paddingHorizontal: 20, paddingVertical: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
