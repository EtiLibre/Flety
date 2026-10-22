import { router, usePathname } from 'expo-router';
import { ArrowLeft, Eye } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme';

// Para el superadmin que está recorriendo la app como otro usuario
// ("Ver la app como…"): una cápsula flotante para volver al panel.
export function VolverAlAdmin() {
  const { role } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (role !== 'superadmin' || pathname.startsWith('/empresa') || pathname === '/restablecer') return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver al panel de administración"
        onPress={() => router.replace('/empresa/panel')}
        style={({ hovered }: { hovered?: boolean }) => [styles.pill, hovered && { transform: [{ scale: 1.03 }] }]}>
        <Eye size={15} color={colors.accent} strokeWidth={2.2} />
        <Text style={styles.text}>Vista de usuario</Text>
        <View style={styles.sep} />
        <ArrowLeft size={15} color={colors.white} strokeWidth={2.2} />
        <Text style={[styles.text, styles.volver]}>Volver al admin</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(18,22,28,0.92)',
    borderWidth: 1,
    borderColor: '#2A313B',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
  },
  text: { fontFamily: fonts.semibold, fontSize: 13, color: '#C5CBD3' },
  volver: { fontFamily: fonts.bold, color: colors.white },
  sep: { width: 1, height: 14, backgroundColor: '#3A424D', marginHorizontal: 2 },
});
