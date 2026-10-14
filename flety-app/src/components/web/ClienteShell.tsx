import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogOut, Truck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, shadow } from '@/theme';

// Layout desktop del cliente (canvas "Web · cliente"): barra superior,
// panel a la izquierda y mapa grande a la derecha.
export function ClienteShell({
  active,
  panel,
  map,
}: {
  active: 'pedir' | 'pedidos';
  panel: React.ReactNode;
  map: React.ReactNode;
}) {
  const { nombre } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Link href="/cliente/inicio" style={styles.brand} accessibilityLabel="Flety, inicio">
            <View style={styles.brandMark}>
              <Truck size={20} color={colors.ink} strokeWidth={2} />
            </View>
            <Text style={styles.brandWord}>flety</Text>
          </Link>
          <View style={styles.nav} accessibilityRole="menubar">
            <Link href="/cliente/inicio" style={[styles.navLink, active === 'pedir' && styles.navLinkActive]}>
              Pedir
            </Link>
            <Link href="/cliente/pedidos" style={[styles.navLink, active === 'pedidos' && styles.navLinkActive]}>
              Mis pedidos
            </Link>
          </View>
        </View>
        <View style={styles.profileArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perfil"
            onPress={() => setMenuOpen((open) => !open)}
            style={styles.profileButton}>
            <User size={20} color={colors.ink} strokeWidth={2} />
          </Pressable>
          {menuOpen ? (
            <View style={styles.menu}>
              {nombre ? <Text style={styles.menuName}>{nombre}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()} style={styles.menuItem}>
                <LogOut size={18} color={colors.danger} strokeWidth={2} />
                <Text style={styles.menuItemText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
          {panel}
        </ScrollView>
        <View style={styles.mapArea}>{map}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    zIndex: 2000,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandWord: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.ink },
  nav: { flexDirection: 'row', gap: 22 },
  navLink: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.muted,
    paddingVertical: 22,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navLinkActive: { fontFamily: fonts.bold, color: colors.ink, borderBottomColor: colors.ink },
  profileArea: { alignItems: 'flex-end' },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute',
    top: 52,
    right: 0,
    minWidth: 200,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 6,
    ...shadow.floating,
  },
  menuName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, paddingHorizontal: 16, paddingVertical: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 44 },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
  body: { flex: 1, flexDirection: 'row' },
  panel: { width: 440, maxWidth: '45%', flexGrow: 0, borderRightWidth: 1, borderRightColor: colors.lineSoft },
  panelContent: { padding: 28, gap: 22 },
  mapArea: { flex: 1, backgroundColor: colors.mapLand },
});
