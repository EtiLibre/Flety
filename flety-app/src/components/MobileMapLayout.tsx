import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Vidrio } from '@/plataforma/estilo';
import { colors, radius } from '@/theme';

// Layout de celular con mapa arriba y panel de vidrio abajo (canvas "color con
// volumen": Pedir flete, Pedir grúa, Seguimiento).
export function MobileMapLayout({
  map,
  children,
  mapHeight = 280,
  onBack,
}: {
  map: React.ReactNode;
  children: React.ReactNode;
  mapHeight?: number;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.map, { height: mapHeight + 40 }]}>{map}</View>
      <IconButton
        label="Volver"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/cliente/inicio')))}
        style={[styles.back, { top: insets.top + 12 }]}>
        <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
      </IconButton>
      <Vidrio intensidad={50} style={[styles.sheet, { top: mapHeight }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          {children}
        </ScrollView>
      </Vidrio>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mapLand },
  map: { position: 'absolute', left: 0, right: 0, top: 0 },
  back: { position: 'absolute', left: 20, zIndex: 1000 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderTopLeftRadius: radius.sheet + 2,
    borderTopRightRadius: radius.sheet + 2,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.95)',
    zIndex: 1000,
    boxShadow: '0px -16px 40px -12px rgba(18,22,28,0.25)',
  },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.handle, alignSelf: 'center' },
});
