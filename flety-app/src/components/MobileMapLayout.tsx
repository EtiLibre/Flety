import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { colors, radius, shadow } from '@/theme';

// Layout de celular con mapa arriba y panel blanco deslizable abajo
// (canvas: "Elegí tu vehículo", "Seguimiento en vivo").
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
      <View style={[styles.sheet, { top: mapHeight }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          {children}
        </ScrollView>
      </View>
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
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    zIndex: 1000,
    ...shadow.sheet,
  },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.handle, alignSelf: 'center' },
});
