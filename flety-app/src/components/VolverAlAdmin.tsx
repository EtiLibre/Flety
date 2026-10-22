import { router, usePathname } from 'expo-router';
import { ArrowLeft, Eye } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/theme';

// Para el superadmin que está recorriendo la app como otro usuario
// ("Ver la app como…"): una barra arriba de todo (no flotante, así no tapa los
// botones de la app) para volver al panel.
export function VolverAlAdmin() {
  const { role } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (role !== 'superadmin' || pathname.startsWith('/empresa') || pathname === '/restablecer') return null;

  return (
    <View style={[styles.barra, { paddingTop: insets.top }]}>
      <View style={styles.fila}>
        <Eye size={15} color={colors.accent} strokeWidth={2.2} />
        <Text style={styles.text} numberOfLines={1}>
          Vista de usuario
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al panel de administración"
          onPress={() => router.replace('/empresa/panel')}
          hitSlop={8}
          style={({ hovered }: { hovered?: boolean }) => [styles.volverBtn, hovered && { opacity: 0.85 }]}>
          <ArrowLeft size={14} color={colors.ink} strokeWidth={2.4} />
          <Text style={styles.volver}>Volver al admin</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { backgroundColor: '#12161C', borderBottomWidth: 1, borderBottomColor: '#2A313B', zIndex: 1000 },
  fila: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  text: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 13, color: '#C5CBD3' },
  volverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  volver: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
});
