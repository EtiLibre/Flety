import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { UnirseEmpresa } from '@/components/chofer/UnirseEmpresa';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme';

// Una cuenta (registrada como cliente) se suma como chofer con el código de su empresa.
export default function Unirse() {
  const { session, initializing } = useAuth();
  if (!initializing && !session) return <Redirect href="/login" />;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.back}>
          <ArrowLeft size={18} color={colors.dark.text} strokeWidth={2.2} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <BrandMark tone="dark" />
        <UnirseEmpresa />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.bg },
  content: { padding: 20, gap: 24, width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.dark.text },
});
